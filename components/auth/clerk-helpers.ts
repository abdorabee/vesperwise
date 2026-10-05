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

/** Hide a form-level error that only repeats a message already shown under a field. */
export function distinctGlobalError(
  message: string | null | undefined,
  fieldMessages: Array<string | null | undefined>
): string | undefined {
  if (!message || fieldMessages.includes(message)) return undefined;
  return message;
}

type FinalizeNavigate = (params: {
  navigate?: (args: {
    session?: { currentTask?: { key?: string } | null } | null;
    decorateUrl: (url: string) => string;
  }) => void | Promise<void>;
}) => Promise<{ error: { message?: string } | null }>;

export async function finalizeToDashboard(
  finalize: FinalizeNavigate,
  router: AppRouterInstance
) {
  const { error } = await finalize({
    navigate: ({ decorateUrl }) => {
      const url = decorateUrl("/dashboard");
      if (url.startsWith("http")) {
        window.location.href = url;
        return;
      }
      router.push(url);
    },
  });
  return error;
}
