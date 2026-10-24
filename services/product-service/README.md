# Product Service

Product Service quản lý danh mục và sản phẩm IoT của hệ thống mQTT. Service được xây dựng bằng Node.js, Express, Prisma ORM và PostgreSQL; có thể chạy độc lập hoặc được gọi thông qua API Gateway.

## Chức năng đã triển khai

- CRUD sản phẩm và danh mục.
- Tìm kiếm sản phẩm theo tên, SKU hoặc mô tả.
- Lọc theo danh mục, khoảng giá và trạng thái còn hàng.
- Phân trang và sắp xếp danh sách sản phẩm.
- Validation request và định dạng lỗi JSON thống nhất.
- Xác thực JWT và kiểm tra quyền admin cho API ghi dữ liệu.
- Health check, readiness check và graceful shutdown.
- Prisma schema, migration khởi tạo và dữ liệu seed.
- Dockerfile để đóng gói service.
- Unit test cho validation và chuẩn hóa dữ liệu.

## Cấu trúc thư mục

    product-service/
    ├── prisma/
    │   ├── migrations/
    │   ├── schema.prisma
    │   └── seed.js
    ├── src/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── routes/
    │   ├── services/
    │   ├── utils/
    │   ├── validation/
    │   ├── app.js
    │   └── server.js
    ├── test/
    ├── .env.example
    ├── Dockerfile
    └── package.json

Luồng xử lý request:

    Route -> Auth/Validation -> Controller -> Service -> Prisma -> PostgreSQL

## Mô hình dữ liệu

### Category

| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | UUID | Khóa chính |
| name | String | Tên duy nhất |
| slug | String | Slug duy nhất |
| description | String, nullable | Mô tả |
| createdAt | DateTime | Thời điểm tạo |
| updatedAt | DateTime | Thời điểm cập nhật |

### Product

| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | UUID | Khóa chính |
| name | String | Tên sản phẩm |
| slug | String | Slug duy nhất |
| sku | String | Mã SKU duy nhất, được chuẩn hóa thành chữ hoa |
| description | String, nullable | Mô tả sản phẩm |
| price | Decimal(12,2) | Giá lớn hơn 0 |
| stock | Integer | Tồn kho không âm |
| imageUrl | String, nullable | URL HTTP hoặc HTTPS |
| categoryId | UUID, nullable | Danh mục của sản phẩm |
| createdAt | DateTime | Thời điểm tạo |
| updatedAt | DateTime | Thời điểm cập nhật |

Giá được trả về API dưới dạng chuỗi, ví dụ "12.90", để tránh sai số số thực khi truyền dữ liệu tiền tệ.

## API

Base URL khi chạy trực tiếp:

    http://localhost:3002

### Endpoint hệ thống

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | / | Public | Thông tin service |
| GET | /health | Public | Liveness check, không truy vấn database |
| GET | /ready | Public | Readiness check, có truy vấn database |

### Endpoint sản phẩm

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | /api/products | Public | Danh sách, tìm kiếm và lọc sản phẩm |
| GET | /api/products/:id | Public | Chi tiết sản phẩm |
| POST | /api/products | Admin | Tạo sản phẩm |
| PATCH | /api/products/:id | Admin | Cập nhật một phần sản phẩm |
| DELETE | /api/products/:id | Admin | Xóa sản phẩm |

Query của GET /api/products:

| Tham số | Mặc định | Mô tả |
|---|---|---|
| page | 1 | Trang hiện tại |
| limit | 20 | Số bản ghi, tối đa 100 |
| search | - | Tìm trong name, sku và description |
| category | - | UUID hoặc slug của danh mục |
| minPrice | - | Giá thấp nhất |
| maxPrice | - | Giá cao nhất |
| inStock | - | true để lấy sản phẩm còn hàng, false để lấy sản phẩm hết hàng |
| sortBy | createdAt | createdAt, name, price hoặc stock |
| sortOrder | desc | asc hoặc desc |

Ví dụ:

    GET /api/products?search=sensor&category=sensors&minPrice=5&maxPrice=50&inStock=true&page=1&limit=10&sortBy=price&sortOrder=asc

Payload tạo sản phẩm:

    {
      "name": "ESP32 Development Board",
      "sku": "MQTT-ESP32-001",
      "description": "Wi-Fi and Bluetooth development board",
      "price": "12.90",
      "stock": 50,
      "imageUrl": "https://images.example.com/products/esp32.jpg",
      "categoryId": "0fbb3a3d-6fb4-4fb7-95b1-30c1046069fd"
    }

Trường slug không bắt buộc khi tạo. Service tự sinh slug từ name. Khi cập nhật name, slug cũ được giữ nguyên; gửi thêm slug nếu muốn thay đổi URL thân thiện.

