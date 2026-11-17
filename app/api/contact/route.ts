import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CONTACT_REASON_IDS, escapeHtml, toHeaderSafe } from "@/lib/contact";
import { clientIpFromRequest, enforceRateLimit } from "@/lib/rate-limit";

const CONTACT_RATE_LIMIT = 5;
const CONTACT_RATE_WINDOW_SECONDS = 3600;
const MAX_HONEYPOT_LENGTH = 500;

const schema = z.object({
  reason:   z.enum(CONTACT_REASON_IDS),
  name:     z.string().min(1).max(120),
  email:    z.string().email(),
  company:  z.string().max(120).optional(),
  teamSize: z.string().max(60).optional(),
  message:  z.string().max(4000).optional(),
  // Honeypot: hidden from people, so only bots fill it in.
  company_website: z.string().max(MAX_HONEYPOT_LENGTH).optional(),
});

type ContactInput = z.infer<typeof schema>;

function renderHtml(input: ContactInput): string {
  const safe = {
    reason:   escapeHtml(input.reason),
    name:     escapeHtml(input.name),
    email:    escapeHtml(input.email),
    company:  escapeHtml(input.company || "—"),
    teamSize: escapeHtml(input.teamSize || "—"),
    message:  input.message ? escapeHtml(input.message) : "",
  };
  return `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
            <h2 style="margin-bottom:4px">New contact form submission</h2>
            <p style="color:#666;margin-top:0">via VesperWise contact page</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:120px">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee">${safe.name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${safe.email}">${safe.email}</a></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Company</td><td style="padding:8px 0;border-bottom:1px solid #eee">${safe.company}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Team size</td><td style="padding:8px 0;border-bottom:1px solid #eee">${safe.teamSize}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Reason</td><td style="padding:8px 0">${safe.reason}</td></tr>
            </table>
            ${safe.message ? `<h3 style="margin-bottom:8px">Message</h3><p style="white-space:pre-wrap;background:#f9f9f9;padding:16px;border-radius:6px;color:#333">${safe.message}</p>` : ""}
          </div>
        `;
}

async function sendContactEmail(input: ContactInput, apiKey: string, to: string): Promise<void> {
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { company, name, reason, email } = input;
  const { error } = await resend.emails.send({
    from:    "VesperWise Contact <onboarding@resend.dev>",
    to:      [to],
    replyTo: email,
    subject: toHeaderSafe(`[Contact] ${reason} — ${name}${company ? ` · ${company}` : ""}`),
    html:    renderHtml(input),
  });
  if (error) throw new Error(error.message);
}

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit({
    key: `contact:${clientIpFromRequest(req)}`,
    limit: CONTACT_RATE_LIMIT,
    windowSeconds: CONTACT_RATE_WINDOW_SECONDS,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Honeypot tripped: look successful so bots learn nothing, but send nothing.
  if (parsed.data.company_website) return NextResponse.json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  if (!apiKey || !to) {
    if (process.env.NODE_ENV === "production") {
      console.error("[contact] RESEND_API_KEY or CONTACT_TO_EMAIL is not set");
      return NextResponse.json({ error: "Contact form is not configured" }, { status: 503 });
    }
    // Dev fallback: metadata only, never the submitter's details.
    console.warn("[contact] email not configured, skipping send", {
      reason: parsed.data.reason,
      messageLength: parsed.data.message?.length ?? 0,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await sendContactEmail(parsed.data, apiKey, to);
  } catch (err) {
    console.error("[contact] Resend error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
