# Product Service

Microservice quản lý thiết bị, linh kiện IoT và danh mục sản phẩm trong nền tảng **mQTT**. Dữ liệu được quản lý trong cơ sở dữ liệu PostgreSQL riêng (`product_db`), cung cấp RESTful API cho Frontend, Cart Service và Order Service.

- Node.js 20+, Express, Prisma + PostgreSQL, Zod, JWT
- Cổng mặc định: `3002`
- API xem dữ liệu (`GET`) hoàn toàn public, không yêu cầu xác thực.
- Các API ghi dữ liệu (`POST`, `PATCH`, `DELETE`) yêu cầu header `Authorization: Bearer <jwt>` với quyền `admin` (`role === 'admin'` hoặc `roles: ['admin']`), dùng chung `JWT_SECRET` với `user-service`.
- Cung cấp hợp đồng dữ liệu chuẩn `GET /api/products/:id` trả về `{ id, name, price, stock, imageUrl, ... }` để Cart Service và Order Service tích hợp trực tiếp.

---

## 1. API Endpoints

### 1.1 Endpoint hệ thống

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Public | Liveness check (không gọi DB) |
| GET | `/ready` | Public | Readiness check (kiểm tra kết nối PostgreSQL) |

### 1.2 Endpoint sản phẩm

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/products` | Public | Danh sách sản phẩm (hỗ trợ phân trang, tìm kiếm, lọc danh mục/giá/tồn kho) |
| GET | `/api/products/:id` | Public | Chi tiết 1 sản phẩm theo ID hoặc UUID |
| POST | `/api/products` | Admin | Tạo sản phẩm mới |
| PATCH | `/api/products/:id` | Admin | Cập nhật thông tin sản phẩm |
| DELETE | `/api/products/:id` | Admin | Xóa sản phẩm |

### 1.3 Endpoint danh mục

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/categories` | Public | Danh sách tất cả danh mục kèm số lượng sản phẩm (`productCount`) |
| GET | `/api/categories/:id` | Public | Chi tiết danh mục theo ID |
| POST | `/api/categories` | Admin | Tạo danh mục mới |
| PATCH | `/api/categories/:id` | Admin | Cập nhật danh mục |
| DELETE | `/api/categories/:id` | Admin | Xóa danh mục rỗng (báo lỗi 409 nếu còn sản phẩm) |

---

## 2. Dữ liệu mẫu (Request & Response)

### GET `/api/products`
Query parameters hỗ trợ:
`page`, `limit`, `search`, `category` (UUID hoặc slug), `minPrice`, `maxPrice`, `inStock` (`true`/`false`), `sortBy` (`createdAt`, `name`, `price`, `stock`), `sortOrder` (`asc`, `desc`).

Response:
```json
{
  "data": [
    {
      "id": "d946248e-752f-433d-81a7-a243350d27d3",
      "name": "ESP32 Development Board",
      "slug": "esp32-development-board",
      "sku": "MQTT-ESP32-001",
      "description": "Dual-core Wi-Fi and Bluetooth development board",
      "price": "12.90",
      "stock": 50,
      "imageUrl": "https://images.example.com/products/esp32.jpg",
      "categoryId": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd",
      "category": {
        "id": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd",
        "name": "Development Boards",
        "slug": "development-boards"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET `/api/products/:id`
```json
{
  "id": "d946248e-752f-433d-81a7-a243350d27d3",
  "name": "ESP32 Development Board",
  "slug": "esp32-development-board",
  "sku": "MQTT-ESP32-001",
  "description": "Dual-core Wi-Fi and Bluetooth development board",
  "price": "12.90",
  "stock": 50,
  "imageUrl": "https://images.example.com/products/esp32.jpg",
  "categoryId": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd",
  "category": {
    "id": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd",
    "name": "Development Boards",
    "slug": "development-boards"
  }
}
```

### POST `/api/products` (Yêu cầu Admin JWT)
Body:
```json
{
  "name": "ESP32 Development Board",
  "sku": "mqtt-esp32-001",
  "price": 12.90,
  "stock": 50,
  "imageUrl": "https://images.example.com/products/esp32.jpg",
  "categoryId": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd"
}
```
*Ghi chú: Trường `slug` sẽ được tự động tạo từ `name` (hỗ trợ cả tiếng Việt có dấu, ví dụ: "Cảm biến Nhiệt độ" $\rightarrow$ "cam-bien-nhiet-do"). Mã `sku` tự động chuyển thành chữ in hoa.*

---

## 3. Cấu trúc thư mục

```text
product-service/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/
│   │   └── env.js            # Cấu hình biến môi trường
│   ├── controllers/
│   │   ├── category.controller.js
│   │   └── product.controller.js
│   ├── lib/
│   │   ├── errors.js         # Lớp AppError chuẩn
│   │   └── prisma.js         # Khởi tạo PrismaClient
│   ├── middlewares/
│   │   ├── auth.js           # Xác thực JWT & phân quyền Admin
│   │   └── error.js          # Xử lý lỗi toàn cục và Zod validation
│   ├── routes/
│   │   ├── category.routes.js
│   │   └── product.routes.js
│   ├── services/
│   │   ├── category.service.js
│   │   └── product.service.js
│   ├── utils/
│   │   ├── serialize.js      # Chuẩn hóa DTO (Price Decimal -> string/number)
│   │   └── slug.js           # Hàm sinh slug tiếng Việt chuẩn SEO
│   ├── validators/
│   │   ├── category.schema.js# Schema Zod cho danh mục
│   │   └── product.schema.js # Schema Zod cho sản phẩm
│   ├── app.js                # Factory function createApp
│   └── server.js             # Khởi chạy server và graceful shutdown
├── test/
│   ├── category.routes.test.js
│   └── product.routes.test.js
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
└── README.md
```

---

## 4. Hướng dẫn chạy cục bộ (Local Development)

```bash
cd services/product-service
cp .env.example .env
# Chỉnh sửa DATABASE_URL và JWT_SECRET nếu cần

npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed # Nạp dữ liệu mẫu ban đầu
npm run dev
```

---

## 5. Chạy kiểm thử tự động (Unit / Integration Tests)

```bash
npm test
```
Bộ kiểm thử chạy bằng test runner tích hợp của Node.js (`node --test`) và `supertest`, kiểm tra 12 kịch bản:
- Public health check
- Lấy danh sách sản phẩm & danh mục
- Chi tiết sản phẩm trả trực tiếp DTO
- Chặn request khi thiếu JWT hoặc không phải Admin
- Xác thực dữ liệu đầu vào bằng Zod
- Tạo sản phẩm, sinh slug tự động
- Cập nhật và xóa sản phẩm/danh mục

---

## 6. Docker & Docker Compose

### Build Docker Image
```bash
docker build -t mqtt-product-service .
```

### Mẫu cấu hình trong `compose.yaml`
```yaml
  product-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: product_db
    volumes:
      - product_db_data:/var/lib/postgresql/data

  product-service:
    build: ./services/product-service
    environment:
      PORT: 3002
      DATABASE_URL: postgresql://postgres:postgres@product-db:5432/product_db?schema=public
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - product-db
    restart: unless-stopped

volumes:
  product_db_data:
```
