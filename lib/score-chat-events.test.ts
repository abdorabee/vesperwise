import { describe, expect, it } from "vitest";

import { applyChatEvent } from "./score-chat-events";
import type { ChatSseEvent } from "./chat-client";
import type { ThreadMessage } from "@/components/score/score-thread-types";

const thinking: ThreadMessage = {
  id: "assistant-1",
  role: "assistant",
  kind: "thinking",
  mode: "chat",
  tools: [],
};

function apply(message: ThreadMessage, event: ChatSseEvent): ThreadMessage {
  return applyChatEvent([message], "assistant-1", event)[0]!;
}

describe("applyChatEvent", () => {
  it("upserts widgets by id and converts a chat thinking message so widget-only turns render", () => {
    const message = apply(thinking, {
      type: "widget",
      id: "widget-1",
      content: {
        title: "ROI calculator",
        html: "<section>ROI</section>",
        generating: true,
      },
    });

    expect(message).toMatchObject({
      id: "assistant-1",
      role: "assistant",
      kind: "text",
      content: "",
      widgets: [{
        id: "widget-1",
        content: {
          title: "ROI calculator",
          html: "<section>ROI</section>",
          generating: true,
        },
        dataReady: false,
      }],
    });

    const updated = apply(message, {
      type: "widget",
      id: "widget-1",
      content: {
        title: "ROI calculator",
        html: "<section>Updated</section>",
        generating: true,
      },
    });

    expect(updated.role === "assistant" && "widgets" in updated ? updated.widgets : []).toHaveLength(1);
    expect(updated).toMatchObject({
      widgets: [{
        id: "widget-1",
        content: {
          html: "<section>Updated</section>",
        },
      }],
    });
  });

  it("attaches widget_data and marks the matching widget ready", () => {
    const withWidget = apply(thinking, {
      type: "widget",
      id: "widget-1",
      content: {
        html: "<section>ROI</section>",
        generating: true,
      },
    });

    const withData = apply(withWidget, {
      type: "widget_data",
      id: "widget-1",
      data: {
        "account:notion.so": {
          company: "Notion",
          score: 84,
        },
      },
    });

    expect(withData).toMatchObject({
      widgets: [{
        id: "widget-1",
        dataReady: true,
        data: {
          "account:notion.so": {
            company: "Notion",
            score: 84,
          },
        },
      }],
    });
  });

  it("marks a final widget ready when no widget_data arrived in the stream", () => {
    const message = apply(thinking, {
      type: "widget",
      id: "widget-1",
      content: {
        html: "<section>No refs</section>",
        generating: false,
      },
    });

    expect(message).toMatchObject({
      kind: "text",
      widgets: [{
        id: "widget-1",
        dataReady: true,
      }],
    });
  });
});
