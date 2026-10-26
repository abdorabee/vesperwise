"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SCORE_CHAT_EVENT } from "@/lib/score-chat";

/** Hash from the real URL. Next's client navigations do not emit hashchange. */
export function useLocationHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    window.addEventListener(SCORE_CHAT_EVENT, read);
    return () => {
      window.removeEventListener("hashchange", read);
      window.removeEventListener(SCORE_CHAT_EVENT, read);
    };
  }, [pathname]);

  return hash;
}
