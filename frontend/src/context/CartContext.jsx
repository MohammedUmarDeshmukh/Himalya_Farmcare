import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { getProductImageUrl } from '../utils/formatters';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'himalaya_farmcare_cart';

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Sanitize every loaded item to guarantee qty >= 1 and valid numeric prices
          return parsed.map((item) => ({
            ...item,
            qty: Math.max(1, parseInt(item.qty, 10) || 1),
            unitPrice: Math.max(0, Number(item.unitPrice) || 0),
            sizeMl: Number(item.sizeMl) || 100,
          }));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [nextLineId, setNextLineId] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const maxId = Math.max(...parsed.map((item) => Number(item.lineId) || 0));
          return maxId + 1;
        }
      }
    } catch {}
    return 1;
  });

  const [showCheckout, setShowCheckout] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  // Extract accurate price for selected pack size
  const getPackPrice = (product, size) => {
    if (!product) return 0;
    const targetSize = Number(size) || 100;

    if (targetSize === 500) {
      if (product.p500 !== undefined && product.p500 !== null && !isNaN(Number(product.p500))) {
        return Number(product.p500);
      }
      const found = product.prices?.find((p) => Number(p.size) === 500);
      if (found && !isNaN(Number(found.amount))) return Number(found.amount);
    } else {
      if (product.p100 !== undefined && product.p100 !== null && !isNaN(Number(product.p100))) {
        return Number(product.p100);
      }
      const found = product.prices?.find((p) => Number(p.size) === 100);
      if (found && !isNaN(Number(found.amount))) return Number(found.amount);
    }

    // Fallback to any matched price or first available price
    if (product.prices && product.prices.length > 0) {
      const match = product.prices.find((p) => Number(p.size) === targetSize) || product.prices[0];
      return Number(match.amount) || 0;
    }

    return 0;
  };

  const addToCart = useCallback((product, sizeMl = 100) => {
    if (!product) return;
    const size = Number(sizeMl) || 100;
    const price = getPackPrice(product, size);
    const productId = product.id ?? product._id;
    const imageUrl = getProductImageUrl(product);

    setCart((current) => {
      const existingIndex = current.findIndex(
        (item) => String(item.productId) === String(productId) && Number(item.sizeMl) === size
      );

      if (existingIndex > -1) {
        return current.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                qty: (Number(item.qty) || 1) + 1,
                unitPrice: price > 0 ? price : item.unitPrice,
              }
            : item
        );
      }

      const newLine = {
        lineId: nextLineId,
        productId,
        name: product.name,
        crop: product.crop,
        problem: product.problem,
        image: imageUrl,
        sizeMl: size,
        qty: 1,
        unitPrice: price,
      };
      setNextLineId((prev) => prev + 1);
      return [...current, newLine];
    });
  }, [nextLineId]);

  const removeLine = useCallback((lineId) => {
    setCart((current) => current.filter((line) => line.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId, newQty) => {
    const parsed = parseInt(newQty, 10);
    const validQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    setCart((current) =>
      current.map((line) =>
        line.lineId === lineId ? { ...line, qty: validQty } : line
      )
    );
  }, []);

  const incrementQuantity = useCallback((lineId) => {
    setCart((current) =>
      current.map((line) =>
        line.lineId === lineId ? { ...line, qty: (Number(line.qty) || 1) + 1 } : line
      )
    );
  }, []);

  const decrementQuantity = useCallback((lineId) => {
    setCart((current) =>
      current.map((line) =>
        line.lineId === lineId ? { ...line, qty: Math.max(1, (Number(line.qty) || 1) - 1) } : line
      )
    );
  }, []);

  const changeLine = useCallback((lineId, key, value) => {
    if (key === 'qty') {
      updateQuantity(lineId, value);
    } else if (key === 'unitPrice') {
      const numVal = Math.max(0, Number(value) || 0);
      setCart((current) =>
        current.map((line) =>
          line.lineId === lineId ? { ...line, unitPrice: numVal } : line
        )
      );
    } else {
      setCart((current) =>
        current.map((line) =>
          line.lineId === lineId ? { ...line, [key]: value } : line
        )
      );
    }
  }, [updateQuantity]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + (Number(line.qty) || 1) * (Number(line.unitPrice) || 0), 0),
    [cart]
  );
  const gst = useMemo(() => subtotal * 0.05, [subtotal]);
  const total = useMemo(() => subtotal + gst, [subtotal, gst]);
  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + (Number(line.qty) || 1), 0),
    [cart]
  );

  const value = {
    cart,
    setCart,
    addToCart,
    removeLine,
    changeLine,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    showCheckout,
    setShowCheckout,
    isCartOpen,
    setIsCartOpen,
    subtotal,
    gst,
    total,
    itemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
