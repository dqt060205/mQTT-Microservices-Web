# mQTT API Gateway

API Gateway là cổng giao tiếp duy nhất (**Single Point of Entry**) kết nối giữa Client / Frontend (React/Vite) và toàn bộ 6 dịch vụ nghiệp vụ (**Microservices**) trong hệ sinh thái của dự án **mQTT**.

Gateway chịu trách nhiệm định tuyến thông minh, xử lý CORS preflight, hỗ trợ bảo mật HTTP header, bảo vệ hệ thống bằng Rate Limiting, chuẩn hóa log và cung cấp công cụ kiểm tra sức khỏe tổng hợp của toàn bộ các dịch vụ backend.

---

## 1. Kiến trúc hệ thống & Bảng định tuyến 6 Microservices

```text
               +-------------------------------------------------+
               |              React Frontend (Vite)              |
               |             (http://localhost:5173)             |
               +------------------------+------------------------+
                                        |  REST API (/api/*)
               +------------------------v------------------------+
               |                  API Gateway                    |
               |            (http://localhost:8080)              |
               |                                                 |
               |  - Reverse Proxy (Direct Stream)                |
               |  - CORS & Preflight (Idempotency-Key support)   |
               |  - Rate Limiting (500 req / 15m)                |
               |  - Health Monitoring (/services/health)         |
               +---+---------+---------+---------+---------+-----+
                   |         |         |         |         |
      +------------+   +-----+---+   +-+-----+   +----+----+ +---+---------+
      |                |         |           |        |                |
      v                v         v           v        v                v
    User            Product     Cart       Order   Payment          Tutorial
   Service          Service    Service    Service  Service          Service
   (:3001)          (:3002)    (:3003)    (:3004)  (:3005)          (:3006)
```

### Bảng định tuyến chi tiết

| Microservice | Đường dẫn Gateway tiếp nhận | Target Service Mặc định | Chức năng chính |
|---|---|---|---|
| **User Service** | `/api/users/*`<br>`/users/*` | `http://localhost:3001` | Đăng ký, đăng nhập, hồ sơ người dùng (`GET /api/users/me`), phân quyền JWT |
| **Product Service** | `/api/products/*`<br>`/products/*`<br>`/api/categories/*`<br>`/categories/*` | `http://localhost:3002` | Quản lý thiết bị IoT, tìm kiếm, lọc sản phẩm và danh mục |
| **Cart Service** | `/api/cart/*`<br>`/cart/*` | `http://localhost:3003` | Quản lý giỏ hàng người dùng (`GET`, `POST /items`, `DELETE`) |
| **Order Service** | `/api/orders/*`<br>`/orders/*` | `http://localhost:3004` | Tạo đơn hàng từ giỏ hàng, tra cứu lịch sử, hủy đơn |
| **Payment Service** | `/api/payments/*`<br>`/payments/*` | `http://localhost:3005` | Khởi tạo thanh toán mô phỏng (hỗ trợ `Idempotency-Key`), tra cứu giao dịch, hoàn tiền |
| **Tutorial Service** | `/api/tutorials/*`<br>`/tutorials/*` | `http://localhost:3006` | Bài viết hướng dẫn kỹ thuật IoT, tra cứu theo sản phẩm (`/product/:productId`) |

> **Cơ chế Reverse Proxy Stream**: Gateway giữ nguyên luồng request body và header `Authorization: Bearer <jwt>`, không parse body trước khi proxy để tránh nghẽn luồng upload hoặc payload lớn. Tự động hỗ trợ cả đường dẫn chuẩn `/api/...` lẫn đường dẫn rút gọn không có `/api` (tự động rewrite).

---

## 2. Các Endpoint tích hợp sẵn của Gateway

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Trả về metadata của Gateway, môi trường hoạt động và danh sách 6 microservices đã đăng ký. |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động của API Gateway (Liveness probe cho Docker/Kubernetes). |
| `GET` | `/ready` | Kiểm tra Gateway sẵn sàng tiếp nhận request (Readiness probe). |
| `GET` | `/services/health` | **Kiểm tra sức khỏe đồng thời**: Gửi request song song đến endpoint `/health` của cả 6 backend services, đo lường độ trễ (latency ms) và báo cáo trạng thái `UP` / `DOWN`. |

