export type UserProvisionResult =
  | { ok: true }
  | { ok: false; message: string };

export type ProfileWriteResult =
  | { status: 200 }
  | { status: 404; error: string }
  | { status: 500; error: string };

export function userUpsertOutcome(result: {
  error: { message: string } | null;
}): UserProvisionResult {
  if (result.error) {
    return { ok: false, message: result.error.message };
  }
  return { ok: true };
}

export function userRowOutcome(row: { id: string } | null): UserProvisionResult {
  if (!row) {
    return { ok: false, message: "Workspace row was not created." };
  }
  return { ok: true };
}

export function profileWriteOutcome(result: {
  data: { id: string } | null;
  error: { message: string } | null;
}): ProfileWriteResult {
  if (result.error) {
    return { status: 500, error: "Failed to save profile" };
  }
  if (!result.data) {
    return {
      status: 404,
      error: "Workspace not found. Reload and try again.",
    };
  }
  return { status: 200 };
}
