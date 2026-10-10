import { parsePartialJson as aiParsePartialJson } from "ai";

import type { SandboxToolContent, SandboxToolData } from "@/components/score/sandbox-tool/schema";

export const SANDBOX_TOOL_NAME = "build_interactive_tool";

const FIELD_ORDER = [
  "title",
  "initialHeight",
  "placeholderMessages",
  "data_refs",
  "css",
  "html",
  "jsFunctions",
  "jsExpressions",
] as const;

const DATA_REF_PATTERN = /^(account:[a-z0-9.-]+|accounts:recent|pipeline)$/;

type OrderedField = (typeof FIELD_ORDER)[number];
type ParsePartialJson = (text: string) => Promise<unknown>;
type ResolveDataRefs = (refs: string[]) => Promise<SandboxToolData>;

export type ServerChatSandboxEvent =
  | { type: "widget"; id: string; content: SandboxToolContent }
  | { type: "widget_data"; id: string; data: SandboxToolData };

export type ServerChatStreamEvent =
  | ServerChatSandboxEvent
  | { type: "tool_call"; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; name: string; result: unknown };

export interface SandboxWidgetSnapshot {
  id: string;
  content: SandboxToolContent;
  data?: SandboxToolData;
}

export type SandboxToolStreamPart =
  | { type: "tool-input-start"; id: string; toolName: string }
  | { type: "tool-input-delta"; id: string; delta: string }
  | { type: "tool-input-end"; id: string }
  | { type: "tool-call"; toolCallId: string; toolName: string; input?: unknown }
  | { type: "tool-result"; toolCallId: string; toolName: string; output?: unknown };

interface ToolInputState {
  toolName: string;
  inputText: string;
  lastFlushAt: number;
  lastContentJson?: string;
  dataSent: boolean;
  data?: SandboxToolData;
  content?: SandboxToolContent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasLaterField(parsed: Record<string, unknown>, field: OrderedField): boolean {
  const index = FIELD_ORDER.indexOf(field);
  return FIELD_ORDER.slice(index + 1).some((key) => hasOwn(parsed, key));
}

function fieldComplete(parsed: Record<string, unknown>, field: OrderedField, inputEnded: boolean): boolean {
  return inputEnded || hasLaterField(parsed, field);
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length === value.length ? items : undefined;
}

function partialValue(result: unknown): unknown {
  return isRecord(result) && "value" in result ? result.value : result;
}

function dataRefsFromPartial(parsed: Record<string, unknown>, inputEnded: boolean): string[] | null {
  const refs = stringArray(parsed.data_refs);
  if (!refs || !fieldComplete(parsed, "data_refs", inputEnded)) return null;
  return refs
    .map((ref) => ref.trim().toLowerCase())
    .filter((ref) => DATA_REF_PATTERN.test(ref));
}

export function widgetContentFromPartial(parsed: unknown, inputEnded: boolean): SandboxToolContent {
  const record = isRecord(parsed) ? parsed : {};
  const content: SandboxToolContent = {
    cssComplete: fieldComplete(record, "css", inputEnded),
    htmlComplete: fieldComplete(record, "html", inputEnded),
    jsFunctionsComplete: fieldComplete(record, "jsFunctions", inputEnded),
    jsExpressionsComplete: inputEnded,
    generating: !inputEnded,
  };

  if (typeof record.title === "string") content.title = record.title;
  if (typeof record.initialHeight === "number" && Number.isFinite(record.initialHeight)) {
    content.initialHeight = record.initialHeight;
  }
  const placeholderMessages = stringArray(record.placeholderMessages);
  if (placeholderMessages) content.placeholderMessages = placeholderMessages;
  if (typeof record.css === "string") content.css = record.css;
  if (typeof record.html === "string") content.html = record.html;
  if (typeof record.jsFunctions === "string") content.jsFunctions = record.jsFunctions;
  const jsExpressions = stringArray(record.jsExpressions);
  if (jsExpressions) {
    content.jsExpressions = inputEnded ? jsExpressions : jsExpressions.slice(0, -1);
  }

  return content;
}

export function sandboxToolCallEvent(name: string, input: unknown): ServerChatStreamEvent {
  if (name !== SANDBOX_TOOL_NAME) {
    return {
      type: "tool_call",
      name,
      args: isRecord(input) ? input : {},
    };
  }
  return {
    type: "tool_call",
    name,
    args: isRecord(input) && typeof input.title === "string" ? { title: input.title } : {},
  };
}

export function sandboxToolResultOutput(name: string, output: unknown): unknown {
  if (name !== SANDBOX_TOOL_NAME || !isRecord(output) || !("data" in output)) return output;
  const stripped = { ...output };
  delete stripped.data;
  return stripped;
}

export class SandboxToolStreamController {
  private readonly states = new Map<string, ToolInputState>();
  private readonly throttleMs: number;
  private readonly now: () => number;
  private readonly parsePartialJson: ParsePartialJson;