Ví dụ phản hồi từ `GET /services/health`:
```json
{
  "gateway": "ok",
  "timestamp": "2026-11-15T13:54:19.789Z",
  "services": [
    { "id": "user-service", "name": "User Service", "url": "http://localhost:3001", "status": "UP", "latencyMs": 8 },
    { "id": "product-service", "name": "Product Service", "url": "http://localhost:3002", "status": "UP", "latencyMs": 6 },
    { "id": "cart-service", "name": "Cart Service", "url": "http://localhost:3003", "status": "UP", "latencyMs": 9 },
    { "id": "order-service", "name": "Order Service", "url": "http://localhost:3004", "status": "UP", "latencyMs": 7 },
    { "id": "payment-service", "name": "Payment Service", "url": "http://localhost:3005", "status": "UP", "latencyMs": 5 },
    { "id": "tutorial-service", "name": "Tutorial Service", "url": "http://localhost:3006", "status": "UP", "latencyMs": 8 }
  ]
}
```

---

## 3. Biến môi trường (`.env`)

Sao chép file `.env.example` thành `.env` để sử dụng:

```bash
cp .env.example .env
```

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8080` | Cổng lắng nghe của API Gateway |
| `NODE_ENV` | `development` | Môi trường (`development` hoặc `production`) |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:3000` | Danh sách origin cho phép gọi CORS (hỗ trợ credentials) |
| `PROXY_TIMEOUT_MS` | `10000` | Thời gian timeout khi proxy kết nối tới microservice (ms) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Khung thời gian giới hạn request (15 phút) |
| `RATE_LIMIT_MAX` | `500` | Số lượng request tối đa trên mỗi IP trong 1 khung thời gian |
| `USER_SERVICE_URL` | `http://localhost:3001` | URL dịch vụ User Service |
| `PRODUCT_SERVICE_URL` | `http://localhost:3002` | URL dịch vụ Product Service |
| `CART_SERVICE_URL` | `http://localhost:3003` | URL dịch vụ Cart Service |
| `ORDER_SERVICE_URL` | `http://localhost:3004` | URL dịch vụ Order Service |
| `PAYMENT_SERVICE_URL` | `http://localhost:3005` | URL dịch vụ Payment Service |
| `TUTORIAL_SERVICE_URL` | `http://localhost:3006` | URL dịch vụ Tutorial Service |

---

## 4. Tài liệu kiểm tra (Testing Guide & Checklist)

### 4.1 Chạy bộ kiểm thử tự động của Gateway
Bộ test sử dụng Node.js test runner tích hợp (`node --test`), kiểm tra tự động **13 kịch bản**:

```bash
cd api-gateway
npm test
```

Danh sách 13 kịch bản kiểm thử:
1. `GET /`: Trả về metadata và đủ 6 microservices đã đăng ký.
2. `GET /health`: Phản hồi `status: 'ok'` (HTTP 200).
3. `GET /ready`: Phản hồi `status: 'ready'` (HTTP 200).
4. `GET /services/health`: Ping đồng thời kiểm tra sức khỏe 6 microservices backend.
5. `GET /not-exist-route`: Bắt lỗi và trả về chuẩn JSON `404 ROUTE_NOT_FOUND` kèm `message`.
6. Proxy `user-service`: Chuyển tiếp `/api/users/*` kèm header `Authorization: Bearer <token>`.
7. Proxy `product-service`: Chuyển tiếp `/api/products` và `/categories`.
8. Proxy `cart-service`: Chuyển tiếp `/api/cart`.
9. Proxy `order-service`: Chuyển tiếp `/api/orders`.
10. Proxy `payment-service`: Chuyển tiếp `/api/payments` kèm header `Idempotency-Key` và POST body.
11. Proxy `tutorial-service`: Chuyển tiếp `/api/tutorials/product/:productId`.
12. CORS preflight `OPTIONS`: Kiểm tra headers cho phép `Idempotency-Key`, `Authorization`, v.v.
13. Bắt lỗi khi service đích offline: Trả về HTTP `503 SERVICE_UNAVAILABLE` có cấu trúc JSON và thông báo thân thiện.

### 4.2 Kịch bản kiểm tra thủ công bằng cURL / Postman

- **Kiểm tra Gateway tổng quan**:
  ```bash
  curl http://localhost:8080/
  curl http://localhost:8080/health
  curl http://localhost:8080/services/health
  ```
- **Kiểm tra định tuyến User Service**:
  ```bash
  curl -X POST http://localhost:8080/api/users/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"password\":\"123456\"}"
  ```
