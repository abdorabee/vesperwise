// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SCORE_CHAT_EVENT,
  armScoreChat,
  clearScoreChatArm,
  ensureScoreChatHash,
  focusScoreChat,
  followScoreChatLink,
  followScoreLink,
  scoreChatShouldOpen,
} from "./score-chat";

afterEach(() => {
  clearScoreChatArm();
  window.location.hash = "";
});

describe("score chat hash", () => {
  it("focuses the composer when the hash is #chat", () => {
    document.body.innerHTML = `<div id="chat"><textarea></textarea></div>`;
    const field = document.querySelector("textarea") as HTMLTextAreaElement;
    const focus = vi.spyOn(field, "focus");
    const scroll = vi.fn();
    field.scrollIntoView = scroll;

    expect(focusScoreChat(document)).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ block: "center", inline: "nearest", behavior: "auto" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("keeps the request armed until a composer exists", () => {
    document.body.innerHTML = "";
    expect(focusScoreChat(document)).toBe(false);
    armScoreChat();
    expect(scoreChatShouldOpen("")).toBe(true);
    document.body.innerHTML = `<div id="chat"><textarea></textarea></div>`;
    expect(focusScoreChat(document)).toBe(true);
  });

  it("opens chat on the current score page without a second navigation", () => {
    window.history.pushState(null, "", "/score");
    const event = { preventDefault: vi.fn() };
    const heard = vi.fn();
    window.addEventListener(SCORE_CHAT_EVENT, heard);
    followScoreChatLink(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe("#chat");
    expect(heard).toHaveBeenCalledOnce();
    expect(scoreChatShouldOpen(window.location.hash)).toBe(true);
    window.removeEventListener(SCORE_CHAT_EVENT, heard);
  });

  it("lets Chat navigate when the current page is not Score", () => {
    window.history.pushState(null, "", "/dashboard");
    const event = { preventDefault: vi.fn() };
    followScoreChatLink(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(scoreChatShouldOpen("")).toBe(true);
  });

  it("restores #chat once when navigation drops the hash", () => {
    window.history.pushState(null, "", "/score");
    armScoreChat();
    let calls = 0;
    const onHash = () => {
      calls += 1;
      ensureScoreChatHash();
    };
    window.addEventListener("hashchange", onHash);
    expect(ensureScoreChatHash()).toBe(true);
    expect(window.location.hash).toBe("#chat");
    expect(calls).toBe(1);
    expect(ensureScoreChatHash()).toBe(false);
    window.removeEventListener("hashchange", onHash);
  });

  it("clears #chat when Score is chosen from the score page", () => {
    window.history.pushState(null, "", "/score#chat");
    armScoreChat();
    const event = { preventDefault: vi.fn() };
    followScoreLink(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe("");
    expect(scoreChatShouldOpen(window.location.hash)).toBe(false);
  });
});
