import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type OAuthStrategy = `oauth_${string}`;

const PROVIDER_LABELS: Record<string, string> = {
  oauth_google: "Google",
  oauth_github: "GitHub",
  oauth_microsoft: "Microsoft",
  oauth_apple: "Apple",
  oauth_linkedin_oidc: "LinkedIn",
  oauth_linkedin: "LinkedIn",
};

const PROD_HOSTS = new Set(["vesperwise.com", "www.vesperwise.com"]);

export function oauthLabel(strategy: string): string {
  if (PROVIDER_LABELS[strategy]) return PROVIDER_LABELS[strategy];
  return strategy.replace(/^oauth_/, "").replace(/_/g, " ");
}

export function socialStrategiesFromClerk(clerk: unknown): OAuthStrategy[] {
  const resources = clerk as {
    __internal_lastEmittedResources?: {
      environment?: {
        userSettings?: {
          authenticatableSocialStrategies?: OAuthStrategy[];
        };
      };
    };
  };
  const strategies =
    resources.__internal_lastEmittedResources?.environment?.userSettings
      ?.authenticatableSocialStrategies ?? [];
  return strategies.length > 0 ? strategies : (["oauth_google"] as OAuthStrategy[]);
}

export function fieldError(
  errors: { fields?: object | null } | null | undefined,
  key: string
): string | undefined {
  const fields = errors?.fields as Record<string, { message?: string } | null | undefined> | undefined;
  return fields?.[key]?.message;
}

export function globalError(
  errors: { global?: Array<{ message?: string }> | null } | null | undefined
): string | undefined {
  return errors?.global?.[0]?.message;
}

type FinalizeNavigate = (params: {
  navigate?: (args: {
    session?: { currentTask?: { key?: string } | null } | null;
    decorateUrl: (url: string) => string;
  }) => void | Promise<void>;
}) => Promise<{ error: { message?: string } | null }>;

/** True when the browser host is a preview / local deploy, not production marketing domains. */
export function isNonProductionBrowserHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  if (!hostname) return true;
  if (PROD_HOSTS.has(hostname)) return false;
  return true;
}

/**
 * Resolve a post-auth path without bouncing preview hosts to production.
 * Clerk's decorateUrl may rewrite relative paths to the instance home URL (vesperwise.com)
 * when production keys are used on Vercel previews.
 */
export function resolvePostAuthPath(
  decorateUrl: (url: string) => string,
  path = "/dashboard"
): { mode: "relative" | "absolute"; url: string } {
  const decorated = decorateUrl(path);

  if (typeof window !== "undefined" && isNonProductionBrowserHost(window.location.hostname)) {
    if (decorated.startsWith("http")) {
      try {
        const target = new URL(decorated);
        if (target.origin === window.location.origin) {
          return { mode: "relative", url: `${target.pathname}${target.search}${target.hash}` };
        }
      } catch {
        /* fall through to relative stay-on-host */
      }
      return { mode: "relative", url: path };
    }
    return { mode: "relative", url: decorated.startsWith("/") ? decorated : path };
  }

  if (decorated.startsWith("http")) {
    return { mode: "absolute", url: decorated };
  }
  return { mode: "relative", url: decorated };
}

export async function finalizeToDashboard(
  finalize: FinalizeNavigate,
  router: AppRouterInstance,
  path = "/dashboard"
) {
  const { error } = await finalize({
    navigate: ({ decorateUrl }) => {
      const resolved = resolvePostAuthPath(decorateUrl, path);
      if (resolved.mode === "absolute") {
        window.location.href = resolved.url;
        return;
      }
      router.push(resolved.url);
    },
  });
  return error;
}
