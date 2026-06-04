import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const LS_KEY = "gratinalli_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  }, [items]);

  const add = (product) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product_id === product.id);
      if (found) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: product.promo_price ?? product.price,
          weight: product.weight,
          image_url: product.image_url,
          category: product.category,
          quantity: 1,
        },
      ];
    });
  };

  const inc = (pid) =>
    setItems((p) => p.map((i) => (i.product_id === pid ? { ...i, quantity: i.quantity + 1 } : i)));
  const dec = (pid) =>
    setItems((p) =>
      p
        .map((i) => (i.product_id === pid ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  const remove = (pid) => setItems((p) => p.filter((i) => i.product_id !== pid));
  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, add, inc, dec, remove, clear, subtotal, totalItems, open, setOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
