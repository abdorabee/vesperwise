import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { escapeHtml } from "@/lib/html-escape";

const schema = z.object({
  reason:   z.enum(["demo", "pricing", "trial", "enterprise", "other"]),
  name:     z.string().trim().min(1).max(120),
  email:    z.string().email(),
  company:  z.string().max(120).optional(),
  teamSize: z.string().optional(),
  message:  z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
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

  const { reason, name, email, company, teamSize, message } = parsed.data;
  // Single-line values for the subject header; everything in the HTML body is escaped.
  const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ");
  const html = {
    name:     escapeHtml(name),
    email:    escapeHtml(email),
    company:  escapeHtml(company || "—"),
    teamSize: escapeHtml(teamSize || "—"),
    reason:   escapeHtml(reason),
    message:  message ? escapeHtml(message) : "",
  };

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    "VesperWise Contact <onboarding@resend.dev>",
        to:      ["abdorabee1134@gmail.com"],
        replyTo: email,
        subject: `[Contact] ${reason} — ${oneLine(name)}${company ? ` · ${oneLine(company)}` : ""}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
            <h2 style="margin-bottom:4px">New contact form submission</h2>
            <p style="color:#666;margin-top:0">via VesperWise contact page</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888;width:120px">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee">${html.name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${html.email}">${html.email}</a></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Company</td><td style="padding:8px 0;border-bottom:1px solid #eee">${html.company}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#888">Team size</td><td style="padding:8px 0;border-bottom:1px solid #eee">${html.teamSize}</td></tr>
              <tr><td style="padding:8px 0;color:#888">Reason</td><td style="padding:8px 0">${html.reason}</td></tr>
            </table>
            ${html.message ? `<h3 style="margin-bottom:8px">Message</h3><p style="white-space:pre-wrap;background:#f9f9f9;padding:16px;border-radius:6px;color:#333">${html.message}</p>` : ""}
          </div>
        `,
      });
    } catch (err) {
      console.error("[contact] Resend error:", err);
      // Still return success — don't block the user on email errors
    }
  } else {
    // Dev fallback: log to console
    console.log("[contact form submission]", { reason, name, email, company, teamSize, message });
  }

  return NextResponse.json({ ok: true });
}
