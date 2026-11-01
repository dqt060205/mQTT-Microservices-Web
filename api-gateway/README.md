# mQTT API Gateway

API Gateway là cổng giao tiếp duy nhất (**Single Point of Entry**) giữa Frontend (React/Vite) và toàn bộ hệ sinh thái Microservices của dự án **mQTT**.

Gateway chịu trách nhiệm nhận request từ client, định tuyến chính xác đến từng microservice tương ứng, xử lý CORS, bảo vệ hệ thống bằng Rate Limiting, chuẩn hóa log và cung cấp các endpoint theo dõi sức khỏe hệ thống.

---

## 1. Kiến trúc định tuyến

```text
               +----------------------------------+
               |      Client / React Frontend     |
               |       (http://localhost:5173)    |
               +-----------------+----------------+
                                 |
                          HTTP Request
                                 |
               +-----------------v----------------+
               |          API Gateway             |
               |       (http://localhost:8080)    |
               |                                  |
               |  - Helmet & CORS                 |
               |  - Rate Limiting                 |
               |  - Request Logging (Morgan)      |
               |  - Error & Health Management     |
               +-----------------+----------------+
                                 | Reverse Proxy
        +------------+-----------+-----------+------------+------------+
        |            |           |           |            |            |
        v            v           v           v            v            v
      User        Product       Cart       Order       Payment      Tutorial
     Service      Service     Service     Service      Service      Service
     (:3001)      (:3002)     (:3003)     (:3004)      (:3005)      (:3006)
```

### Bảng định tuyến Microservices

| Service | Đường dẫn tiếp nhận | Target Mặc định | Chức năng chính |
|---|---|---|---|
| **User Service** | `/api/users/*`<br>`/users/*` | `http://localhost:3001` | Đăng ký, đăng nhập, hồ sơ người dùng (`GET /api/users/me`) |
| **Product Service** | `/api/products/*`<br>`/products/*`<br>`/api/categories/*`<br>`/categories/*` | `http://localhost:3002` | Danh sách sản phẩm, chi tiết thiết bị IoT, danh mục sản phẩm |
| **Cart Service** | `/api/cart/*`<br>`/cart/*` | `http://localhost:3003` | Quản lý giỏ hàng (`GET`, `POST /items`, `DELETE`) |
| **Order Service** | `/api/orders/*`<br>`/orders/*` | `http://localhost:3004` | Tạo đơn hàng, lịch sử đơn hàng, hủy đơn |
| **Payment Service** | `/api/payments/*`<br>`/payments/*` | `http://localhost:3005` | Khởi tạo & tra cứu trạng thái thanh toán mô phỏng |
| **Tutorial Service** | `/api/tutorials/*`<br>`/tutorials/*` | `http://localhost:3006` | Danh sách và chi tiết các bài hướng dẫn kỹ thuật IoT |

> **Lưu ý tiện ích**: Gateway tự động hỗ trợ cả đường dẫn chuẩn `/api/...` (khớp với frontend Vite proxy và Nginx) lẫn đường dẫn rút gọn không có `/api` (ví dụ: `/users/login` sẽ được tự động rewrite thành `/api/users/login` trước khi gửi tới service).

---

## 2. Các Endpoint tích hợp sẵn của Gateway

API Gateway cung cấp sẵn các endpoint giám sát trực tiếp (không chuyển tiếp qua microservice):

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/` | Trả về thông tin phiên bản, trạng thái Gateway và danh sách toàn bộ route/service đã đăng ký. |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động của chính API Gateway (Liveness probe cho Docker/K8s). |
| `GET` | `/ready` | Kiểm tra Gateway đã sẵn sàng tiếp nhận request (Readiness probe). |
| `GET` | `/services/health` | **Tính năng kiểm tra sức khỏe tổng hợp**: Gửi request song song đến endpoint `/health` của tất cả 6 microservice backend và trả về trạng thái chi tiết (`UP` / `DOWN`), độ trễ (latency ms) của từng service. |

---

## 3. Các tính năng nổi bật

1. **Reverse Proxy Stream nguyên vẹn**:
   - Chuyển tiếp luồng HTTP trực tiếp mà không parse body trước proxy. Nhờ đó, dữ liệu JSON, multipart form data (upload file), và header xác thực (`Authorization: Bearer <token>`) được chuyển đến microservice đích một cách nguyên bản với hiệu năng tối ưu.
2. **Bảo mật & HTTP Headers**:
   - Sử dụng `helmet` để thiết lập các HTTP headers bảo mật, ẩn `X-Powered-By`.
3. **CORS linh hoạt**:
   - Cho phép gọi API từ frontend dev (`http://localhost:5173`), Docker container (`http://localhost:3000`), hoặc tùy chỉnh qua biến môi trường `CORS_ORIGIN`.
