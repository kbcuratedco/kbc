import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import {
  listProducts,
  addProduct as addProductFn,
  updateProduct as updateProductFn,
  removeProduct as removeProductFn,
  toggleProductActive as toggleProductActiveFn,
  importFromLocalStorage as importFromLocalStorageFn,
  cleanupDuplicateProducts as cleanupDuplicateProductsFn,
  listDeletedProducts as listDeletedProductsFn,
  restoreDeletedProduct as restoreDeletedProductFn,
  checkAdmin,
  claimAdmin,
} from "./products.functions";
import type { Product } from "./products";

export interface StoredProduct extends Product {
  active: boolean;
  images: string[];
}

const PRODUCTS_KEY = ["products"];
const ADMIN_KEY = ["admin-status"];
const DELETED_PRODUCTS_KEY = ["deleted-products"];

function normalize(rows: any[]): StoredProduct[] {
  return rows.map((p) => {
    const images: string[] = Array.isArray(p.images) && p.images.length > 0 ? p.images : [];
    return {
      ...p,
      images,
      image: images[0] ?? "",
      active: p.active !== false,
      freeShipping: !!p.free_shipping,
      digital: !!p.digital,
      sortOrder: p.sort_order ?? 0,
    } as StoredProduct;
  });
}

export function productsQueryOptions(activeOnly = false) {
  return queryOptions({
    queryKey: [...PRODUCTS_KEY, { activeOnly }],
    queryFn: async () => {
      const rows = await listProducts({ data: { activeOnly } });
      return normalize(rows);
    },
  });
}

export function useProducts(activeOnly = false) {
  return useQuery(productsQueryOptions(activeOnly));
}

export function useAdminStatus() {
  return useQuery({
    queryKey: ADMIN_KEY,
    queryFn: () => checkAdmin().catch(() => ({ isAdmin: false })),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClaimAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => claimAdmin(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_KEY }),
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof addProductFn>[0]["data"]) => addProductFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateProductFn>[0]["data"]) => updateProductFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useToggleProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof toggleProductActiveFn>[0]["data"]) => toggleProductActiveFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useRemoveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof removeProductFn>[0]["data"]) => removeProductFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useImportFromLocalStorage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (products: any[]) => importFromLocalStorageFn({ data: { products } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useCleanupDuplicateProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cleanupDuplicateProductsFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

export function useDeletedProducts(enabled = true) {
  return useQuery({
    queryKey: DELETED_PRODUCTS_KEY,
    queryFn: () => listDeletedProductsFn(),
    enabled,
  });
}

export function useRestoreDeletedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreDeletedProductFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: DELETED_PRODUCTS_KEY }),
  });
}

// Legacy helpers kept for compatibility with components that still call them imperatively.
// These are no-ops because products now live in the cloud. Use the mutation hooks above.
export function addProduct(_p: Omit<StoredProduct, "id" | "active"> & { id?: string; active?: boolean }) {
  // no-op: replaced by useAddProduct
}
export function removeProduct(_id: string) {
  // no-op: replaced by useRemoveProduct
}
export function toggleProductActive(_id: string) {
  // no-op: replaced by useToggleProductActive
}
export function updateProductImage(_id: string, _image: string) {
  // no-op: replaced by useUpdateProduct
}
export function updateProduct(_id: string, _patch: Partial<StoredProduct>) {
  // no-op: replaced by useUpdateProduct
}
export function resetProducts() {
  // no-op
}

export type { ProductCategory } from "./products";
