import { getToken } from './token';

const BASE = import.meta.env.VITE_API_URL || '/api';

// The services do not answer errors in the same shape:
//   { message }  /  { message, details: [{ path, message }] }  /  { error: { message } }  /  { error: "text" }
function errorMessage(data, status) {
  const nested = typeof data?.error === 'string' ? data.error : data?.error?.message;
  const base = data?.message || nested || `Request failed (${status})`;
  const detail = Array.isArray(data?.details) ? data.details[0]?.message : null;
  return detail ? `${base}: ${detail}` : base;
}

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
    const err = new Error(errorMessage(data, res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}

// Accepts [..], { items: [..] } or { data: [..] }
const toList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.data ?? []);

// user-service wraps successful answers as { success, data }
const unwrap = (d) =>
  d && typeof d === 'object' && !Array.isArray(d) && 'success' in d && 'data' in d ? d.data : d;

// Backend user: { id, email, fullName, role: 'USER' | 'ADMIN', ... } -> what the pages expect: name, role in lower case
const toUser = (u) =>
  u ? { ...u, name: u.fullName ?? u.name ?? '', role: String(u.role ?? 'user').toLowerCase() } : u;

// product-service sends price as a string ("49.99"); the pages do arithmetic with it
const withNumericPrice = (p) => (p ? { ...p, price: Number(p.price) } : p);

// ---- users ----
export const login = async (email, password) => {
  const { token, ...user } = unwrap(
    await request('/users/login', { method: 'POST', body: { email, password }, auth: false }),
  );
  return { token, user: toUser(user) };
};
export const register = async ({ name, email, password }) => {
  await request('/users/register', { method: 'POST', body: { fullName: name, email, password }, auth: false });
  return login(email, password);
};
export const me = async () => toUser(unwrap(await request('/users/me')));

// ---- products & categories ----
const SORTS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc' },
  'price-asc': { sortBy: 'price', sortOrder: 'asc' },
  'price-desc': { sortBy: 'price', sortOrder: 'desc' },
  name: { sortBy: 'name', sortOrder: 'asc' },
};

export const listCategories = async () => toList(await request('/categories', { auth: false }));

// The pages filter by a display name ("Boards"), the backend by slug ("development-boards").
let categoryCache = { at: 0, list: [] };
async function categorySlug(input) {
  if (!input) return undefined; // no filter
  if (Date.now() - categoryCache.at > 60000) {
    categoryCache = { at: Date.now(), list: await listCategories() };
  }
  const wanted = String(input).trim().toLowerCase();
  const hit =
    categoryCache.list.find((c) => c.slug?.toLowerCase() === wanted || c.name?.toLowerCase() === wanted) ??
    categoryCache.list.find((c) => c.name?.toLowerCase().includes(wanted));
  return hit ? hit.slug : null; // null = this category does not exist
}

export const searchProducts = async ({
  q,
  category,
  sort = 'newest',
  minPrice,
  maxPrice,
  inStock,
  page = 1,
  limit = 12,
} = {}) => {
  const slug = await categorySlug(category);
  if (slug === null) return { items: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const { sortBy, sortOrder } = SORTS[sort] ?? SORTS.newest;
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  if (q) params.set('search', q);
  if (slug) params.set('category', slug);
  if (minPrice !== undefined) params.set('minPrice', String(minPrice));
  if (maxPrice !== undefined) params.set('maxPrice', String(maxPrice));
  if (inStock) params.set('inStock', 'true');

  const data = await request(`/products?${params}`, { auth: false });
  const items = toList(data).map(withNumericPrice);
  return { items, pagination: data?.pagination ?? { page, limit, total: items.length, totalPages: 1 } };
};
export const listProducts = async ({ q, category } = {}) =>
  (await searchProducts({ q, category, limit: 100 })).items;
export const getProduct = async (id) =>
  withNumericPrice(await request(`/products/${encodeURIComponent(id)}`, { auth: false }));
export const getTutorialsByProduct = async (productId) =>
  toList(await request(`/tutorials/product/${encodeURIComponent(productId)}`, { auth: false }));

// ---- product admin (the backend only accepts these from an ADMIN token) ----
const toPayload = (f) => ({
  name: f.name.trim(),
  sku: f.sku.trim(),
  description: f.description.trim(),
  price: Number(f.price),
  stock: Number(f.stock),
  imageUrl: f.imageUrl.trim() || null,
  categoryId: f.categoryId || null,
});
export const createProduct = async (form) =>
  withNumericPrice(await request('/products', { method: 'POST', body: toPayload(form) }));
export const updateProduct = async (id, form) =>
  withNumericPrice(await request(`/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: toPayload(form) }));
export const deleteProduct = (id) => request(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- cart (items are enriched with their product for display) ----
export const getCart = async () => {
  const cart = await request('/cart');
  const items = cart?.items ?? [];
  const products = await Promise.all(
    items.map((i) =>
      i.product
        ? { id: i.productId, ...i.product, price: Number(i.product.price) }
        : getProduct(i.productId).catch(() => null),
    ),
  );
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