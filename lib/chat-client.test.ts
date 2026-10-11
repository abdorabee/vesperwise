import { describe, expect, it } from "vitest";

import { extractDomain, parseChatSseEvent } from "./chat-client";

describe("extractDomain", () => {
  it("accepts a bare hostname", () => {
    expect(extractDomain("stripe.com")).toBe("stripe.com");
  });

  it("strips protocol and www", () => {
    expect(extractDomain("https://www.Linear.app/careers")).toBe("linear.app");
  });

  it("rejects questions and empty input", () => {
    expect(extractDomain("why is this cold?")).toBeNull();
    expect(extractDomain("")).toBeNull();
    expect(extractDomain("localhost")).toBeNull();
  });
});

describe("parseChatSseEvent", () => {
  it("parses streamed sandbox widget events", () => {
    expect(parseChatSseEvent(JSON.stringify({
      type: "widget",
      id: "tool-1",
      content: {
        title: "ROI calculator",
        html: "<section>ROI</section>",
        generating: true,
      },
    }))).toEqual({
      type: "widget",
      id: "tool-1",
      content: {
        title: "ROI calculator",
        html: "<section>ROI</section>",
        generating: true,
      },
    });
  });

  it("parses streamed sandbox widget data events", () => {
    expect(parseChatSseEvent(JSON.stringify({
      type: "widget_data",
      id: "tool-1",
      data: {
        "account:notion.so": {
          company: "Notion",
          score: 84,
        },
      },
    }))).toEqual({
      type: "widget_data",
      id: "tool-1",
      data: {
        "account:notion.so": {
          company: "Notion",
          score: 84,
        },
      },
    });
  });
});
