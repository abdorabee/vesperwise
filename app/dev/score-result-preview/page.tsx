import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Alias of /score-surfaces-preview — public non-prod result surfaces QA. */
export default function ScoreResultPreviewPage() {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
  redirect("/score-surfaces-preview");
}
