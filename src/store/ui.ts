import { create } from "zustand";
import type { Product } from "@/lib/types";
import type { CartItem } from "./cart";

interface WhatsAppPayload {
  product?: Product;
  line?: Partial<CartItem> & { quantity?: number };
  link?: string;
}

interface UIState {
  searchOpen: boolean;
  whatsAppPayload: WhatsAppPayload | null;
  openSearch: () => void;
  closeSearch: () => void;
  openWhatsAppModal: (payload: WhatsAppPayload) => void;
  closeWhatsAppModal: () => void;
}

export const useUI = create<UIState>((set) => ({
  searchOpen: false,
  whatsAppPayload: null,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  openWhatsAppModal: (payload) => set({ whatsAppPayload: payload }),
  closeWhatsAppModal: () => set({ whatsAppPayload: null }),
}));
