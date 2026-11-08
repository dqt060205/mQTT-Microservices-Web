# Cart Service

Microservice quản lý giỏ hàng của người dùng trong mQTT. Service lưu `productId` và số lượng trong PostgreSQL riêng (`cart_db`); thông tin tên/giá hiện tại được lấy từ Product Service khi đọc giỏ hàng, không lưu trùng dữ liệu catalog.

- Node.js 20+, Express, Prisma + PostgreSQL, JWT
- Cổng mặc định: `3003`
- Tất cả `/api/cart` yêu cầu `Authorization: Bearer <jwt>`; JWT phải dùng chung `JWT_SECRET` với user-service. User ID đọc từ claim `sub` hoặc `id`.
- Product Service dự kiến có `GET /api/products/:id`, trả `{ id, name, price, stock?, imageUrl? }`.

## API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/health` | Health check, không cần xác thực |
| GET | `/api/cart` | Lấy giỏ hàng hiện tại cùng giá và tổng tiền tạm tính |
| POST | `/api/cart/items` | Thêm sản phẩm hoặc cộng số lượng nếu đã có |
| PATCH | `/api/cart/items/:itemId` | Đặt số lượng mới |
| DELETE | `/api/cart/items/:itemId` | Xóa một mặt hàng |
| DELETE | `/api/cart` | Xóa toàn bộ mặt hàng trong giỏ |

Body thêm sản phẩm:

```json
{ "productId": "product-uuid", "quantity": 2 }
```

Body cập nhật số lượng:

```json
{ "quantity": 3 }
```

Response GET/thêm/cập nhật/xóa mặt hàng:

```json
{
  "id": "cart-uuid",
  "items": [
    {
      "id": "cart-item-uuid",
      "productId": "product-uuid",
      "quantity": 2,
      "product": { "name": "IoT sensor", "price": 12.5 },
      "subtotal": 25
    }
  ],
  "total": 25
}
```

Giỏ chưa được tạo trả về `{ "id": null, "items": [], "total": 0 }`. Xóa toàn bộ trả `204`. Giá trong giỏ chỉ là tạm tính; Order Service phải kiểm tra lại giá và tồn kho khi checkout.

## Chạy local

```bash
cp .env.example .env
# Cập nhật JWT_SECRET, DATABASE_URL và PRODUCT_SERVICE_URL
npm install
npx prisma migrate dev --name init
npm run dev
```

## Docker

Image chạy `prisma migrate deploy` khi khởi động. Hãy commit thư mục `prisma/migrations` được tạo bởi lệnh migrate trước khi triển khai. Trong root `compose.yaml`, cấu hình service cần thiết gồm:

```yaml
  cart-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: cart_db
    volumes:
      - cart_db_data:/var/lib/postgresql/data

  cart-service:
    build: ./services/cart-service
    environment:
      PORT: 3003
      DATABASE_URL: postgresql://postgres:postgres@cart-db:5432/cart_db?schema=public
      JWT_SECRET: ${JWT_SECRET}
      PRODUCT_SERVICE_URL: http://product-service:3002
    depends_on:
      - cart-db

# Thêm vào phần volumes cấp cao nhất:
volumes:
  cart_db_data:
```
