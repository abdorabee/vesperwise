"use client";

import { useState, useCallback, useEffect } from "react";
import type { ListCardSummary, ListDetailData } from "@/lib/lists-types";
import { ListsTopbarContext } from "@/components/dashboard/lists-topbar-context";
import { ListDetailView } from "@/components/lists/list-detail-view";
import { ListsShellList } from "@/components/lists/lists-shell-list";
import { CreateListModal } from "@/components/lists/create-list-modal";

interface ListDetailClientProps {
  detail: ListDetailData;
  summaries: ListCardSummary[];
}

export function ListDetailClient({ detail, summaries }: ListDetailClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const openCreateModal = useCallback(() => setModalOpen(true), []);

  useEffect(() => {
    const handler = () => setModalOpen(true);
    window.addEventListener("lists-open-modal", handler);
    return () => window.removeEventListener("lists-open-modal", handler);
  }, []);

  return (
    <ListsTopbarContext.Provider value={{ openCreateModal, listName: detail.list.name }}>
      <ListsShellList summaries={summaries} activeId={detail.list.id} newListHref="/lists?new=1" />
      <div className="lists-page">
        <ListDetailView detail={detail} />
        <CreateListModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </ListsTopbarContext.Provider>
  );
}
