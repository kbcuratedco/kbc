import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  idSchema,
  importProductsSchema,
  productSchema,
  toggleProductSchema,
  updateProductSchema,
} from "./products.schemas";
import {
  addProductHandler,
  checkAdminHandler,
  claimAdminHandler,
  cleanupDuplicateProductsHandler,
  getProductHandler,
  importFromLocalStorageHandler,
  listProductsHandler,
  listDeletedProductsHandler,
  removeProductHandler,
  restoreDeletedProductHandler,
  toggleProductActiveHandler,
  updateProductHandler,
} from "./products.server";

// ---------- Public reads ----------

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((data: { activeOnly?: boolean } | undefined) =>
    z.object({ activeOnly: z.boolean().optional() }).parse(data ?? {}),
  )
  .handler(listProductsHandler);

export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => idSchema.parse(data))
  .handler(getProductHandler);

// ---------- Admin claim ----------

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(claimAdminHandler);

export const checkAdmin = createServerFn({ method: "GET" }).handler(checkAdminHandler);

// ---------- Admin writes ----------

export const addProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof productSchema>) => productSchema.parse(data))
  .handler(addProductHandler);

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string } & Partial<z.infer<typeof productSchema>>) =>
    updateProductSchema.parse(data),
  )
  .handler(updateProductHandler);

export const toggleProductActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; active: boolean }) => toggleProductSchema.parse(data))
  .handler(toggleProductActiveHandler);

export const removeProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => idSchema.parse(data))
  .handler(removeProductHandler);

// ---------- Bulk import from localStorage ----------

export const importFromLocalStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { products: unknown[] }) => importProductsSchema.parse(data))
  .handler(importFromLocalStorageHandler);

export const cleanupDuplicateProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(cleanupDuplicateProductsHandler);

// ---------- Deleted-product tombstones ----------

export const listDeletedProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(listDeletedProductsHandler);

export const restoreDeletedProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(restoreDeletedProductHandler);
