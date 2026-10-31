import { getToken } from './token';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check that the API gateway is running.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Accepts [..], { items: [..] } or { data: [..] }
const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.data ?? []);

// ---- users ----
export const login = (email, password) =>
  request('/users/login', { method: 'POST', body: { email, password }, auth: false }); // -> { token, user? }
export const register = async ({ name, email, password }) => {
  await request('/users/register', { method: 'POST', body: { name, email, password }, auth: false });
  return login(email, password);
};
export const me = () => request('/users/me');

// ---- products & tutorials ----
export const listProducts = async ({ q, category } = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (category) params.set('category', category);
  return toList(await request(`/products?${params}`, { auth: false }));
};
export const getProduct = (id) => request(`/products/${encodeURIComponent(id)}`, { auth: false });
export const getTutorialsByProduct = async (productId) =>
  toList(await request(`/tutorials/product/${encodeURIComponent(productId)}`, { auth: false }));

// ---- cart (items are enriched with their product for display) ----
export const getCart = async () => {
  const cart = await request('/cart');
  const items = cart?.items ?? [];
  const products = await Promise.all(items.map((i) => i.product ?? getProduct(i.productId).catch(() => null)));
  return items.map((i, idx) => ({ ...i, product: products[idx] })).filter((i) => i.product);
};
export const addCartItem = (productId, quantity = 1) =>
  request('/cart/items', { method: 'POST', body: { productId, quantity } });
export const updateCartItem = (itemId, quantity) =>
  request(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
export const removeCartItem = (itemId) => request(`/cart/items/${itemId}`, { method: 'DELETE' });

// ---- orders (order-service) ----
export const createOrder = (shipping) => request('/orders', { method: 'POST', body: shipping });
export const listOrders = async () => toList(await request('/orders?limit=50'));
export const cancelOrder = (id) => request(`/orders/${id}/cancel`, { method: 'PATCH' });
