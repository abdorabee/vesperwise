import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { buildWatchlistStats } from "@/lib/watchlist-stats";
import { WatchlistView } from "./watchlist-view";

export const metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const initial = await buildWatchlistStats(userId);

  return (
    <Suspense fallback={null}>
      <WatchlistView initial={initial} />
    </Suspense>
  );
}
