import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/types";

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
  variant?: string;
  material?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (id: string, opts?: Partial<CartItem>) => void;
  setQuantity: (id: string, quantity: number, opts?: Partial<CartItem>) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const sameLine = (a: CartItem, b: Partial<CartItem>) =>
  a.id === b.id && a.color === b.color && a.size === b.size && a.variant === b.variant;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (item, quantity = 1) =>
        set((s) => {
          const existing = s.items.find((i) => sameLine(i, item));
          if (existing) {
            return {
              items: s.items.map((i) => (sameLine(i, item) ? { ...i, quantity: i.quantity + quantity } : i)),
              isOpen: true,
            };
          }
          return { items: [...s.items, { ...item, quantity }], isOpen: true };
        }),
      remove: (id, opts = {}) =>
        set((s) => ({ items: s.items.filter((i) => !sameLine(i, { id, ...opts })) })),
      setQuantity: (id, quantity, opts = {}) =>
        set((s) => ({
          items: s.items
            .map((i) => (sameLine(i, { id, ...opts }) ? { ...i, quantity: Math.max(1, quantity) } : i))
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    { name: "artisan-cart", partialize: (s) => ({ items: s.items }) },
  ),
);

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((n, i) => n + i.price * i.quantity, 0);

export function toCartItem(product: Product, image: string, opts: Partial<CartItem> = {}): Omit<CartItem, "quantity"> {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image,
    material: product.material,
    ...opts,
  };
}
