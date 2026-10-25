import { extractText, getDocumentProxy } from "unpdf";

import { PDF_MAX_PAGES } from "./onboarding-pdf";

/** Text and page count only. Callers discard the bytes; this keeps nothing. */
export async function readPdfDocument(data: Uint8Array): Promise<{ text: string; pageCount: number }> {
  const pdf = await getDocumentProxy(data);
  const pageCount = pdf.numPages;
  if (pageCount > PDF_MAX_PAGES) return { text: "", pageCount };
  const extracted = await extractText(pdf, { mergePages: true });
  return { text: extracted.text, pageCount: extracted.totalPages || pageCount };
}
