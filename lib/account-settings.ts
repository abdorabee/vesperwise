import { z } from "zod";

import { WORKSPACE_NAME_MAX } from "./business-profile";
import { USER_ROLE_OPTIONS, type UserRole } from "./types";

export { WORKSPACE_NAME_MAX };

/** Same bound as businessProfileSchema.workspace_name, so the two stores can't disagree. */
export const workspaceNameSchema = z.string().trim().min(1).max(WORKSPACE_NAME_MAX);

export const userRoleSchema = z.enum(USER_ROLE_OPTIONS);

export const accountUpdateSchema = z
  .object({
    workspace_name: workspaceNameSchema.optional(),
    role: userRoleSchema.optional(),
  })
  .refine((value) => value.workspace_name !== undefined || value.role !== undefined, {
    message: "Send workspace_name, role, or both",
  });

export type AccountUpdate = z.infer<typeof accountUpdateSchema>;

/**
 * Only the keys actually sent are written, so a role-only save cannot blank the
 * workspace name (and vice versa).
 */
export function accountUpdateColumns(update: AccountUpdate): {
  workspace_name?: string;
  role?: UserRole;
} {
  return {
    ...(update.workspace_name !== undefined ? { workspace_name: update.workspace_name } : {}),
    ...(update.role !== undefined ? { role: update.role } : {}),
  };
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sdr: "SDR",
  ae: "Account Executive",
  manager: "Sales Manager",
  admin: "Admin",
};

export const ROLE_HINTS: Record<UserRole, string> = {
  sdr: "Prospecting and first touches",
  ae: "Owns opportunities through close",
  manager: "Oversees a team's pipeline",
  admin: "Manages the workspace and billing",
};
