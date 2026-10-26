import { describe, expect, it } from "vitest";

import { PDF_MAX_PAGES } from "./onboarding-pdf";
import { readPdfDocument } from "./onboarding-pdf-read";

function buildTextPdf(pages: string[]): Uint8Array {
  const objects = new Map<number, string>();
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let next = 4;
  const kids: string[] = [];
  for (const pageText of pages) {
    const contentId = next++;
    const pageId = next++;
    const escaped = pageText.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const stream = `BT /F1 12 Tf 72 700 Td (${escaped}) Tj ET`;
    objects.set(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
    );
    kids.push(`${pageId} 0 R`);
  }
  objects.set(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(" ")}] >>`);
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");

  const maxId = next - 1;
  let cursor = "%PDF-1.4\n".length;
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let id = 1; id <= maxId; id++) {
    offsets.push(cursor);
    const body = `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
    chunks.push(body);
    cursor += body.length;
  }
  const xrefAt = cursor;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  chunks.push(xref);
  return new TextEncoder().encode(chunks.join(""));
}

describe("readPdfDocument", () => {
  it("reads text from a text PDF and stops at the page cap", async () => {
    const text = "We sell software to healthcare companies across the United States today.";
    const readable = await readPdfDocument(buildTextPdf([text]));
    expect(readable.pageCount).toBe(1);
    expect(readable.text).toContain("software");
    expect(readable.text).toContain("healthcare");

    const scanned = await readPdfDocument(buildTextPdf([""]));
    expect(scanned.pageCount).toBe(1);
    expect(scanned.text.trim()).toBe("");

    const long = await readPdfDocument(buildTextPdf(Array.from({ length: PDF_MAX_PAGES + 1 }, () => "Page")));
    expect(long.pageCount).toBe(PDF_MAX_PAGES + 1);
    expect(long.text).toBe("");
  });

  it("rejects a corrupt file instead of returning text", async () => {
    const junk = new TextEncoder().encode("%PDF-1.4 this is not a real document");
    await expect(readPdfDocument(junk)).rejects.toThrow();
  });
});
