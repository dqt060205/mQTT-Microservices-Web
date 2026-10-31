# mQTT Frontend

Single-page app (React 18 + Vite + React Router) with an Amazon-style storefront: search, categories, product pages with tutorials, cart, checkout and order history.

Page changes never reload the browser; only data is fetched from the API.

## Run

```bash
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

### Two modes (`VITE_USE_MOCK` in `.env`)

| Value | Behaviour |
|---|---|
| `true` | Everything runs in the browser (localStorage). Demo login: `demo@mqtt.dev` / `demo1234`. Use it to develop the UI before the services exist. |
| `false` | Calls the real API at `/api/*`. In dev, Vite proxies it to `VITE_GATEWAY_URL` (default `http://localhost:8080`). |

Both modes implement the same functions (`src/api/real.js` and `src/api/mock.js`), so no page changes when you switch.

## Routes

| Path | Page | Login needed |
|---|---|---|
| `/` | Home, search and category results (`?q=` and `?category=`) | No |
| `/products/:id` | Product details, buy box, tutorials | No (adding to cart asks to sign in) |
| `/cart` | Cart | Yes |
| `/checkout` | Shipping details and place order | Yes |
| `/orders` | Order history and cancel | Yes |
| `/login` | Sign in / create account | No |

## API the real mode expects (through the gateway)

| Used for | Request |
|---|---|
| Login / register | `POST /users/login` -> `{ token, user? }`, `POST /users/register`, `GET /users/me` |
| Products | `GET /products?search=&category=`, `GET /products/:id` (fields: `id, name, price, stock, category, description?, imageUrl?, rating?`) |
| Tutorials | `GET /tutorials/product/:productId` |
| Cart | `GET /cart`, `POST /cart/items {productId, quantity}`, `PATCH /cart/items/:itemId {quantity}`, `DELETE /cart/items/:itemId` |
| Orders | `POST /orders {shippingName, shippingPhone, shippingAddress}`, `GET /orders`, `PATCH /orders/:id/cancel` |

List endpoints may return an array, `{ items }` or `{ data }`. If your product-service uses other query names than `search` / `category`, change `listProducts` in `src/api/real.js`.

## Docker

`Dockerfile` builds the app and serves it with nginx (`nginx.conf` falls back to `index.html` for SPA routes and proxies `/api/` to `http://api-gateway:8080`). Build with `VITE_USE_MOCK` unset or `false`.

## Structure

```
src/
├── main.jsx  App.jsx  styles.css
├── api/        real.js  mock.js  index.js  token.js
├── context/    AuthContext.jsx  CartContext.jsx
├── components/ Header  ProductCard  ProductImage  AddToCartButton
├── pages/      Home  ProductDetail  Cart  Checkout  Orders  Login
└── utils/      format.js
```

Prices are shown in VND (`src/utils/format.js`). All UI text is English.
