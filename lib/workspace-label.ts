/**
 * `workspace_name` is stored canonically on the `users` column, but rows written
 * before that column existed only carry it inside the `business_profile` jsonb,
 * which onboarding still mirrors. One resolver with a fixed precedence keeps the
 * two copies from ever disagreeing at read time.
 */
export function storedWorkspaceName(
  row:
    | {
        workspace_name?: string | null;
        business_profile?: { workspace_name?: string | null } | null;
      }
    | null
    | undefined
): string | null {
  const column = row?.workspace_name?.trim();
  if (column) return column;

  const mirrored = row?.business_profile?.workspace_name?.trim();
  return mirrored || null;
}

export function getWorkspaceLabel(opts: {
  /** The name the user chose. Optional so call sites that don't have it keep the old fallbacks. */
  workspaceName?: string | null;
  fullName?: string | null;
  email?: string | null;
}): string {
  const workspaceName = opts.workspaceName?.trim();
  if (workspaceName) return workspaceName;

  const fullName = opts.fullName?.trim();
  if (fullName) return fullName;

  const localPart = opts.email?.split("@")[0]?.trim();
  if (localPart) return localPart;

  return "Workspace";
}
