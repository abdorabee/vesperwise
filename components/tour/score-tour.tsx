"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export const SCORE_TOUR_SEEN_KEY = "vesperwise-tour-seen";
export const SCORE_TOUR_REPLAY_EVENT = "vesperwise-tour-replay";
const SCORE_TOUR_STORE_EVENT = "vesperwise-tour-store";

const CARD_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CARD_MOTION = `top 280ms ${CARD_EASE}, left 280ms ${CARD_EASE}`;
const HOLE_PAD = 8;
const CARD_GAP = 14;

const STEPS = [
  {
    id: "composer",
    target: "composer",
    title: "Composer",
    body: "Paste a company domain or a person email.",
  },
  {
    id: "credits",
    target: "credits",
    title: "Credit chip",
    body: "A fresh score costs 1 credit. A cached one does not.",
  },
  {
    id: "result",
    target: "result",
    title: "Result",
    body: "The number, HOT / WARM / COLD, why-now, and the evidence rows appear here after the first score.",
  },
  {
    id: "chat",
    target: "chat",
    title: "Sidebar Chat",
    body: "Ask why an account is hot. The score opens beside the thread.",
  },
  {
    id: "done",
    target: null,
    title: "Done",
    body: "Skip is remembered. Show me around, in the account menu, runs this again.",
  },
] as const;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Placement {
  top: number;
  left: number;
  width: number;
  transition: string;
}

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(SCORE_TOUR_SEEN_KEY);
  } catch {
    return "1";
  }
}

function emitStore() {
  window.dispatchEvent(new Event(SCORE_TOUR_STORE_EVENT));
}

function writeSeen() {
  try {
    window.localStorage.setItem(SCORE_TOUR_SEEN_KEY, "1");
  } catch {
    // Private mode still closes the tour for this view.
  }
  emitStore();
}

