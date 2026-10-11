import type { ThreadMessage, ThreadWidget } from "@/components/score/score-thread-types";
import { sanitizeUiBlocks } from "@/lib/gen-ui";
import { CHAT_CREDIT_COST } from "@/lib/types";
import type { ChatSseEvent } from "./chat-client";
import type { ToolChip } from "./score-presentation";

function toolsOf(message: ThreadMessage): ToolChip[] {
  return message.role === "assistant" && "tools" in message ? message.tools : [];
}

function widgetsOf(message: ThreadMessage): ThreadWidget[] {
  return message.role === "assistant" && "widgets" in message ? message.widgets ?? [] : [];
}

function contentOf(message: ThreadMessage): string {
  return message.role === "assistant" && "content" in message ? message.content : "";
}

function upsertWidget(widgets: ThreadWidget[], event: Extract<ChatSseEvent, { type: "widget" }>): ThreadWidget[] {
  const index = widgets.findIndex((widget) => widget.id === event.id);
  const previous = index >= 0 ? widgets[index] : undefined;
  const next: ThreadWidget = {
    id: event.id,
    content: event.content,
    ...(previous?.data ? { data: previous.data } : {}),
    dataReady: Boolean(previous?.dataReady || previous?.data || event.content.generating === false),
  };
  if (index < 0) return [...widgets, next];
  return widgets.map((widget, itemIndex) => itemIndex === index ? next : widget);
}

function attachWidgetData(widgets: ThreadWidget[], event: Extract<ChatSseEvent, { type: "widget_data" }>): ThreadWidget[] {
  const index = widgets.findIndex((widget) => widget.id === event.id);
  const next: ThreadWidget = {
    id: event.id,
    content: index >= 0 ? widgets[index]!.content : {},
    data: event.data,
    dataReady: true,
  };
  if (index < 0) return [...widgets, next];
  return widgets.map((widget, itemIndex) => itemIndex === index ? { ...widget, data: event.data, dataReady: true } : widget);
}

function withWidgets(message: ThreadMessage, widgets: ThreadWidget[]): ThreadMessage {
  if (message.role !== "assistant") return message;
  if (message.kind === "text" || message.kind === "ui") return { ...message, widgets };
  if (message.kind === "thinking") {
    return {
      id: message.id,
      role: "assistant",
      kind: "text",
      content: "",
      tools: message.tools,
      widgets,
    };
  }
  return message;
}

function applyEventToMessage(message: ThreadMessage, event: ChatSseEvent): ThreadMessage {
  if (event.type === "text") {
    if (message.role === "assistant" && message.kind === "ui") {
      return { ...message, content: message.content + event.content };
    }
    return {
      id: message.id,
      role: "assistant",
      kind: "text",
      content: message.role === "assistant" && message.kind === "text" ? message.content + event.content : event.content,
      tools: toolsOf(message),
      widgets: widgetsOf(message),
    };
  }

  if (event.type === "tool_call") {
    const tools = [...toolsOf(message), { name: event.name, status: "running" as const }];
    if (message.role === "assistant" && (message.kind === "text" || message.kind === "ui" || message.kind === "thinking")) {
      return { ...message, tools };
    }
    return { id: message.id, role: "assistant", kind: "thinking", mode: "chat", tools, widgets: widgetsOf(message) };
  }

  if (event.type === "tool_result") {
    const tools = toolsOf(message).map((tool) => (
      tool.name === event.name && tool.status === "running"
        ? { ...tool, status: "done" as const, result: event.result }
        : tool
    ));
    if (message.role === "assistant" && (message.kind === "text" || message.kind === "ui" || message.kind === "thinking")) {
      return { ...message, tools };
    }
    return message;
  }

  if (event.type === "ui") {
    const blocks = sanitizeUiBlocks(event.blocks);
    if (blocks.length === 0) return message;
    return {
      id: message.id,
      role: "assistant",
      kind: "ui",
      blocks,
      content: contentOf(message),
      tools: toolsOf(message),
      widgets: widgetsOf(message),
      billing: event.billing ?? `${CHAT_CREDIT_COST} credits`,
    };
  }

  if (event.type === "widget") {
    return withWidgets(message, upsertWidget(widgetsOf(message), event));
  }

  if (event.type === "widget_data") {
    return withWidgets(message, attachWidgetData(widgetsOf(message), event));
  }

  return message;
}

export function applyChatEvent(
  messages: ThreadMessage[],
  thinkingId: string,
  event: ChatSseEvent,
): ThreadMessage[] {
  return messages.map((message) => message.id === thinkingId ? applyEventToMessage(message, event) : message);
}
