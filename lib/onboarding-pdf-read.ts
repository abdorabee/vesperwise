import { extractText, getDocumentProxy } from "unpdf";

import { PDF_MAX_PAGES } from "./onboarding-pdf";

type ClosablePdf = {
  /** Present on newer PDF.js proxies. This unpdf build destroys via `loadingTask`. */
  destroy?: () => Promise<void> | void;
  loadingTask?: { destroy?: () => Promise<void> };
};

/** Zero a buffer the route still owns. A detached buffer must not become a 500. */
export function wipePdfBytes(bytes: Uint8Array): void {
  try {
    if (bytes.byteLength > 0) bytes.fill(0);
  } catch {
    // pdf.js detaches the ArrayBuffer it was given. Callers wipe their own copy.
  }
}

async function closePdf(pdf: ClosablePdf): Promise<void> {
  try {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
      return;
    }
    await pdf.loadingTask?.destroy?.();
  } catch {
    // Closing the worker must not replace a finished read with a server error.
  }
}

/** Text and page count only. Callers discard the bytes; this keeps nothing. */
export async function readPdfDocument(data: Uint8Array): Promise<{ text: string; pageCount: number }> {
  // pdf.js transfers `data.buffer` into the worker, which detaches it.
  const pdf = await getDocumentProxy(new Uint8Array(data));
  try {
    const pageCount = pdf.numPages;
    if (pageCount > PDF_MAX_PAGES) return { text: "", pageCount };
    const extracted = await extractText(pdf, { mergePages: true });
    return { text: extracted.text, pageCount: extracted.totalPages || pageCount };
  } finally {
    await closePdf(pdf);
  }
}
