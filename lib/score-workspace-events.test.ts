import { describe, expect, it } from "vitest";

import { openScoreThreads, startNewScore } from "./score-workspace-events";

describe("score workspace events", () => {
  it("dispatches header actions without coupling the shell to Score state", () => {
    const target = new EventTarget();
    const events: string[] = [];
    target.addEventListener("score-open-threads", (event) => events.push(event.type));
    target.addEventListener("score-new", (event) => events.push(event.type));
    openScoreThreads(target);
    startNewScore(target);
    expect(events).toEqual([
      "score-open-threads",
      "score-new",
    ]);
  });
});
