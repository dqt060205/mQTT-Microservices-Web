# Tutorial Service

Microservice quản lý bài hướng dẫn kỹ thuật IoT. Service sở hữu PostgreSQL database riêng (`tutorial_db`), cung cấp nội dung công khai đã xuất bản và giới hạn thao tác ghi cho administrator.

- Node.js 20+, Express, Prisma + PostgreSQL, Zod, JWT
- Cổng mặc định: `3006`
- `GET` chỉ hiển thị tutorial đã xuất bản.
- `POST`, `PATCH`, `DELETE` yêu cầu `Authorization: Bearer <jwt>` với quyền admin (`role: "admin"` hoặc `roles: ["admin"]`).
- `productId` chỉ là tham chiếu ID; service không truy cập database của Product Service.

## API

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| GET | `/ready` | Public | Kiểm tra kết nối database |
| GET | `/api/tutorials` | Public | Danh sách tutorial đã xuất bản; hỗ trợ `page`, `limit`, `search`, `productId`, `category`, `difficulty`, `sortBy`, `sortOrder` |
| GET | `/api/tutorials/:id` | Public | Chi tiết theo UUID |
| GET | `/api/tutorials/slug/:slug` | Public | Chi tiết theo slug |
| GET | `/api/tutorials/product/:productId` | Public | Tutorial đã xuất bản theo sản phẩm |
| POST | `/api/tutorials` | Admin | Tạo bài viết |
| PATCH | `/api/tutorials/:id` | Admin | Cập nhật bài viết |
| DELETE | `/api/tutorials/:id` | Admin | Xóa bài viết |

### Tạo bài viết

```json
{
  "title": "Getting Started with ESP32",
  "content": "Hướng dẫn cài đặt môi trường và chạy chương trình ESP32 đầu tiên.",
  "excerpt": "Làm quen với bo mạch ESP32.",
  "category": "Development Boards",
  "difficulty": "Beginner",
  "readTime": 8,
  "isPublished": true
}
```

Slug tự sinh từ title nếu không truyền. Các mức `difficulty` hợp lệ: `Beginner`, `Intermediate`, `Advanced`. API danh sách trả về `{ data, items, pagination }` để tương thích với frontend hiện tại.

## Chạy local

```bash
cd services/tutorial-service
cp .env.example .env
# Cấu hình DATABASE_URL và JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Test

```bash
npm test
```

## Docker

Build context phải là thư mục service: `docker build -t mqtt-tutorial-service services/tutorial-service`.

## TODO

- Tích hợp Tutorial Service vào API Gateway
- Thêm proxy route cho /api/tutorials
- Sửa compose.yaml để khởi động tutorial-db + tutorial-service
- Chuẩn hóa dữ liệu theo đúng format của frontend mQTT
