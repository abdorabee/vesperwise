import { auth, currentUser } from "@clerk/nextjs/server";
import { buildBillingStats } from "@/lib/billing-stats";
import { getWorkspaceLabel } from "@/lib/workspace-label";
import { BillingView } from "./billing-view";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const [stats, clerkUser] = await Promise.all([
    buildBillingStats(userId),
    currentUser().catch(() => null),
  ]);

  const email =
    stats.profile.email ||
    clerkUser?.emailAddresses[0]?.emailAddress ||
    "";

  const workspaceLabel = getWorkspaceLabel({
    workspaceName: stats.profile.workspace_name,
    fullName: clerkUser?.fullName,
    email,
  });

  return <BillingView stats={stats} email={email} workspaceLabel={workspaceLabel} />;
}
