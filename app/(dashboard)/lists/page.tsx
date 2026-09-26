import { auth } from "@clerk/nextjs/server";
import { buildListsOverview, ensureDefaultList } from "@/lib/lists-data";
import { ListsView } from "./lists-view";

export const metadata = { title: "Lists" };

export default async function ListsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  await ensureDefaultList(userId);
  const { summaries, hero } = await buildListsOverview(userId);

  return <ListsView summaries={summaries} hero={hero} />;
}
