export const SCORE_CHAT_HREF = "/score#chat";
export const SCORE_CHAT_HASH = "#chat";
export const SCORE_CHAT_EVENT = "vesperwise-open-chat";
export const SCORE_CHAT_STORE_KEY = "vesperwise-open-chat";

let armed = false;

function storeScoreChat() {
  try {
    window.sessionStorage.setItem(SCORE_CHAT_STORE_KEY, "1");
  } catch {
    // Private mode still uses the in-memory arm.
  }
}

function storedScoreChat() {
  try {
    return window.sessionStorage.getItem(SCORE_CHAT_STORE_KEY) === "1";
  } catch {
    return false;
  }
}

export function forgetScoreChat() {
  try {
    window.sessionStorage.removeItem(SCORE_CHAT_STORE_KEY);
  } catch {
    // ignore
  }
}

export function armScoreChat() {
  armed = true;
  if (typeof window !== "undefined") {
    storeScoreChat();
    window.dispatchEvent(new Event(SCORE_CHAT_EVENT));
  }
}

export function clearScoreChatArm() {
  armed = false;
}

export function scoreChatShouldOpen(hash: string) {
  if (armed || hash === SCORE_CHAT_HASH) return true;
  if (typeof window === "undefined" || !storedScoreChat()) return false;
  const path = window.location.pathname;
  return path === "/score" || path === "/login";
}

/** Next and Clerk drop #chat; remember it from the real URL before that happens. */
export function captureScoreChatFromLocation() {
  if (typeof window === "undefined") return false;
  if (window.location.hash === SCORE_CHAT_HASH) {
    storeScoreChat();
    return true;
  }
  const raw = new URLSearchParams(window.location.search).get("redirect_url") ?? "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  if (decoded.includes("#chat") || raw.includes("%23chat")) {
    storeScoreChat();
    return true;
  }
  return storedScoreChat();
}

/** Safe post-login path. Only /score is honored so redirect_url cannot leave the app. */
export function postAuthScorePath() {
  if (typeof window === "undefined") return null;
  captureScoreChatFromLocation();
  const raw = new URLSearchParams(window.location.search).get("redirect_url") ?? "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const path = decoded.split("#")[0].split("?")[0];
  if (path !== "/score") return null;
  return scoreChatShouldOpen(window.location.hash) || decoded.includes("#chat") || raw.includes("%23chat")
    ? SCORE_CHAT_HREF
    : "/score";
}

if (typeof window !== "undefined") captureScoreChatFromLocation();

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
  const field = root.querySelector<HTMLElement>("#chat textarea, #chat input");
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
  forgetScoreChat();
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.pushState(null, "", next);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  return true;
}

/** Focus the composer after mount, hydration, or a late #chat. Retries for about a second. */
export function runScoreChatFocus(root: ParentNode, onFocused?: () => void): () => void {
  let cancelled = false;
  let frame = 0;
  let timer = 0;
  const started = Date.now();

  const finish = (ok: boolean) => {
    if (!ok) return false;
    clearScoreChatArm();
    forgetScoreChat();
    onFocused?.();
    return true;
  };

  const tick = () => {
    if (cancelled) return;
    captureScoreChatFromLocation();
    if (!scoreChatShouldOpen(typeof window === "undefined" ? "" : window.location.hash)) return;
    ensureScoreChatHash();
    if (finish(focusScoreChat(root))) return;
    if (Date.now() - started >= 1000) return;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = window.requestAnimationFrame(tick);
    timer = window.setTimeout(tick, 50);
  };

  tick();
  const observer = typeof MutationObserver === "function"
    ? new MutationObserver(() => { if (!cancelled) tick(); })
    : null;
  const observeTarget = root instanceof Document ? root.documentElement : root instanceof Element ? root : null;
  if (observer && observeTarget) observer.observe(observeTarget, { childList: true, subtree: true });

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    observer?.disconnect();
  };
}
