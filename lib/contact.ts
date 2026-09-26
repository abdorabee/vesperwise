export const CONTACT_REASONS = [
  { id: "demo",       label: "Book a demo"         },
  { id: "pricing",    label: "Pricing question"    },
  { id: "trial",      label: "Help on trial"       },
  { id: "enterprise", label: "Enterprise / Agency" },
  { id: "other",      label: "Something else"      },
] as const;

export type ContactReasonId = (typeof CONTACT_REASONS)[number]["id"];

export const CONTACT_REASON_IDS = CONTACT_REASONS.map((r) => r.id) as [
  ContactReasonId,
  ...ContactReasonId[],
];

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for safe interpolation into HTML element content or quoted attributes. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/** Collapse CR/LF and other control characters so user input can't break an email header line. */
export function toHeaderSafe(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();
}
