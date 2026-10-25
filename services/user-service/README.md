# User Service

User Service chịu trách nhiệm quản lý người dùng, xác thực, tạo JWT token và cung cấp thông tin hồ sơ người dùng cho hệ thống mQTT.
## 1. Mục tiêu

- Quản lý tài khoản người dùng
- Đăng ký tài khoản mới
- Đăng nhập bằng email và mật khẩu
- Tạo và xác thực JWT access token
- Lấy thông tin người dùng hiện tại
- Cập nhật hồ sơ cá nhân
- Hỗ trợ phân quyền cơ bản: USER / ADMIN
- Dùng riêng một database `user_db` theo mô hình microservice

## 2. Tính năng đã hoàn thành

### 2.1 Đăng ký người dùng
- Endpoint: `POST /api/users/register`
- Yêu cầu:
  - `fullName`
  - `email`
  - `password`
- Logic:
  - Kiểm tra dữ liệu đầu vào
  - Kiểm tra email đã tồn tại chưa
  - Hash mật khẩu bằng bcrypt
  - Tạo bản ghi người dùng trong PostgreSQL
  - Trả về JWT token và thông tin người dùng

### 2.2 Đăng nhập
- Endpoint: `POST /api/users/login`
- Yêu cầu:
  - `email`
  - `password`
- Logic:
  - Tìm người dùng theo email
  - So khớp mật khẩu với bcrypt
  - Tạo JWT token
  - Trả về thông tin người dùng và token

### 2.3 Lấy thông tin hồ sơ hiện tại
- Endpoint: `GET /api/users/me`
- Bảo vệ bởi middleware xác thực token
- Logic:
  - Đọc token từ `Authorization: Bearer <token>`
  - Xác thực JWT
  - Tìm user theo `sub` trong payload
  - Trả về hồ sơ người dùng hiện tại

### 2.4 Cập nhật hồ sơ
- Endpoint: `PATCH /api/users/me`
- Bảo vệ bởi middleware xác thực token
- Cho phép cập nhật:
  - `fullName`
  - `phone`
  - `avatarUrl`

### 2.5 Xác thực JWT
- Service sử dụng `jsonwebtoken`
- Thuật toán: `HS256`
- JWT secret phải đồng nhất với các service khác nếu cần cấp quyền bảo mật hoặc xác thực xuyên service

### 2.6 Bảo mật mật khẩu
- Mật khẩu không lưu dưới dạng plain text
- Dùng `bcryptjs` để hash mật khẩu trước khi lưu DB

### 2.7 Kiểm tra sức khỏe service
- `GET /`
- `GET /health`
- `GET /ready`

### 2.8 Database và Prisma
- Dùng Prisma ORM để quản lý schema
- Tạo model `User`
- Dùng migration để tạo bảng trong PostgreSQL
- Có seed mặc định cho tài khoản admin demo

## 3. Cấu trúc thư mục

```text
user-service/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/
│   │   └── prisma.js
│   ├── controllers/
│   │   └── user.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   └── user.routes.js
│   ├── services/
│   │   └── user.service.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── password.js
│   ├── app.js
│   └── server.js
├── .env.example
├── Dockerfile
├── package.json
└── README.md
```

## 4. Mô hình dữ liệu

### Model User

```prisma
model User {
  id           String   @id @default(uuid()) @db.Uuid
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  fullName     String   @map("full_name") @db.VarChar(120)
  phone        String?  @db.VarChar(30)
  avatarUrl    String?  @map("avatar_url") @db.VarChar(2048)
  role         Role     @default(USER)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
}
```

### Enum Role

```prisma
enum Role {
  USER
  ADMIN
}
```

## 5. API Endpoints

### 5.1 Public endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/` | Thông tin service |
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check, kiểm tra DB |
| POST | `/api/users/register` | Đăng ký tài khoản |
| POST | `/api/users/login` | Đăng nhập |

### 5.2 Protected endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users/me` | Lấy thông tin người dùng hiện tại |
| PATCH | `/api/users/me` | Cập nhật hồ sơ cá nhân |

## 6. Authentication Flow

1. User gửi request đăng ký hoặc đăng nhập.
2. Service xác thực dữ liệu đầu vào.
3. Nếu hợp lệ, service:
   - hash mật khẩu (nếu đăng ký)
   - tạo hoặc tìm user
   - tạo JWT
4. Client lưu token trong `Authorization` header.
5. Mỗi request tới protected route sẽ:
   - đọc token
   - verify token bằng `JWT_SECRET`
   - lấy `req.user.sub`
   - truy xuất dữ liệu user tương ứng

Ví dụ header:

```http
Authorization: Bearer <jwt-token>
```

## 7. Response Format

Service trả về JSON theo chuẩn thống nhất:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "role": "USER",
    "token": "jwt-token"
  }
}
```

Lỗi mẫu:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

## 8. Biến môi trường

File `.env.example`:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/user_db?schema=public
JWT_SECRET=replace-with-the-same-secret-used-by-product-service
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Giải thích
- `PORT`: cổng chạy service, mặc định `3001`
- `DATABASE_URL`: đường kết nối PostgreSQL
- `JWT_SECRET`: secret dùng để ký và verify token
- `CORS_ORIGIN`: danh sách origin được phép truy cập

## 9. Chạy local

### Cài đặt

```bash
cd services/user-service
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Chạy production-like

```bash
npm start
```

## 10. Docker

Service có thể chạy trong container riêng bằng Docker.

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]
```

## 11. Seed Admin

Khi chạy `npm run db:seed`, hệ thống sẽ tạo tài khoản admin demo:

- Email: `admin@mqtt.local`
- Password: `admin123`

Dùng tài khoản này để kiểm thử role ADMIN nếu cần.

## 12. Bảo mật và lưu ý

- Không lưu password dạng raw text
- Luôn sử dụng HTTPS trong môi trường production
- `JWT_SECRET` phải được giữ bí mật
- Đồng bộ secret giữa User Service và các service cần verify token
- API Gateway nên chuyển tiếp `Authorization` header tới User Service
- Không truy cập trực tiếp database của service khác

## 13. Tích hợp với hệ thống

User Service cần được thiết kế để tích hợp với:
- API Gateway
- Frontend
- Product Service
- Order Service
- Cart Service

Ví dụ:
- Frontend gọi `POST /api/users/register`
- Gateway chuyển request tới `user-service`
- User Service trả về JWT token
- Frontend lưu token và gửi token trong các request cần xác thực
