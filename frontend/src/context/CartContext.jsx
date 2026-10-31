import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) return setItems([]);
    try { setItems(await api.getCart()); } catch { setItems([]); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(
    () => ({
      items,
      refresh,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.quantity * Number(i.product.price), 0),
      add: async (productId, qty = 1) => { await api.addCartItem(productId, qty); await refresh(); },
      update: async (itemId, qty) => { await api.updateCartItem(itemId, qty); await refresh(); },
      remove: async (itemId) => { await api.removeCartItem(itemId); await refresh(); },
    }),
    [items, refresh],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Adds to the cart, or sends guests to the sign-in page first. Returns true if added.
export function useAddToCart() {
  const { user } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  return async (productId, qty = 1) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return false;
    }
    await add(productId, qty);
    return true;
  };
}