  constructor(options: {
    throttleMs?: number;
    now?: () => number;
    parsePartialJson?: ParsePartialJson;
  } = {}) {
    this.throttleMs = options.throttleMs ?? 150;
    this.now = options.now ?? Date.now;
    this.parsePartialJson = options.parsePartialJson ?? aiParsePartialJson;
  }

  async handlePart(
    part: SandboxToolStreamPart,
    options: { resolveDataRefs?: ResolveDataRefs } = {},
  ): Promise<ServerChatSandboxEvent[]> {
    if (part.type === "tool-input-start") {
      if (part.toolName === SANDBOX_TOOL_NAME) this.start(part.id, part.toolName);
      return [];
    }

    if (part.type === "tool-input-delta") {
      const state = this.states.get(part.id);
      if (!state || state.toolName !== SANDBOX_TOOL_NAME) return [];
      state.inputText += part.delta;
      return this.flush(part.id, { inputEnded: false }, options);
    }

    if (part.type === "tool-input-end") {
      return this.flush(part.id, { inputEnded: true, force: true }, options);
    }

    if (part.type === "tool-call") {
      if (part.toolName !== SANDBOX_TOOL_NAME) return [];
      return this.finalizeFromInput(part.toolCallId, part.input, options);
    }

    if (part.type === "tool-result") {
      if (part.toolName !== SANDBOX_TOOL_NAME) return [];
      return this.finalizeFromResult(part.toolCallId, part.output, options);
    }

    return [];
  }

  async flush(
    id: string,
    options: { inputEnded: boolean; force?: boolean },
    callbacks: { resolveDataRefs?: ResolveDataRefs } = {},
  ): Promise<ServerChatSandboxEvent[]> {
    const state = this.states.get(id);
    if (!state?.inputText) return [];
    const now = this.now();
    if (!options.force && now - state.lastFlushAt < this.throttleMs) return [];
    state.lastFlushAt = now;

    let parsed: unknown;
    try {
      parsed = partialValue(await this.parsePartialJson(state.inputText));
    } catch {
      return [];
    }
    if (!isRecord(parsed)) return [];

    return this.eventsFromParsed(id, state, parsed, options.inputEnded, callbacks);
  }

  snapshot(id: string): SandboxWidgetSnapshot | null {
    const state = this.states.get(id);
    if (!state?.content || state.content.generating) return null;
    return {
      id,
      content: state.content,
      ...(state.data ? { data: state.data } : {}),
    };
  }

  snapshots(): SandboxWidgetSnapshot[] {
    return [...this.states.entries()]
      .map(([id]) => this.snapshot(id))
      .filter((snapshot): snapshot is SandboxWidgetSnapshot => Boolean(snapshot));
  }

  private start(id: string, toolName: string) {
    if (!this.states.has(id)) {
      this.states.set(id, {
        toolName,
        inputText: "",
        lastFlushAt: 0,
        dataSent: false,
      });
    }
  }

  private async finalizeFromInput(
    id: string,
    input: unknown,
    callbacks: { resolveDataRefs?: ResolveDataRefs },
  ): Promise<ServerChatSandboxEvent[]> {
    const state = this.ensureState(id);
    const parsed = isRecord(input) ? input : {};
    return this.eventsFromParsed(id, state, parsed, true, callbacks);
  }

  private async finalizeFromResult(
    id: string,
    output: unknown,
    callbacks: { resolveDataRefs?: ResolveDataRefs },
  ): Promise<ServerChatSandboxEvent[]> {
    const state = this.ensureState(id);
    const events: ServerChatSandboxEvent[] = [];
    if (!state.dataSent && isRecord(output) && isRecord(output.data) && Object.keys(output.data).length > 0) {
      state.data = output.data;
      state.dataSent = true;
      events.push({ type: "widget_data", id, data: output.data });
    }
    if (!state.content && state.inputText) {
      events.push(...await this.flush(id, { inputEnded: true, force: true }, callbacks));
    }
    return events;
  }

  private ensureState(id: string): ToolInputState {
    const existing = this.states.get(id);
    if (existing) return existing;
    const state: ToolInputState = {
      toolName: SANDBOX_TOOL_NAME,
      inputText: "",
      lastFlushAt: 0,
      dataSent: false,
    };
    this.states.set(id, state);
    return state;
  }

  private async eventsFromParsed(
    id: string,
    state: ToolInputState,
    parsed: Record<string, unknown>,
    inputEnded: boolean,
    callbacks: { resolveDataRefs?: ResolveDataRefs },
  ): Promise<ServerChatSandboxEvent[]> {
    const events: ServerChatSandboxEvent[] = [];
    const refs = dataRefsFromPartial(parsed, inputEnded);
    if (!state.dataSent && refs && refs.length > 0 && callbacks.resolveDataRefs) {
      state.data = await callbacks.resolveDataRefs(refs);
      state.dataSent = true;
      events.push({ type: "widget_data", id, data: state.data });
    }

    const content = widgetContentFromPartial(parsed, inputEnded);
    const contentJson = JSON.stringify(content);
    if (contentJson !== state.lastContentJson) {
      state.content = content;
      state.lastContentJson = contentJson;
      events.push({ type: "widget", id, content });
    }
    return events;
  }
}
