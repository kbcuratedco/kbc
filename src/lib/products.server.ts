import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { categorySchema, type ProductInput, type UpdateProductInput } from "./products.schemas";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type ProductClient = SupabaseClient<Database>;

type AuthContext = {
  userId: string;
  claims?: { email?: string | null } | null;
  supabase: ProductClient;
};

function requireCloudEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("The shop database is not connected right now.");
  }
  return { url, key };
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (supabaseKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getPublicClient() {
  const { url, key } = requireCloudEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: { fetch: createSupabaseFetch(key) },
  });
}

function getUserClient(token: string) {
  const { url, key } = requireCloudEnv();
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: createSupabaseFetch(key),
    },
  });
}

function toStoredProduct(data: ProductInput): ProductInsert {
  return {
    title: data.title,
    category: data.category,
    price: data.price,
    description: data.description,
    images: data.images,
    active: data.active,
    free_shipping: data.freeShipping,
    digital: data.digital,
    sort_order: data.sortOrder,
  };
}

function toProductPatch(data: Omit<UpdateProductInput, "id">): ProductUpdate {
  const update: ProductUpdate = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.category !== undefined) update.category = data.category;
  if (data.price !== undefined) update.price = data.price;
  if (data.description !== undefined) update.description = data.description;
  if (data.images !== undefined) update.images = data.images;
  if (data.active !== undefined) update.active = data.active;
  if (data.freeShipping !== undefined) update.free_shipping = data.freeShipping;
  if (data.digital !== undefined) update.digital = data.digital;
  if (data.sortOrder !== undefined) update.sort_order = data.sortOrder;
  return update;
}

