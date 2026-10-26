import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import * as onboardingPdf from "@/lib/onboarding-pdf";

const clerkAuth = vi.fn(async (): Promise<{ userId: string | null }> => ({ userId: "user_test" }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => clerkAuth() }));

const readPdfDocument = vi.fn<(data: Uint8Array) => Promise<{ text: string; pageCount: number }>>();
vi.mock("@/lib/onboarding-pdf-read", async () => {
  const actual = await vi.importActual<typeof import("@/lib/onboarding-pdf-read")>("@/lib/onboarding-pdf-read");
  return {
    ...actual,
    readPdfDocument: (data: Uint8Array) => readPdfDocument(data),
  };
});

const consumePdfRead = vi.fn<
  (userId: string) => Promise<{ ok: true; stamp: number } | { ok: false; retryAfterSeconds: number }>
>();
const releasePdfRead = vi.fn<(userId: string, stamp: number) => Promise<void>>();
vi.mock("@/lib/onboarding-pdf-limit", () => ({
  consumePdfRead: (userId: string) => consumePdfRead(userId),
  releasePdfRead: (userId: string, stamp: number) => releasePdfRead(userId, stamp),
}));

const PITCH = "We sell software. Our ideal customers are hospitals. Customers include notion.so.";

function pdfRequest(bytes = "%PDF-1.4\n" + PITCH, name = "icp.pdf") {
  const form = new FormData();
  form.set("file", new File([bytes], name, { type: "application/pdf" }));
  form.set("exclude_domain", "acme.com");
  return new NextRequest("http://localhost/api/onboarding/pdf", { method: "POST", body: form });
}

describe("POST /api/onboarding/pdf", () => {
  beforeEach(() => {
    clerkAuth.mockReset();
    clerkAuth.mockResolvedValue({ userId: "user_test" });
    readPdfDocument.mockReset();
    consumePdfRead.mockReset();
    releasePdfRead.mockReset();
    consumePdfRead.mockResolvedValue({ ok: true, stamp: 11 });
    readPdfDocument.mockResolvedValue({ text: PITCH, pageCount: 1 });
  });

  it("requires a signed-in user and does not read the file otherwise", async () => {
    clerkAuth.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    expect(response.status).toBe(401);
    expect(readPdfDocument).not.toHaveBeenCalled();
    expect(consumePdfRead).not.toHaveBeenCalled();
  });

  it("returns prefilled fields, says the file was discarded, and does not score", async () => {
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.discarded).toBe(true);
    expect(body.profile.product_category).toBe("SaaS / Software");
    expect(body.profile.target_industries).toEqual(["Healthcare"]);
    expect(body.profile.seed_domains).toEqual(["notion.so"]);
    expect(body.filled).toContain("product_category");
    expect(JSON.stringify(body)).not.toContain(PITCH);
    expect(consumePdfRead).toHaveBeenCalledTimes(1);
    const handedOff = readPdfDocument.mock.calls[0]?.[0];
    expect(handedOff).toBeInstanceOf(Uint8Array);
    expect(Array.from(handedOff ?? []).every((byte) => byte === 0)).toBe(true);
    expect(releasePdfRead).not.toHaveBeenCalled();
  });

  it("tells the user to continue manually when the PDF has no readable text", async () => {
    readPdfDocument.mockResolvedValue({ text: "   ", pageCount: 1 });
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.message).toBe("We couldn't read this PDF. Fill it in manually.");
    expect(consumePdfRead).toHaveBeenCalledTimes(1);
    expect(releasePdfRead).not.toHaveBeenCalled();
  });

  it("returns the same manual-fill message when the parser throws", async () => {
    readPdfDocument.mockRejectedValue(new Error("Invalid PDF structure"));
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("unreadable");
    expect(consumePdfRead).toHaveBeenCalledTimes(1);
    expect(releasePdfRead).not.toHaveBeenCalled();
  });

  it("rejects a deck over the page cap and a file that is not a PDF", async () => {
    readPdfDocument.mockResolvedValue({ text: "", pageCount: 21 });
    const { POST } = await import("./route");
    const tooLong = await POST(pdfRequest());
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).code).toBe("too_many_pages");

    const notPdf = await POST(pdfRequest("hello world", "notes.txt"));
    expect(notPdf.status).toBe(400);
    expect((await notPdf.json()).code).toBe("not_pdf");
    expect(readPdfDocument).toHaveBeenCalledTimes(1);
    expect(consumePdfRead).toHaveBeenCalledTimes(1);
  });

  it("does not spend the hourly allowance on files that fail the cheap checks", async () => {
    const { POST } = await import("./route");
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await POST(pdfRequest("not a pdf", `notes-${attempt}.txt`));
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("not_pdf");
    }

    const form = new FormData();
    form.set(
      "file",
      new File([new Uint8Array(onboardingPdf.PDF_MAX_BYTES + 1)], "big.pdf", { type: "application/pdf" })
    );
    const tooBig = await POST(new NextRequest("http://localhost/api/onboarding/pdf", { method: "POST", body: form }));
    expect(tooBig.status).toBe(400);
    expect((await tooBig.json()).code).toBe("too_large");
    expect(consumePdfRead).not.toHaveBeenCalled();
    expect(readPdfDocument).not.toHaveBeenCalled();
  });

  it("gives the allowance back when the server fails after reserving a read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const extract = vi.spyOn(onboardingPdf, "extractProfileFromPdfText").mockImplementation(() => {
      throw new Error("boom");
    });
    try {
      const { POST } = await import("./route");
      const response = await POST(pdfRequest());
      expect(response.status).toBe(500);
      expect((await response.json()).code).toBe("internal_error");
      expect(consumePdfRead).toHaveBeenCalledTimes(1);
      expect(releasePdfRead).toHaveBeenCalledWith("user_test", 11);
    } finally {
      extract.mockRestore();
      warn.mockRestore();
    }
  });

  it("rate limits repeated reads", async () => {
    consumePdfRead.mockResolvedValue({ ok: false, retryAfterSeconds: 120 });
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(readPdfDocument).not.toHaveBeenCalled();
  });

  it("returns an empty prefill when the text is readable but matches nothing", async () => {
    readPdfDocument.mockResolvedValue({
      text: "This document talks about the weather for forty characters or more today.",
      pageCount: 1,
    });
    const { POST } = await import("./route");
    const response = await POST(pdfRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.discarded).toBe(true);
    expect(body.profile).toEqual({});
    expect(body.filled).toEqual([]);
  });
});