Response danh sách:

    {
      "success": true,
      "data": [
        {
          "id": "d946248e-752f-433d-81a7-a243350d27d3",
          "name": "ESP32 Development Board",
          "slug": "esp32-development-board",
          "sku": "MQTT-ESP32-001",
          "description": "Wi-Fi and Bluetooth development board",
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
      "meta": {
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 1,
          "totalPages": 1
        }
      }
    }

### Endpoint danh mục

| Method | Endpoint | Quyền | Chức năng |
|---|---|---|---|
| GET | /api/categories | Public | Danh sách danh mục và số sản phẩm |
| GET | /api/categories/:id | Public | Chi tiết danh mục |
| POST | /api/categories | Admin | Tạo danh mục |
| PATCH | /api/categories/:id | Admin | Cập nhật danh mục |
| DELETE | /api/categories/:id | Admin | Xóa danh mục rỗng |

Service trả về HTTP 409 nếu xóa một danh mục vẫn còn sản phẩm.

Payload tạo danh mục:

    {
      "name": "Sensors",
      "description": "Temperature, humidity, light and motion sensors"
    }

## Xác thực API quản trị

Các request POST, PATCH và DELETE phải gửi access token:

    Authorization: Bearer <access-token>

Product Service xác minh token bằng JWT_SECRET và chỉ chấp nhận thuật toán HS256. Payload token cần có một trong hai dạng:

    {
      "sub": "user-id",
      "role": "admin"
    }

hoặc:

    {
      "sub": "user-id",
      "roles": ["admin"]
    }

JWT_SECRET phải giống secret mà User Service dùng để ký access token. Trong môi trường production, Product Service chỉ nên được truy cập qua API Gateway hoặc mạng nội bộ.

## Biến môi trường

Tạo file .env từ .env.example:

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| NODE_ENV | Không | development | Môi trường chạy |
| PORT | Không | 3002 | Cổng HTTP |
| DATABASE_URL | Có | - | PostgreSQL connection string |
| JWT_SECRET | Có cho API admin | - | Secret dùng xác minh JWT |
| CORS_ORIGIN | Không | * | Danh sách origin cách nhau bằng dấu phẩy |

Không commit file .env chứa thông tin thật.

## Chạy local

Yêu cầu:

- Node.js 20 trở lên.
- PostgreSQL.

Từ thư mục product-service:

    Copy-Item .env.example .env
    npm install
    npm run prisma:generate
    npm run db:deploy
    npm run db:seed
    npm run dev

Nếu muốn tạo nhanh PostgreSQL bằng Docker:

    docker run --name mqtt-product-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=product_db -p 5432:5432 -d postgres:17-alpine

Migration đã được commit trong prisma/migrations. Khi thay đổi schema trong quá trình phát triển:

    npm run db:migrate -- --name describe_the_change

Khi triển khai:

    npm run db:deploy

## Chạy bằng Docker

Build image:

    docker build -t mqtt-product-service .

Chạy container khi PostgreSQL ở máy host:

    docker run --rm -p 3002:3002 -e PORT=3002 -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/product_db?schema=public -e JWT_SECRET=replace-me mqtt-product-service

Container tự chạy prisma migrate deploy trước khi khởi động HTTP server.

## Kiểm thử

Chạy unit test:

    npm test

Các test hiện tại kiểm tra:

- Sinh slug từ tiếng Việt.
- Chuẩn hóa SKU và price.
- Validation giá và tồn kho.
- Validation PATCH rỗng.
- Validation query tìm kiếm, lọc, phân trang và sắp xếp.

Để kiểm thử tích hợp API đầy đủ, cần cấu hình PostgreSQL và chạy migration trước.

## Định dạng lỗi

Ví dụ lỗi validation:

    {
      "success": false,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed.",
        "requestId": "6f79ed84-7e83-4de7-ad39-96823aa92658",
        "details": [
          {
            "field": "price",
            "message": "price must be greater than zero."
          }
        ]
      }
    }

Mỗi response có header x-request-id. Gateway có thể truyền sẵn header này để đối chiếu log giữa các service.

Các status code chính:

| Status | Ý nghĩa |
|---|---|
| 200, 201, 204 | Thành công |
| 400 | Payload, UUID hoặc query không hợp lệ |
| 401 | Thiếu token hoặc token không hợp lệ |
| 403 | Không có quyền admin hoặc origin bị chặn |
| 404 | Không tìm thấy route hoặc tài nguyên |
| 409 | Trùng slug/SKU/name hoặc danh mục chưa rỗng |
| 500 | Lỗi cấu hình hoặc lỗi nội bộ |

## Ghi chú tích hợp

- API Gateway nên chuyển nguyên header Authorization và x-request-id tới service.
- User Service và Product Service phải dùng cùng JWT_SECRET và thống nhất claim role.
- Order Service và Cart Service chỉ nên đọc thông tin sản phẩm qua API, không truy cập trực tiếp product_db.
- Giá sản phẩm cần được lưu snapshot tại Order Service khi tạo đơn hàng.
- Thao tác trừ tồn kho cần bổ sung transaction hoặc cơ chế reservation khi triển khai luồng checkout.
