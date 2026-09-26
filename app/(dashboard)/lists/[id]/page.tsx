import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { buildListDetailForId } from "@/lib/lists-data";
import { ListDetailClient } from "./list-detail-client";

export const metadata = { title: "List" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ListDetailPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const { id } = await params;
  const detail = await buildListDetailForId(userId, id);
  if (!detail) notFound();

  return <ListDetailClient detail={detail} />;
}
