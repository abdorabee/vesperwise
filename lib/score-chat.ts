export const SCORE_CHAT_HREF = "/score#chat";
export const SCORE_CHAT_HASH = "#chat";
export const SCORE_CHAT_EVENT = "vesperwise-open-chat";

let armed = false;

export function armScoreChat() {
  armed = true;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SCORE_CHAT_EVENT));
}

export function clearScoreChatArm() {
  armed = false;
}

export function scoreChatShouldOpen(hash: string) {
  return armed || hash === SCORE_CHAT_HASH;
}

/** Puts #chat back when client navigation drops it, so Chat and Score don't look the same. */
export function ensureScoreChatHash() {
  if (typeof window === "undefined") return false;
  if (window.location.pathname !== "/score" || window.location.hash === SCORE_CHAT_HASH) return false;
  if (!scoreChatShouldOpen(window.location.hash)) return false;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${SCORE_CHAT_HASH}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return true;
}

export function focusScoreChat(root: ParentNode): boolean {
  const field = root.querySelector<HTMLElement>("#chat textarea");
  if (!field) return false;
  if (typeof field.scrollIntoView === "function") {
    field.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  if (typeof field.focus === "function") field.focus({ preventScroll: true });
  return true;
}

/** Same-page Chat clicks must focus the composer. Cross-page clicks still navigate. */
export function followScoreChatLink(event: { preventDefault(): void }) {
  armScoreChat();
  if (typeof window === "undefined" || window.location.pathname !== "/score") return false;
  event.preventDefault();
  if (window.location.hash !== SCORE_CHAT_HASH) window.location.hash = "chat";
  return true;
}

/** Leaving Chat for Score drops the hash so the two nav items don't stay identical. */
export function followScoreLink(event: { preventDefault(): void }) {
  if (typeof window === "undefined" || window.location.pathname !== "/score") return false;
  if (window.location.hash !== SCORE_CHAT_HASH) return false;
  event.preventDefault();
  clearScoreChatArm();
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return true;
}
