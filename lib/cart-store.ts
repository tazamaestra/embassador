import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  swatch: string;
  img: string | null;
}

interface CartState {
  items: CartItem[];
  open: boolean;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      addItem: (item) =>
        set((s) => {
          const exists = s.items.find((i) => i.id === item.id);
          if (exists) {
            return {
              items: s.items.map((i) =>
                i.id === item.id ? { ...i, qty: i.qty + 1, price: item.price } : i
              ),
              open: true,
            };
          }
          return { items: [...s.items, { ...item, qty: 1 }], open: true };
        }),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.id !== id)
              : s.items.map((i) => (i.id === id ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [] }),
      openCart: () => set({ open: true }),
      closeCart: () => set({ open: false }),
    }),
    { name: "tm-cart" }
  )
);