async function assertAdmin(supabase: ProductClient, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Sign in with the owner account before editing products.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function titleCategoryKey(product: Pick<ProductInsert, "title" | "category">) {
  return `${String(product.category)}::${String(product.title).trim().toLocaleLowerCase()}`;
}

function exactDuplicateKey(product: ProductRow) {
  return JSON.stringify([
    product.title.trim().toLocaleLowerCase(),
    product.category,
    Number(product.price),
    product.description ?? "",
    product.images ?? [],
    product.active,
    product.free_shipping ?? false,
    product.digital ?? false,
    product.sort_order ?? 0,
  ]);
}

function sameProductKey(product: Pick<ProductRow, "title" | "category">) {
  return `${product.category}::${product.title.trim().toLocaleLowerCase()}`;
}

function productQualityScore(product: ProductRow) {
  return [
    product.images?.length ?? 0,
    product.sort_order && product.sort_order > 0 ? 1 : 0,
    new Date(product.updated_at).getTime(),
  ];
}

function isBetterProduct(candidate: ProductRow, current: ProductRow) {
  const candidateScore = productQualityScore(candidate);
  const currentScore = productQualityScore(current);
  for (let i = 0; i < candidateScore.length; i += 1) {
    const candidateValue = candidateScore[i] ?? 0;
    const currentValue = currentScore[i] ?? 0;
    if (candidateValue !== currentValue) return candidateValue > currentValue;
  }
  return new Date(candidate.created_at).getTime() > new Date(current.created_at).getTime();
}

function normalizeLegacyProducts(products: unknown[]) {
  return products.flatMap((product) => {
    if (!isRecord(product)) return [];
    const images =
      textArray(product.images).length > 0 ? textArray(product.images) : textArray([product.image]);
    if (!product.title || images.length === 0) return [];
    const categoryResult = categorySchema.safeParse(product.category);
    const price = Number(product.price);
    const sortOrder = Number(product.sortOrder ?? product.sort_order);
    return [
      {
        title: String(product.title).trim(),
        category: categoryResult.success ? categoryResult.data : "stationery",
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        description: String(product.description ?? ""),
        images,
        active: product.active !== false,
        free_shipping: Boolean(product.freeShipping ?? product.free_shipping),
        digital: Boolean(product.digital),
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      } satisfies ProductInsert,
    ];
  });
}

export async function listProductsHandler({ data }: { data: { activeOnly?: boolean } }) {
  const supabase = getPublicClient();
  let query = supabase.from("products").select("*").order("sort_order", { ascending: true });
  if (data.activeOnly) query = query.eq("active", true);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function getProductHandler({ data }: { data: { id: string } }) {
  const supabase = getPublicClient();
  const { data: row, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", data.id)
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function claimAdminHandler({ context }: { context: AuthContext }) {
  const email = context.claims?.email;
  if (email !== "orders@kbcuratedco.com") {
    throw new Error("Only the shop owner can claim admin access.");
  }
  const { error } = await context.supabase
    .from("user_roles")
    .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function checkAdminHandler() {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const authHeader = getRequestHeader("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { isAdmin: false };
  const token = authHeader.slice(7);
  if (token.split(".").length !== 3) return { isAdmin: false };

  const supabase = getUserClient(token);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return { isAdmin: false };

  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (error) return { isAdmin: false };
  return { isAdmin: !!data };
}

export async function addProductHandler({
  data,
  context,
}: {
  data: ProductInput;
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const { data: row, error } = await context.supabase
    .from("products")
    .insert(toStoredProduct(data))
    .select()
    .single();
  if (error) throw new Error(error.message);
  return row;
}

export async function updateProductHandler({
  data,
  context,
}: {
  data: UpdateProductInput;
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const { id, ...patch } = data;
  const update = toProductPatch(patch);
  const { data: row, error } = await context.supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("That product was not found or has already been deleted.");
  return row;
}

export async function toggleProductActiveHandler({
  data,
  context,
}: {
  data: { id: string; active: boolean };
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const { data: row, error } = await context.supabase
    .from("products")
    .update({ active: data.active })
    .eq("id", data.id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("That product was not found or has already been deleted.");
  return row;
}

export async function removeProductHandler({
  data,
  context,
}: {
  data: { id: string };
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const { data: rows, error } = await context.supabase
    .from("products")
    .delete()
    .eq("id", data.id)
    .select("id, title, category");
  if (error) throw new Error(error.message);
  const deleted = rows?.length ?? 0;
  if (deleted === 0) throw new Error("That product was not found or has already been deleted.");
  const removed = rows?.[0];
  if (removed) {
    // Tombstone so imports don't resurrect this product.
    await context.supabase
      .from("deleted_products")
      .insert({ title: removed.title, category: removed.category, deleted_by: context.userId })
      .then((res) => {
        // Ignore duplicate-tombstone errors (23505) — already tracked.
        if (res.error && !String(res.error.code).includes("23505")) {
          console.warn("Failed to record deleted product tombstone:", res.error.message);
        }
      });
  }
  return { ok: true, deleted };
}

export async function importFromLocalStorageHandler({
  data,
  context,
}: {
  data: { products: unknown[] };
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const normalized = normalizeLegacyProducts(data.products);
  const byTitle = new Map<string, ProductInsert>();
  normalized.forEach((product) => byTitle.set(titleCategoryKey(product), product));
  const allProducts = Array.from(byTitle.values());
  if (allProducts.length === 0)
    return { imported: 0, updated: 0, skippedDuplicates: 0, skippedDeleted: 0 };

  // Filter out anything the owner has previously deleted.
  const { data: tombstones, error: tombError } = await context.supabase
    .from("deleted_products")
    .select("title, category");
  if (tombError) throw new Error(tombError.message);
  const deletedKeys = new Set(
    (tombstones ?? []).map((t) => titleCategoryKey({ title: t.title, category: t.category })),
  );
  const products = allProducts.filter((p) => !deletedKeys.has(titleCategoryKey(p)));
  const skippedDeleted = allProducts.length - products.length;
  if (products.length === 0) {
    return {
      imported: 0,
      updated: 0,
      skippedDuplicates: normalized.length - allProducts.length,
      skippedDeleted,
    };
  }

  const { data: existingRows, error: existingError } = await context.supabase
    .from("products")
    .select("*");
  if (existingError) throw new Error(existingError.message);

  const existingByTitle = new Map<string, ProductRow>();
  (existingRows ?? []).forEach((row) => {
    const key = titleCategoryKey(row);
    const current = existingByTitle.get(key);
    if (!current || isBetterProduct(row, current)) existingByTitle.set(key, row);
  });

  let updated = 0;
  const inserts: ProductInsert[] = [];
  for (const product of products) {
    const existing = existingByTitle.get(titleCategoryKey(product));
    if (existing) {
      const { error } = await context.supabase
        .from("products")
        .update(product)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      inserts.push(product);
    }
  }

  if (inserts.length > 0) {
    const { error } = await context.supabase.from("products").insert(inserts);
    if (error) throw new Error(error.message);
  }

  return {
    imported: inserts.length,
    updated,
    skippedDuplicates: normalized.length - allProducts.length,
    skippedDeleted,
  };
}

// ---------- Deleted-product tombstones ----------

export async function listDeletedProductsHandler({ context }: { context: AuthContext }) {
  await assertAdmin(context.supabase, context.userId);
  const { data, error } = await context.supabase
    .from("deleted_products")
    .select("id, title, category, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function restoreDeletedProductHandler({
  data,
  context,
}: {
  data: { id: string };
  context: AuthContext;
}) {
  await assertAdmin(context.supabase, context.userId);
  const { data: rows, error } = await context.supabase
    .from("deleted_products")
    .delete()
    .eq("id", data.id)
    .select("id");
  if (error) throw new Error(error.message);
  if ((rows?.length ?? 0) === 0) throw new Error("That entry is no longer in the deleted list.");
  return { ok: true };
}

export async function cleanupDuplicateProductsHandler({ context }: { context: AuthContext }) {
  await assertAdmin(context.supabase, context.userId);
  const { data: rows, error } = await context.supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const exactSeen = new Set<string>();
  const bestByTitle = new Map<string, ProductRow>();
  const duplicateIds: string[] = [];
  (rows ?? []).forEach((row) => {
    const exactKey = exactDuplicateKey(row);
    if (exactSeen.has(exactKey)) {
      duplicateIds.push(row.id);
    } else {
      exactSeen.add(exactKey);
    }

    const titleKey = sameProductKey(row);
    const current = bestByTitle.get(titleKey);
    if (!current || isBetterProduct(row, current)) {
      if (current && !duplicateIds.includes(current.id)) duplicateIds.push(current.id);
      bestByTitle.set(titleKey, row);
    } else if (!duplicateIds.includes(row.id)) {
      duplicateIds.push(row.id);
    }
  });

  if (duplicateIds.length === 0) return { deleted: 0 };
  const { data: deletedRows, error: deleteError } = await context.supabase
    .from("products")
    .delete()
    .in("id", duplicateIds)
    .select("id");
  if (deleteError) throw new Error(deleteError.message);
  return { deleted: deletedRows?.length ?? 0 };
}
