export const SCORE_OPEN_THREADS_EVENT = "score-open-threads";
export const SCORE_NEW_EVENT = "score-new";
export function openScoreThreads(target: EventTarget = window) { target.dispatchEvent(new Event(SCORE_OPEN_THREADS_EVENT)); }
export function startNewScore(target: EventTarget = window) { target.dispatchEvent(new Event(SCORE_NEW_EVENT)); }
