import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { createHash, randomBytes } from "crypto";
import { API_KEY_PREFIX, normalizeApiKeyLabel } from "@/lib/api-keys";
import { enforceRateLimit } from "@/lib/rate-limit";

const API_KEY_CREATE_LIMIT = 10;
const API_KEY_CREATE_WINDOW_SECONDS = 3600;
const MAX_ACTIVE_API_KEYS = 25;

const KEY_COLUMNS = "id, label, last_used, is_active, created_at";

// GET — list all API keys for the logged-in user (key_hash never returned)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: keys, error } = await admin
    .from("api_keys")
    .select(KEY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load keys" }, { status: 500 });
  return NextResponse.json({ keys: keys ?? [] });
}

// POST — generate a new API key
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit({
    key: `apikeys:${userId}`,
    limit: API_KEY_CREATE_LIMIT,
    windowSeconds: API_KEY_CREATE_WINDOW_SECONDS,
  });
  if (limited) return limited;

  let body: { label?: unknown } = {};
  try {
    const raw: unknown = await req.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as { label?: unknown };
  } catch {
    // An empty body is fine — the key gets the default label.
  }

  // Generate a secure random key: vesperwise_<48 random hex chars>
  const rawKey = `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const admin = createSupabaseAdmin();
  const { count, error: countError } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (countError) return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  if ((count ?? 0) >= MAX_ACTIVE_API_KEYS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_ACTIVE_API_KEYS} active API keys. Revoke one to create another.` },
      { status: 409 },
    );
  }

  const { data: record, error } = await admin
    .from("api_keys")
    .insert({ user_id: userId, key_hash: keyHash, label: normalizeApiKeyLabel(body.label) })
    .select(KEY_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: "Failed to create key" }, { status: 500 });

  // Return raw key ONCE — it's never stored in plaintext
  return NextResponse.json({ key: rawKey, record }, { status: 201 });
}

// DELETE — revoke a key by id
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", userId) // scoped to user for safety
    .select("id");

  if (error) return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
