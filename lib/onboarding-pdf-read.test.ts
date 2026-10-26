import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PDF_MAX_PAGES, PDF_TOO_MANY_PAGES_MESSAGE, PDF_UNREADABLE_MESSAGE } from "./onboarding-pdf";
import { readPdfDocument, wipePdfBytes } from "./onboarding-pdf-read";

const clerkAuth = vi.fn(async (): Promise<{ userId: string | null }> => ({ userId: "user_pdf" }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => clerkAuth() }));

const consumePdfRead = vi.fn(async () => ({ ok: true as const, stamp: 4 }));
const releasePdfRead = vi.fn<(userId: string, stamp: number) => Promise<void>>(async () => {});
vi.mock("@/lib/onboarding-pdf-limit", () => ({
  consumePdfRead: () => consumePdfRead(),
  releasePdfRead: (userId: string, stamp: number) => releasePdfRead(userId, stamp),
}));

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

const PITCH = "We sell software to healthcare companies across the United States today.";

function pdfRequest(bytes: Uint8Array, name = "icp.pdf") {
  const form = new FormData();
  form.set("file", new File([Buffer.from(bytes)], name, { type: "application/pdf" }));
  return new NextRequest("http://localhost/api/onboarding/pdf", { method: "POST", body: form });
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
    expect(() => wipePdfBytes(junk)).not.toThrow();
  });

  it("reads a real PDF without detaching the caller buffer, then wipes that copy", async () => {
    const bytes = buildTextPdf([PITCH]);
    const before = bytes.slice();
    const readable = await readPdfDocument(bytes);
    expect(readable.pageCount).toBe(1);
    expect(readable.text).toContain("software");
    expect(readable.text).toContain("healthcare");
    expect(bytes.byteLength).toBe(before.byteLength);
    expect(Array.from(bytes)).toEqual(Array.from(before));

    wipePdfBytes(bytes);
    expect(bytes.every((byte) => byte === 0)).toBe(true);

    const buffer = new ArrayBuffer(4);
    const detached = new Uint8Array(buffer);
    detached.fill(7);
    buffer.transfer();
    expect(detached.byteLength).toBe(0);
    expect(() => wipePdfBytes(detached)).not.toThrow();
  });
});

describe("POST /api/onboarding/pdf with a real PDF", () => {
  beforeEach(() => {
    clerkAuth.mockClear();
    consumePdfRead.mockClear();
    releasePdfRead.mockClear();
    clerkAuth.mockResolvedValue({ userId: "user_pdf" });
  });

  it("prefills from a text PDF and does not 500 while wiping the upload", async () => {
    const { POST } = await import("@/app/api/onboarding/pdf/route");
    const response = await POST(pdfRequest(buildTextPdf([PITCH])));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.discarded).toBe(true);
    expect(body.profile.product_category).toBe("SaaS / Software");
    expect(body.profile.target_industries).toEqual(["Healthcare"]);
    expect(body.filled.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain(PITCH);
    expect(releasePdfRead).not.toHaveBeenCalled();
  });

  it("asks for a manual fill when the PDF has no text", async () => {
    const { POST } = await import("@/app/api/onboarding/pdf/route");
    const response = await POST(pdfRequest(buildTextPdf([""]), "scan.pdf"));
    expect(response.status).toBe(422);
    expect((await response.json()).message).toBe(PDF_UNREADABLE_MESSAGE);
    expect(releasePdfRead).not.toHaveBeenCalled();
  });

  it("rejects 21 pages and accepts 20", async () => {
    const { POST } = await import("@/app/api/onboarding/pdf/route");
    const tooLong = await POST(
      pdfRequest(buildTextPdf(Array.from({ length: PDF_MAX_PAGES + 1 }, () => PITCH)), "long.pdf")
    );
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).message).toBe(PDF_TOO_MANY_PAGES_MESSAGE);
    expect(releasePdfRead).not.toHaveBeenCalled();

    const accepted = await POST(
      pdfRequest(buildTextPdf(Array.from({ length: PDF_MAX_PAGES }, () => PITCH)), "deck.pdf")
    );
    expect(accepted.status).toBe(200);
    const body = await accepted.json();
    expect(body.discarded).toBe(true);
    expect(body.profile.product_category).toBe("SaaS / Software");
  });

  it("does not reserve a read for three non-PDF uploads", async () => {
    const { POST } = await import("@/app/api/onboarding/pdf/route");
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await POST(pdfRequest(new TextEncoder().encode("hello"), `notes-${attempt}.txt`));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("not_pdf");
    }
    expect(consumePdfRead).not.toHaveBeenCalled();
  });
});
