"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ACCOUNT_PARAM, accountHref, readAccountParam } from "@/lib/account-param";

/**
 * The account open in the shared panel, kept in the URL as `?account=<domain>`
 * so it survives reloads and can be linked to.
 */
export function useAccountParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const account = readAccountParam(searchParams.get(ACCOUNT_PARAM));

  const openAccount = useCallback((domain: string) => {
    router.replace(accountHref(pathname, search, domain.toLowerCase()), { scroll: false });
  }, [pathname, router, search]);

  const closeAccount = useCallback(() => {
    router.replace(accountHref(pathname, search, null), { scroll: false });
  }, [pathname, router, search]);

  return { account, openAccount, closeAccount };
}
