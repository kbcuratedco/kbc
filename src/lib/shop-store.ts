import { useEffect, useState } from "react";
import { PRODUCTS, type BannerSizeId } from "./products";
import type { ProductCategory } from "./products";
import { toast } from "sonner";

// ---------- Admin mode ----------
const ADMIN_KEY = "kb_admin_mode";
const adminListeners = new Set<() => void>();
export function useAdminMode() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const update = () => setOn(window.localStorage.getItem(ADMIN_KEY) === "1");
    update();
    adminListeners.add(update);
    return () => {
      adminListeners.delete(update);
    };
  }, []);
  const toggle = (v: boolean) => {
    window.localStorage.setItem(ADMIN_KEY, v ? "1" : "0");
    adminListeners.forEach((l) => l());
  };
  return [on, toggle] as const;
}

// ---------- Cart ----------
export interface Personalization {
  name: string;
  colorNotes?: string;
  inspoImage?: string; // data URL
  sportsDetails?: {
    notes?: string;
  };
}

export interface CartItem {
  key: string; // unique per config
  productId: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  category?: ProductCategory;
  // config
  personalization?: Personalization;
  bannerSize?: BannerSizeId;
  bannerDetails?: {
    dateNeeded: string;
    name: string;
    theme: string;
    inspoImages: string[]; // data URLs
  };
}

const CART_KEY = "kb_cart_v1";
const cartListeners = new Set<() => void>();

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    const msg = isQuota
      ? "Your basket is too big to save — try fewer or smaller inspo photos."
      : "Couldn't save your basket. Try again.";
    toast.error(msg);
    throw new Error(msg);
  }
  cartListeners.forEach((l) => l());
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    const update = () => setItems(readCart());
    update();
    cartListeners.add(update);
    return () => {
      cartListeners.delete(update);
    };
  }, []);
  return items;
}

export function addToCart(item: Omit<CartItem, "key"> & { key?: string }) {
  const key =
    item.key ?? `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const items = readCart();
  items.push({ ...item, key });
  writeCart(items);
}
export function removeFromCart(key: string) {
  writeCart(readCart().filter((i) => i.key !== key));
}
export function updateCartQty(key: string, qty: number) {
  const items = readCart().map((i) => (i.key === key ? { ...i, quantity: Math.max(1, qty) } : i));
  writeCart(items);
}
export function clearCart() {
  writeCart([]);
}

// Warm-up so PRODUCTS is used somewhere
export const _productCount = PRODUCTS.length;
