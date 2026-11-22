# Thiết kế API — mQTT

Tài liệu mô tả các API mà frontend gọi qua **API Gateway**. Nội dung được viết theo đúng code hiện tại của từng service (user, product, cart, order, payment, tutorial). Chỗ nào code chưa nhất quán hoặc chưa làm xong thì được ghi rõ ở mục [Giới hạn đã biết](#10-giới-hạn-đã-biết-và-việc-cần-làm).

## 1. Quy ước chung

### 1.1 Địa chỉ

| Môi trường | Base URL |
|---|---|
| Qua frontend (nginx) khi chạy `docker compose` local | `http://localhost:8081/api` |
| Gọi thẳng gateway (chỉ khi dùng `compose.override.yaml`) | `http://localhost:8080/api` |
| Production | `https://<tên-miền>/api` |

Frontend chỉ nói chuyện với gateway. Các service phía sau không được mở ra ngoài (chúng nằm trong mạng `backend` của Docker).

### 1.2 Gateway định tuyến theo tiền tố

| Tiền tố | Service | Cổng nội bộ |
|---|---|---|
| `/api/users` | user-service | 3001 |
| `/api/products`, `/api/categories` | product-service | 3002 |
| `/api/cart` | cart-service | 3003 |
| `/api/orders` | order-service | 3004 |
| `/api/payments` | payment-service | 3005 |
| `/api/tutorials` | tutorial-service | 3006 |

Gateway giữ nguyên đường dẫn và body, không sửa nội dung request/response. Gateway cũng nhận đường dẫn rút gọn (`/users`, `/products`, …) nhưng frontend và nginx chỉ dùng dạng `/api/...`.

### 1.3 Định dạng dữ liệu

- Request và response dùng JSON (UTF-8), header `Content-Type: application/json`.
- Thời gian theo ISO 8601 (`2026-11-15T09:30:00.000Z`).
- Mã định danh (`id`) là UUID dạng chuỗi.
- Tiền: `product.price` trả về **chuỗi** (`"49.90"`, do Decimal của Prisma); giá trong giỏ hàng, đơn hàng và thanh toán trả về **số**.

### 1.4 Xác thực và phân quyền

- Đăng nhập hoặc đăng ký để nhận JWT, gửi kèm mọi request cần quyền: `Authorization: Bearer <token>`.
- JWT ký HS256, hạn **7 ngày**, payload `{ "sub": "<userId>", "role": "USER" | "ADMIN" }`.
- Mỗi service tự kiểm tra token bằng cùng một `JWT_SECRET` (gateway không kiểm tra token).
- Cột **Quyền** trong các bảng dưới đây: `Public` (không cần token), `User` (token hợp lệ), `Admin` (token có role ADMIN).

### 1.5 Phân trang

Các API danh sách dùng `page` (từ 1) và `limit`. Kết quả có dạng:

```json
{ "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
```

Giới hạn `limit` tối đa: products 100, tutorials 100, orders 50, payments 100.

### 1.6 Định dạng lỗi

Các service hiện **chưa dùng chung một định dạng lỗi**. Frontend (`frontend/src/api/real.js`) đã chuẩn hóa tất cả về một thông báo.

| Nguồn | Dạng lỗi |
|---|---|
| user-service | `{ "success": false, "error": { "code": "USER_EXISTS", "message": "…" } }` |
| product, order, tutorial | `{ "message": "…" }`, riêng lỗi validate: `{ "message": "Validation failed", "details": [{ "path": "price", "message": "…" }] }` |
| cart-service | `{ "error": "…" }` |
| payment-service | `{ "success": false, "message": "…", "error": { "code": "…", "message": "…", "requestId": "…", "details": [] } }` |
| gateway (429, 503) | `{ "success": false, "message": "…", "error": { "code": "TOO_MANY_REQUESTS" \| "SERVICE_UNAVAILABLE", … } }` |

### 1.7 Mã trạng thái thường gặp

| Mã | Ý nghĩa |
|---|---|
| 200 / 201 / 204 | Thành công / đã tạo / thành công không có nội dung |
| 400 | Dữ liệu không hợp lệ |
| 401 | Thiếu hoặc sai token |
| 403 | Không đủ quyền (cần Admin) |
| 404 | Không tìm thấy (với dữ liệu của người khác, service trả 404 thay vì 403 để không lộ sự tồn tại) |
| 409 | Xung đột: trùng giá trị duy nhất, vượt tồn kho, sai trạng thái |
| 413 | Body quá lớn (payment-service giới hạn 10 kB) |
| 429 | Vượt giới hạn tần suất của gateway |
| 502 / 503 | Service phía sau lỗi, không phản hồi hoặc quá 10 giây |

### 1.8 Giới hạn tần suất (gateway)

Mặc định **500 request / 15 phút / IP** (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`). Khi đứng sau reverse proxy phải đặt `TRUST_PROXY` đúng số proxy (xem `architechture.md`), nếu không mọi người dùng sẽ bị tính chung một IP.

---

## 2. User Service — `/api/users`

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/users/register` | Public | Đăng ký, trả luôn token |
| POST | `/api/users/login` | Public | Đăng nhập |
| GET | `/api/users/me` | User | Hồ sơ của chính mình |
| PATCH | `/api/users/me` | User | Cập nhật hồ sơ |

### POST `/api/users/register`

```json
{ "fullName": "Nguyen Van A", "email": "a@example.com", "password": "********", "phone": "0901234567", "avatarUrl": null }
```

Bắt buộc: `fullName`, `email`, `password`. Thành công `201`:

```json
{
  "success": true,
  "data": {
    "id": "3f2b8c1e-6a4d-4e0b-9d57-1c2a3b4c5d6e",
    "email": "a@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0901234567",
    "avatarUrl": null,
    "role": "USER",
    "token": "<jwt>"
  }
}
```

Lỗi: `400 VALIDATION_ERROR` (thiếu trường), `409 USER_EXISTS` (email đã đăng ký).

### POST `/api/users/login`

Body `{ "email", "password" }`. Thành công `200` có cùng cấu trúc `data` như đăng ký. Lỗi: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

### GET `/api/users/me`

`200` → `{ "success": true, "data": { id, email, fullName, phone, avatarUrl, role, … } }`. Lỗi: `401`, `404 USER_NOT_FOUND`.

### PATCH `/api/users/me`

Body (tùy chọn từng trường): `fullName`, `phone`, `avatarUrl`. Không thể đổi `email`, `role` qua API này. `200` → `{ "success": true, "data": <user> }`.

---

## 3. Product Service — `/api/products`, `/api/categories`

### 3.1 Sản phẩm

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/products` | Public | Danh sách, lọc, sắp xếp, phân trang |
| GET | `/api/products/:id` | Public | Chi tiết |
| POST | `/api/products` | Admin | Tạo |
| PATCH | `/api/products/:id` | Admin | Sửa một phần |
| DELETE | `/api/products/:id` | Admin | Xóa (`204`) |

**Query của danh sách**

| Tham số | Mặc định | Ghi chú |
|---|---|---|
| `page` | 1 | ≥ 1 |
| `limit` | 20 | 1–100 |
| `search` | — | Tìm trong tên, SKU, mô tả (không phân biệt hoa thường) |
| `category` | — | **Slug** (`development-boards`) hoặc UUID của danh mục |
| `minPrice`, `maxPrice` | — | Số ≥ 0 |
| `inStock` | — | `true` (còn hàng) hoặc `false` (hết hàng) |
| `sortBy` | `createdAt` | `createdAt`, `name`, `price`, `stock` |
| `sortOrder` | `desc` | `asc`, `desc` |

**Response danh sách** (`data` và `items` giống hệt nhau, giữ cả hai để tương thích frontend):

```json
{
  "data": [ { "id": "…", "name": "ESP32 Development Board", "slug": "esp32-development-board",
              "sku": "ESP32-DEVKIT", "description": "…", "price": "199000.00", "stock": 25,
              "imageUrl": "https://…", "categoryId": "…",
              "category": { "id": "…", "name": "Development Boards", "slug": "development-boards" },
              "createdAt": "…", "updatedAt": "…" } ],
  "items": [ "…giống data…" ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

**Body tạo sản phẩm** (`POST`): 

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| `name` | có | 1–180 ký tự |
| `sku` | có | 1–80 ký tự, tự chuyển chữ HOA, duy nhất |
| `price` | có | Số > 0 |
| `stock` | không | Số nguyên ≥ 0, mặc định 0 |
| `description` | không | Tối đa 5000 ký tự |
| `imageUrl` | không | URL hợp lệ hoặc `null`/rỗng |
| `categoryId` | không | UUID danh mục có tồn tại, hoặc `null` |
| `slug` | không | Mặc định sinh từ `name` |

`PATCH` nhận các trường trên (đều tùy chọn) và yêu cầu ít nhất một trường.

Lỗi: `400` (validate, danh mục không tồn tại), `404 Product was not found`, `409` (trùng SKU hoặc slug).

### 3.2 Danh mục

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/categories` | Public | Mảng danh mục kèm `productCount` |
| GET | `/api/categories/:id` | Public | Chi tiết |
| POST | `/api/categories` | Admin | Tạo `{ name, slug?, description? }` |
| PATCH | `/api/categories/:id` | Admin | Sửa |
| DELETE | `/api/categories/:id` | Admin | Xóa (sản phẩm thuộc danh mục được đặt `categoryId = null`) |

---

## 4. Cart Service — `/api/cart`

Tất cả endpoint cần token (`User`). Mỗi người dùng có đúng một giỏ hàng, tự tạo khi thêm sản phẩm đầu tiên. Giá và tên sản phẩm luôn được lấy mới từ product-service khi đọc giỏ.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart/items` | Thêm sản phẩm (cộng dồn nếu đã có) |
| PATCH | `/api/cart/items/:itemId` | Đặt lại số lượng |
| DELETE | `/api/cart/items/:itemId` | Xóa một dòng, trả về giỏ hàng mới |
| DELETE | `/api/cart` | Xóa toàn bộ (`204`) |

**Body thêm:** `{ "productId": "<id>", "quantity": 2 }` (`quantity` nguyên 1–999). **Body sửa:** `{ "quantity": 3 }`.

**Response giỏ hàng** (GET và mọi thao tác thêm/sửa/xóa dòng):

```json
{
  "id": "…",
  "items": [
    {
      "id": "<itemId>",
      "productId": "…",
      "quantity": 2,
      "product": { "id": "…", "name": "ESP32 Development Board", "price": 199000, "stock": 25,
                   "imageUrl": "https://…", "category": { "name": "Development Boards" } },
      "subtotal": 398000
    }
  ],
  "total": 398000
}
```

Lỗi: `400` (body sai), `404 Product not found` / `Cart item not found`, `409 Requested quantity exceeds available stock`, `502 Product service is unavailable`. Sản phẩm đã bị xóa khỏi hệ thống sẽ bị bỏ qua khi đọc giỏ, không làm hỏng cả giỏ.

---

## 5. Order Service — `/api/orders`

Tất cả endpoint cần token. Người dùng chỉ thấy đơn của chính mình.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/orders` | Đặt hàng từ giỏ hiện tại (checkout) |
| GET | `/api/orders` | Danh sách đơn của tôi |
| GET | `/api/orders/:id` | Chi tiết một đơn |
| PATCH | `/api/orders/:id/cancel` | Hủy đơn |

### POST `/api/orders`

Body: thông tin giao hàng.

| Trường | Quy tắc |
|---|---|
| `shippingName` | 1–100 ký tự |
| `shippingPhone` | 8–20 ký tự |
| `shippingAddress` | 5–255 ký tự |

Tiến trình xử lý (xem sơ đồ trong `architechture.md`): đọc giỏ hàng → kiểm tra từng sản phẩm (còn tồn tại, đủ tồn kho) và chụp lại giá → tạo đơn `PENDING` → gọi payment-service → cập nhật `PAID` hoặc `PAYMENT_FAILED` → nếu thanh toán thành công thì xóa giỏ hàng.

`201` trả về đơn hàng đã cập nhật (kể cả khi thanh toán thất bại, lúc đó `status = "PAYMENT_FAILED"`):

```json
{
  "id": "…", "userId": "…", "status": "PAID", "totalAmount": 398000,
  "shippingName": "Nguyen Van A", "shippingPhone": "0901234567", "shippingAddress": "1 Dai Co Viet, Ha Noi",
  "paymentId": "…",
  "items": [ { "id": "…", "orderId": "…", "productId": "…", "productName": "ESP32 Development Board",
               "imageUrl": "https://…", "unitPrice": 199000, "quantity": 2 } ],
  "createdAt": "…", "updatedAt": "…"
}
```

Lỗi: `400 Cart is empty`, `400 Product <id> no longer exists`, `409 Not enough stock for "<tên>"`, `401`, `502/503` khi cart hoặc product service không phản hồi.

### GET `/api/orders`

Query: `page` (1), `limit` (10, tối đa 50), `status` (một trong các trạng thái bên dưới). Response `{ "data": [<order>], "pagination": { … } }`, sắp xếp mới nhất trước.

### PATCH `/api/orders/:id/cancel`

Chỉ hủy được đơn ở trạng thái `PENDING`, `PAYMENT_FAILED`, `PAID`; trạng thái khác trả `409`. **Hiện chưa hoàn tiền** khi hủy đơn đã thanh toán (xem mục 10).

### Trạng thái đơn hàng

| Trạng thái | Ý nghĩa |
|---|---|
| `PENDING` | Vừa tạo, đang chờ kết quả thanh toán |
| `PAID` | Thanh toán thành công |
| `PAYMENT_FAILED` | Thanh toán thất bại hoặc payment-service không phản hồi |
| `CANCELLED` | Đã hủy |
| `SHIPPED`, `DELIVERED` | Có trong enum nhưng chưa có API nào chuyển sang các trạng thái này |

---

## 6. Payment Service — `/api/payments`

Thanh toán **mô phỏng**: không gọi ngân hàng hay cổng thanh toán nào, một "ngân hàng giả" quyết định thành công/thất bại. Mỗi lần thử được lưu trong DB riêng của service.

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/payments` | User | Tạo một lần thanh toán |
| GET | `/api/payments` | User (của mình) / Admin (tất cả) | Danh sách, lọc theo `orderId`, `limit`, `offset` |
| GET | `/api/payments/:id` | Chủ sở hữu / Admin | Chi tiết (người khác nhận 404) |
| POST | `/api/payments/:id/refund` | Admin | Hoàn tiền (`SUCCESS` → `REFUNDED`) |

### POST `/api/payments`

Body: `{ "orderId": "<id>", "amount": 398000 }`. Chỉ nhận hai trường này, trường lạ bị từ chối (`400`). `orderId` gồm chữ, số, `-`, `_` (1–64 ký tự); `amount` > 0, tối đa 2 chữ số thập phân.

Header tùy chọn `Idempotency-Key` (8–100 ký tự): gửi lại cùng request với cùng khóa sẽ nhận đúng kết quả cũ, không tính tiền hai lần. Cùng khóa nhưng khác nội dung → `409 IDEMPOTENCY_KEY_REUSED`.

Response là **chính đối tượng thanh toán** (không bọc `{ success, data }`):

```json
{ "id": "…", "orderId": "…", "userId": "…", "amount": 398000,
  "status": "SUCCESS", "provider": "demo", "failureReason": null,
  "refundedAt": null, "createdAt": "…" }
```

- `201` khi tạo bản ghi mới; `200` khi trả lại kết quả đã có (replay hoặc đơn đã thanh toán đúng số tiền).
- `status` là `SUCCESS` hoặc `FAILED`. Thanh toán bị từ chối vẫn trả `201` kèm `status: "FAILED"` và `failureReason`.
- Mỗi đơn chỉ thanh toán thành công một lần. Thử lại sau khi `FAILED` thì được. Đơn đã `SUCCESS` với số tiền khác hoặc của người khác → `409 ORDER_ALREADY_PAID`.

### Chế độ demo (biến môi trường của payment-service)

| Biến | Mặc định | Tác dụng |
|---|---|---|
| `PAYMENT_DEMO_DELAY_MS` | 300 | Độ trễ giả lập của ngân hàng |
| `PAYMENT_DEMO_FAIL_RATE` | 0 | Xác suất từ chối ngẫu nhiên (0–1) |
| `PAYMENT_DEMO_MAX_AMOUNT` | trống | Từ chối mọi khoản vượt mức này (`AMOUNT_LIMIT_EXCEEDED`) |

### GET `/api/payments`

Query: `orderId`, `limit` (20, tối đa 100), `offset` (0). Tham số trùng lặp (`?orderId=a&orderId=b`) bị từ chối. Response `{ "data": [<payment>], "pagination": { "total", "limit", "offset" } }`.

### POST `/api/payments/:id/refund`

Chỉ Admin. Hoàn tiền cho thanh toán `SUCCESS`, gọi lại là an toàn (đã `REFUNDED` thì trả lại như cũ). Thanh toán không ở trạng thái `SUCCESS` → `409 PAYMENT_NOT_REFUNDABLE`.

---

## 7. Tutorial Service — `/api/tutorials`

Bài hướng dẫn kỹ thuật IoT, có thể gắn với một sản phẩm. Các endpoint đọc là công khai và **chỉ trả bài đã xuất bản** (`isPublished = true`).

| Method | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/tutorials` | Public | Danh sách bài đã xuất bản |
| GET | `/api/tutorials/product/:productId` | Public | Bài hướng dẫn của một sản phẩm |
| GET | `/api/tutorials/slug/:slug` | Public | Theo slug |
| GET | `/api/tutorials/:id` | Public | Theo id |
| POST | `/api/tutorials` | Admin | Tạo |
| PATCH | `/api/tutorials/:id` | Admin | Sửa một phần |
| DELETE | `/api/tutorials/:id` | Admin | Xóa (`204`) |

**Query danh sách:** `page` (1), `limit` (20, tối đa 100), `search`, `productId` (UUID), `category`, `difficulty` (`Beginner` / `Intermediate` / `Advanced`), `sortBy` (`createdAt`, `title`, `readTime`, `updatedAt`; mặc định `createdAt`), `sortOrder` (`desc`). Response `{ "data", "items", "pagination" }` giống sản phẩm.

**Đối tượng bài hướng dẫn:**

```json
{
  "id": "…", "title": "Đọc cảm biến DHT22 bằng ESP32", "slug": "doc-cam-bien-dht22-bang-esp32",
  "excerpt": "…", "content": "…nội dung đầy đủ…", "imageUrl": null, "videoUrl": null,
  "productId": "…", "category": "Sensors", "difficulty": "Beginner", "readTime": 8,
  "isPublished": true, "authorName": "mQTT Team", "createdAt": "…", "updatedAt": "…"
}
```

**Body tạo:** bắt buộc `title` (≤ 180) và `content` (≤ 200000); tùy chọn `slug`, `excerpt` (≤ 1200), `imageUrl`, `videoUrl`, `productId`, `category`, `difficulty`, `readTime` (0–180 phút), `isPublished` (mặc định `false`), `authorName`. Lỗi: `400`, `404 Tutorial was not found`, `409` (trùng slug).

---

## 8. Endpoint vận hành

| Đường dẫn | Dịch vụ | Mục đích |
|---|---|---|
| `GET /health` | mọi service và gateway | Liveness, trả `{ "status": "ok" }` |
| `GET /ready` | gateway, product, tutorial, payment | Readiness (kiểm tra kết nối DB) |
| `GET /services/health` | gateway | Gom trạng thái của cả 6 service (`UP` / `DEGRADED` / `DOWN`), trả `207` nếu có service lỗi |
| `GET /` | gateway | Thông tin gateway và danh sách service |

Các endpoint này **không nằm dưới `/api`** nên nginx của frontend không chuyển tiếp chúng ra Internet. Chỉ truy cập được từ trong mạng Docker, hoặc qua cổng 8080 khi chạy local với `compose.override.yaml`. Không được publish cổng gateway trên server production.

---

## 9. Bảng phân quyền tổng hợp

| Tài nguyên | Public | User | Admin |
|---|---|---|---|
| Đăng ký, đăng nhập | ✔ | | |
| Hồ sơ cá nhân (`/users/me`) | | ✔ | ✔ |
| Xem sản phẩm, danh mục, bài hướng dẫn đã xuất bản | ✔ | ✔ | ✔ |
| Tạo, sửa, xóa sản phẩm, danh mục, bài hướng dẫn | | | ✔ |
| Giỏ hàng | | ✔ (của mình) | ✔ (của mình) |
| Đặt hàng, xem, hủy đơn | | ✔ (của mình) | ✔ (của mình)* |
| Tạo thanh toán, xem thanh toán | | ✔ (của mình) | ✔ (tất cả) |
| Hoàn tiền | | | ✔ |

\* Thiết kế cho phép Admin xem mọi đơn qua `GET /api/orders/:id`, nhưng xem mục 10.

## 10. Giới hạn đã biết và việc cần làm

Danh sách này phản ánh đúng code hiện tại, để báo cáo và các bước sau bám theo.

1. **Định dạng lỗi chưa thống nhất** (mục 1.6). Nên chốt một chuẩn, ví dụ `{ success, message, error: { code, message, details } }` như payment-service.
2. **Kiểu dữ liệu tiền chưa thống nhất:** `product.price` là chuỗi, nơi khác là số.
3. **Admin chưa xem được đơn của người khác:** token mang `role: "ADMIN"` (chữ hoa) nhưng order-service so sánh với `'admin'`. Sửa bằng cách chuẩn hóa chữ thường trong `order-service/src/middlewares/auth.js`. Hiện cũng chưa có API liệt kê toàn bộ đơn cho Admin.
4. **Hủy đơn đã thanh toán chưa hoàn tiền** (có `TODO` trong order-service). Cần order-service gọi `POST /api/payments/:id/refund`.
5. **Tồn kho không bị trừ khi đặt hàng** và chưa có endpoint trừ kho trong product-service.
6. **`POST /api/payments` mở công khai qua gateway:** bất kỳ người dùng đăng nhập nào cũng gọi được, không chỉ order-service. Nên dùng khóa nội bộ giữa các service hoặc không route endpoint này ra ngoài.
7. **Chưa có API admin để xem bài hướng dẫn chưa xuất bản** (các GET chỉ trả bài đã xuất bản).
8. **Trạng thái `SHIPPED` và `DELIVERED`** chưa có API chuyển trạng thái.
9. **Chưa có `/api/v1`:** API chưa đánh phiên bản. Chưa có tài liệu OpenAPI, nên bổ sung để dùng với Swagger UI và Postman.