"use client";

import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

// Global cart for the product-grid "Add to Cart" flow, so the cart survives
// navigating between dashboard pages and can be opened from the mobile
// bottom nav (see MobileBottomBar), not just from the Products page itself.
export function CartProvider({ children }) {
  const [cart, setCart] = useState([]); // { productId, name, price, quantity }
  const [open, setOpen] = useState(false);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.productId === productId ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => setCart([]);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        itemCount,
        open,
        openCart: () => setOpen(true),
        closeCart: () => setOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
