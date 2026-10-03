"use client";

import { useState, useCallback, useEffect } from "react";
import type { ListCardSummary, ListsHeroStats } from "@/lib/lists-types";
import { ListsTopbarContext } from "@/components/dashboard/lists-topbar-context";
import { ListOverview } from "@/components/lists/list-overview";
import { ListsShellList } from "@/components/lists/lists-shell-list";
import { CreateListModal } from "@/components/lists/create-list-modal";

interface ListsViewProps {
  summaries: ListCardSummary[];
  hero: ListsHeroStats;
}

export function ListsView({ summaries, hero }: ListsViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const openCreateModal = useCallback(() => setModalOpen(true), []);

  useEffect(() => {
    const handler = () => setModalOpen(true);
    window.addEventListener("lists-open-modal", handler);
    return () => window.removeEventListener("lists-open-modal", handler);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("new") !== "1") return;
    const timer = window.setTimeout(() => setModalOpen(true), 0);
    url.searchParams.delete("new");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(null, "", next);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ListsTopbarContext.Provider value={{ openCreateModal }}>
      <ListsShellList summaries={summaries} activeId={null} onNewList={openCreateModal} />
      <div className="lists-page">
        <ListOverview summaries={summaries} hero={hero} />
        <CreateListModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </ListsTopbarContext.Provider>
  );
}