function subscribeSeen(onStoreChange: () => void) {
  window.addEventListener(SCORE_TOUR_STORE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(SCORE_TOUR_STORE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function replayScoreTour() {
  try {
    window.localStorage.removeItem(SCORE_TOUR_SEEN_KEY);
  } catch {
    // The replay event still opens the tour on this page.
  }
  emitStore();
  window.dispatchEvent(new Event(SCORE_TOUR_REPLAY_EVENT));
}

function readReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReduced(onStoreChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function isOnScreen(node: HTMLElement) {
  const style = window.getComputedStyle(node);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  const rect = node.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function pickTarget(name: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  if (nodes.length === 0) return null;
  const visible = nodes.filter(isOnScreen);
  if (name === "chat") {
    const labeled = visible.find((node) => /chat/i.test(`${node.getAttribute("aria-label") ?? ""} ${node.textContent ?? ""}`));
    if (labeled) return labeled;
  }
  return visible[0] ?? nodes[0] ?? null;
}

function toBox(rect: DOMRect): Box {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function placeCard(anchor: Box | null, card: { width: number; height: number }, reduced: boolean, reveal: boolean): Placement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(288, Math.max(220, viewportWidth - 24));
  const height = card.height || 180;
  const transition = reveal || reduced ? "none" : CARD_MOTION;
  if (!anchor) {
    return {
      top: Math.max(12, (viewportHeight - height) / 2),
      left: Math.max(12, (viewportWidth - width) / 2),
      width,
      transition,
    };
  }
  const below = anchor.top + anchor.height + CARD_GAP;
  const above = anchor.top - CARD_GAP - height;
  let top = below;
  if (below + height > viewportHeight - 12 && above >= 12) top = above;
  else if (below + height > viewportHeight - 12) top = Math.max(12, viewportHeight - height - 12);
  let left = anchor.left;
  if (left + width > viewportWidth - 12) left = viewportWidth - 12 - width;
  if (left < 12) left = 12;
  return { top, left, width, transition };
}

function Spotlight({ box }: { box: Box }) {
  const hole: Box = {
    top: box.top - HOLE_PAD,
    left: box.left - HOLE_PAD,
    width: box.width + HOLE_PAD * 2,
    height: box.height + HOLE_PAD * 2,
  };
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bottom = hole.top + hole.height;
  const right = hole.left + hole.width;
  // Four panes leave the highlighted control uncovered so it still receives clicks.
  const panes = [
    { top: 0, left: 0, width: viewportWidth, height: Math.max(0, hole.top) },
    { top: bottom, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - bottom) },
    { top: Math.max(0, hole.top), left: 0, width: Math.max(0, hole.left), height: hole.height },
    { top: Math.max(0, hole.top), left: right, width: Math.max(0, viewportWidth - right), height: hole.height },
  ];
  return (
    <>
      {panes.map((pane) => (
        pane.width > 0 && pane.height > 0 ? (
          <div key={`${pane.top}-${pane.left}-${pane.width}-${pane.height}`} className="pointer-events-auto fixed z-[80] bg-[#0a0b0c]/60" style={pane} />
        ) : null
      ))}
      <div
        data-slot="score-tour-ring"
        className="pointer-events-none fixed z-[80] rounded-lg"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, boxShadow: "0 0 0 2px #DFFF00" }}
      />
    </>
  );
}

export function ScoreTour({ onboardingComplete }: { onboardingComplete: boolean }) {
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => "pending");
  const reduced = useSyncExternalStore(subscribeReduced, readReducedMotion, () => false);
  const open = onboardingComplete && seen === null;
  const [step, setStep] = useState(0);
  const [anchor, setAnchor] = useState<Box | null>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef(true);
  const current = STEPS[step];

  function dismiss() {
    revealRef.current = true;
    writeSeen();
  }

  useEffect(() => {
    const replay = () => {
      revealRef.current = true;
      setStep(0);
    };
    window.addEventListener(SCORE_TOUR_REPLAY_EVENT, replay);
    return () => window.removeEventListener(SCORE_TOUR_REPLAY_EVENT, replay);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      revealRef.current = true;
      writeSeen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open || !current.target) return;
    const target = pickTarget(current.target);
    if (typeof target?.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced ? "auto" : "smooth" });
    }
  }, [open, current.target, reduced]);

  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const measure = () => {
      const target = current.target ? pickTarget(current.target) : null;
      const rect = target?.getBoundingClientRect();
      const nextAnchor = target && rect && rect.width >= 2 && rect.height >= 2 && isOnScreen(target) ? toBox(rect) : null;
      const card = cardRef.current;
      const nextPlacement = placeCard(
        nextAnchor,
        { width: card?.offsetWidth || 288, height: card?.offsetHeight || 180 },
        reduced || readReducedMotion(),
        revealRef.current,
      );
      revealRef.current = false;
      setAnchor(nextAnchor);
      setPlacement(nextPlacement);
    };
    measure();
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, current.target, reduced, step]);

  if (!open || typeof document === "undefined") return null;

  const last = step === STEPS.length - 1;
  const shown = placement ?? placeCard(null, { width: 288, height: 180 }, true, true);

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {anchor ? <Spotlight box={anchor} /> : <div className="pointer-events-auto fixed inset-0 z-[80] bg-[#0a0b0c]/60" />}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="score-tour-title"
        aria-describedby="score-tour-body"
        data-slot="score-tour"
        data-reduced-motion={reduced ? "true" : "false"}
        data-step={current.id}
        className="pointer-events-auto fixed z-[81] rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md motion-reduce:!transition-none"
        style={{ top: shown.top, left: shown.left, width: shown.width, transition: shown.transition }}
      >
        <div className="flex items-start justify-between gap-3">
          <div aria-live="polite">
            <p className="text-xs text-muted-foreground">{step + 1} of {STEPS.length}</p>
            <h2 id="score-tour-title" className="mt-1 text-sm font-semibold tracking-[-0.02em] text-foreground">{current.title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close tour"
            onClick={dismiss}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p id="score-tour-body" className="mt-2 text-sm leading-5 text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((index) => Math.max(0, index - 1))}
              disabled={step === 0}
              className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (last) dismiss();
                else setStep((index) => index + 1);
              }}
              className="inline-flex h-8 items-center rounded-md bg-[#DFFF00] px-3 text-sm font-medium text-[#0a0b0c] hover:bg-[#E8FF40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DFFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