4. **Giới hạn tần suất (Rate Limiting)**:
   - Ngăn chặn tấn công brute-force hoặc spam request thông qua `express-rate-limit` (mặc định 500 requests / 15 phút, bỏ qua cho các endpoint health check).
5. **Xử lý lỗi microservice thân thiện**:
   - Khi một microservice đích bị sập hoặc timeout, Gateway bắt lỗi và phản hồi ngay mã `503 Service Unavailable` với payload JSON chuẩn chỉ rõ service nào đang gặp sự cố.
   - Khi gọi đến endpoint không tồn tại, Gateway phản hồi `404 ROUTE_NOT_FOUND`.

---

## 4. Biến môi trường (`.env`)

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

| Biến môi trường | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `8080` | Cổng lắng nghe của API Gateway (khớp với cấu hình dev proxy của Vite và Nginx) |
| `NODE_ENV` | `development` | Môi trường chạy (`development` hoặc `production`) |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:3000` | Danh sách origin được phép truy cập CORS (cách nhau bởi dấu phẩy, hoặc `*`) |
| `PROXY_TIMEOUT_MS` | `10000` | Thời gian chờ tối đa khi proxy chuyển tiếp (milliseconds) |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Khung thời gian giới hạn request (15 phút) |
| `RATE_LIMIT_MAX` | `500` | Số lượng request tối đa trong mỗi khung thời gian cho 1 IP |
| `USER_SERVICE_URL` | `http://localhost:3001` | Địa chỉ User Service |
| `PRODUCT_SERVICE_URL` | `http://localhost:3002` | Địa chỉ Product Service |
| `CART_SERVICE_URL` | `http://localhost:3003` | Địa chỉ Cart Service |
| `ORDER_SERVICE_URL` | `http://localhost:3004` | Địa chỉ Order Service |
| `PAYMENT_SERVICE_URL` | `http://localhost:3005` | Địa chỉ Payment Service |
| `TUTORIAL_SERVICE_URL` | `http://localhost:3006` | Địa chỉ Tutorial Service |

---

## 5. Hướng dẫn chạy cục bộ (Local Development)

### Yêu cầu
- Node.js >= 20
- npm >= 9

### Cài đặt thư viện
```bash
cd api-gateway
npm install
```

### Chạy ở chế độ phát triển (Auto reload với Nodemon)
```bash
npm run dev
```

### Chạy ở chế độ Production
```bash
npm start
```

### Chạy kiểm thử tự động (Unit / Integration Tests)
```bash
npm test
```
Bộ test sử dụng Node.js native test runner (`node --test`), kiểm tra tự động tất cả các luồng:
- Metadata gateway `GET /`
- Health check `GET /health` & `GET /ready`
- Phản hồi `404 ROUTE_NOT_FOUND`
- Reverse proxy chuyển tiếp GET kèm token `Authorization`
- Reverse proxy chuyển tiếp POST kèm JSON body
- Rewrite URL `/users/*` -> `/api/users/*`
- Xử lý lỗi `503 SERVICE_UNAVAILABLE` khi backend service offline

---

## 6. Chạy với Docker

### Build Docker Image
```bash
docker build -t mqtt-api-gateway .
```

### Chạy Docker Container
```bash
docker run -d \
  --name api-gateway \
  -p 8080:8080 \
  -e USER_SERVICE_URL=http://user-service:3001 \
  -e PRODUCT_SERVICE_URL=http://product-service:3002 \
  -e ORDER_SERVICE_URL=http://order-service:3004 \
  mqtt-api-gateway
```

### Mẫu cấu hình trong `compose.yaml` (Docker Compose)
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
      - order-service
    restart: unless-stopped
```

---

## 7. Cấu trúc thư mục mã nguồn

```text
api-gateway/
├── src/
│   ├── config/
│   │   └── env.js            # Nạp và quản lý biến môi trường, định nghĩa cấu hình services
│   ├── middleware/
│   │   ├── cors.js           # Xử lý CORS hỗ trợ nhiều origin và credentials
│   │   ├── rate-limiter.js   # Giới hạn tần suất request bảo vệ hệ thống
│   │   └── error-handler.js  # Middleware bắt lỗi 404 Not Found và lỗi nội bộ
│   ├── routes/
│   │   └── gateway.routes.js # Các endpoint /, /health, /ready, /services/health
│   ├── services/
│   │   └── proxy.js          # Tạo Reverse Proxy với đường dẫn và xử lý timeout/downstream error
│   ├── app.js                # Khởi tạo và liên kết các middleware trong ứng dụng Express
│   └── server.js             # Khởi động server HTTP và Graceful Shutdown
├── test/
│   └── gateway.test.js       # Bộ test tự động (node --test)
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
└── README.md
```