- **Kiểm tra định tuyến Product Service**:
  ```bash
  curl http://localhost:8080/api/products
  curl http://localhost:8080/api/categories
  ```
- **Kiểm tra định tuyến Tutorial Service**:
  ```bash
  curl http://localhost:8080/api/tutorials
  ```

---

## 5. Hướng dẫn chạy Demo trên Local (Local Run Guide)

### Cách 1: Chạy Demo nhanh (Quick Demo với Frontend Mock)
Frontend của mQTT đã được tích hợp sẵn chế độ Mock dữ liệu hoàn chỉnh, không cần kết nối cơ sở dữ liệu PostgreSQL:

1. Di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Đảm bảo file `frontend/.env` có:
   ```env
   VITE_USE_MOCK=true
   ```
3. Khởi chạy frontend:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại `http://localhost:5173` để trải nghiệm toàn bộ giao diện: xem thiết bị IoT, giỏ hàng, đặt hàng, trang Admin.

---

### Cách 2: Chạy Demo toàn diện (Full Microservices Stack qua API Gateway)

#### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL
Bạn có thể chạy nhanh một PostgreSQL container cho tất cả các service:
```bash
docker run --name mqtt-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16-alpine
```

Tạo các database tương ứng:
```bash
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE user_db;"
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE product_db;"
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE cart_db;"
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE order_db;"
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE payment_db;"
docker exec -it mqtt-postgres psql -U postgres -c "CREATE DATABASE tutorial_db;"
```

#### Bước 2: Chuẩn bị và khởi chạy các Microservices
Mỗi dịch vụ cần cài đặt thư viện, cập nhật `.env` và chạy migrate database:

| Thứ tự | Thư mục | Lệnh khởi chạy | Cổng |
|---|---|---|---|
| 1 | `services/user-service` | `npm install`<br>`npx prisma migrate dev`<br>`npm run dev` | `3001` |
| 2 | `services/product-service` | `npm install`<br>`npm run prisma:generate`<br>`npm run prisma:migrate`<br>`npm run prisma:seed`<br>`npm run dev` | `3002` |
| 3 | `services/cart-service` | `npm install`<br>`npx prisma migrate dev`<br>`npm run dev` | `3003` |
| 4 | `services/order-service` | `npm install`<br>`npx prisma migrate dev`<br>`npm run dev` | `3004` |
| 5 | `services/payment-service` | `npm install`<br>`npx prisma migrate dev`<br>`npm run dev` | `3005` |
| 6 | `services/tutorial-service` | `npm install`<br>`npx prisma migrate dev`<br>`npm run dev` | `3006` |

> *Lưu ý: Tất cả các dịch vụ phải dùng chung một chuỗi bí mật `JWT_SECRET` trong file `.env` (ví dụ: `JWT_SECRET=mqtt-shared-secret-key-2026`).*

#### Bước 3: Khởi chạy API Gateway (Port 8080)
```bash
cd api-gateway
npm install
npm run dev
```
Truy cập `http://localhost:8080/services/health` để xác nhận tất cả 6 dịch vụ đã sẵn sàng (`UP`).

#### Bước 4: Chạy Frontend kết nối API Gateway
Trong file `frontend/.env`:
```env
VITE_USE_MOCK=false
VITE_GATEWAY_URL=http://localhost:8080
```
Khởi động Frontend:
```bash
cd frontend
npm run dev
```
Trình duyệt tại `http://localhost:5173` sẽ gửi mọi request `/api/*` qua API Gateway tại cổng `8080`.

---

### Cách 3: Chạy toàn bộ hệ thống bằng Docker Compose

Mẫu file cấu hình `compose.yaml`:

```yaml
services:
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    container_name: mqtt-api-gateway
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - NODE_ENV=production
      - CORS_ORIGIN=http://localhost:5173,http://localhost:3000
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
      - CART_SERVICE_URL=http://cart-service:3003
      - ORDER_SERVICE_URL=http://order-service:3004
      - PAYMENT_SERVICE_URL=http://payment-service:3005
      - TUTORIAL_SERVICE_URL=http://tutorial-service:3006
    depends_on:
      - user-service
      - product-service
      - cart-service
      - order-service
      - payment-service
      - tutorial-service
    restart: unless-stopped
```

Chạy toàn bộ bằng lệnh:
```bash
docker compose up --build
```
