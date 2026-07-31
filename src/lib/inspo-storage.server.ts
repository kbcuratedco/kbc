// Shared storage path + signing helper for the private `order-inspo` bucket.
//
// Every writer MUST go through here so the object path used for upload is the
// exact same string used for createSignedUrl(), and so it always matches the
// folder-scoped RLS policies on storage.objects. Nothing is ever written to
// the bucket root.
//
//   pending/<random>.<ext>       guest uploads, pre-checkout
//   u/<user-id>/<random>.<ext>   signed-in uploads
//   orders/<order-id>/<n>.<ext>  attached at order submission
//
// No service role key is used: signing is authorized by RLS, so this works on
// any host that has only the publishable key.
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export const INSPO_BUCKET = "order-inspo";
/** 90 days — order emails link to these, so they must outlive the inbox. */
export const INSPO_URL_TTL = 60 * 60 * 24 * 90;

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, k) => headers.set(k, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** Bearer token from the incoming request, if the caller is signed in. */
function readBearerToken(): string | null {
  try {
    const header = getRequest()?.headers?.get("authorization");
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.slice("Bearer ".length).trim();
    return token.split(".").length === 3 ? token : null;
  } catch {
    return null;
  }
}

/**
 * Publishable-key client, acting as the signed-in user when a valid bearer
 * token is present and as `anon` otherwise. RLS applies in both cases.
 * Returns the verified user id — derived from the token, never from input.
 */
export async function getInspoStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Photo uploads aren't available right now. Please try again later.");
  }

  const token = readBearerToken();
  const client = createClient<Database>(url, key, {
    global: {
      fetch: createSupabaseFetch(key),
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  let userId: string | null = null;
  if (token) {
    const { data } = await client.auth.getClaims(token);
    userId = (data?.claims?.sub as string | undefined) ?? null;
  }

  return { client, userId };
}

function extFromContentType(contentType: string): string {
  const raw = contentType.split("/")[1]?.split("+")[0] ?? "jpg";
  return raw.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
}

function randomSlug(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Guest -> pending/, signed-in -> u/<uid>/. Never the bucket root. */
export function buildUploadPath(userId: string | null, contentType: string): string {
  const file = `${randomSlug()}.${extFromContentType(contentType)}`;
  const raw = userId ? `u/${userId}/${file}` : `pending/${file}`;
  // Defensive: strip any leading slash and collapse accidental double slashes,
  // since storage.foldername() RLS checks are strict about path shape.
  return raw.replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

/** Photos attached while submitting an order. */
export function buildOrderPath(orderId: string, index: number, contentType: string): string {
  const safeOrderId = orderId.replace(/[^a-z0-9-]/gi, "");
  return `orders/${safeOrderId}/${index}-${randomSlug()}.${extFromContentType(contentType)}`;
}

type InspoClient = Awaited<ReturnType<typeof getInspoStorageClient>>["client"];

/**
 * Upload bytes and sign the SAME path in one step, so upload and signing can
 * never drift apart.
 */
export async function uploadAndSign(
  path: string,
  body: Uint8Array,
  contentType: string,
  existingClient?: InspoClient,
): Promise<string> {
  const client = existingClient ?? (await getInspoStorageClient()).client;
  const up = await client.storage
    .from(INSPO_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (up.error) {
    // Log full error detail (status, name, etc.) not just message, so any
    // future failure is diagnosable from server logs in one shot.
    console.error("INSPO UPLOAD FAILED", { path, error: JSON.stringify(up.error) });
    throw new Error(up.error.message);
  }

  const signed = await client.storage.from(INSPO_BUCKET).createSignedUrl(path, INSPO_URL_TTL);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(signed.error?.message ?? "Could not create a link for the uploaded photo");
  }
  return signed.data.signedUrl;
}

/** Decode a base64 payload into bytes. */
export function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}
