# mQTT — Nền tảng mua sắm thiết bị IoT và hướng dẫn kỹ thuật

**mQTT** là ứng dụng web xây dựng theo kiến trúc microservices, cho phép người dùng mua sắm các thiết bị IoT và tiếp cận những bài hướng dẫn kỹ thuật liên quan. Hệ thống hỗ trợ xem sản phẩm, quản lý giỏ hàng, đặt hàng, thanh toán mô phỏng và đọc các bài hướng dẫn sử dụng thiết bị.

Dự án sử dụng JavaScript cho cả frontend và backend, với React.js, Node.js và Express.js. Docker được sử dụng để đóng gói ứng dụng, trong khi Kubernetes là công cụ mở rộng phục vụ triển khai và quản lý các dịch vụ.

## 1. Mục tiêu dự án

- Xây dựng nền tảng thương mại điện tử dành cho thiết bị và linh kiện IoT.
- Cung cấp các bài hướng dẫn kỹ thuật, giúp người dùng tìm hiểu và sử dụng thiết bị IoT.
- Áp dụng kiến trúc microservices, phân chia hệ thống thành các dịch vụ độc lập.
- Xây dựng và tích hợp RESTful API giữa frontend và backend.
- Quản lý dữ liệu bằng PostgreSQL.
- Sử dụng Docker và Docker Compose để triển khai môi trường phát triển.
- Tìm hiểu Kubernetes để triển khai và quản lý các dịch vụ trong môi trường container.
- Thực hành làm việc nhóm, quản lý mã nguồn và kiểm thử phần mềm.

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML, CSS, JavaScript, React.js |
| Backend | Node.js, Express.js |
| Giao tiếp API | REST API, HTTP, JSON |
| API Gateway | Node.js, Express.js |
| Xác thực | JWT, bcrypt |
| Cơ sở dữ liệu | PostgreSQL |
| ORM | Prisma |
| Kiểm thử API | Postman |
| Tài liệu API | Swagger / OpenAPI |
| Đóng gói ứng dụng | Docker |
| Chạy nhiều container | Docker Compose |
| Điều phối container | Kubernetes, Minikube |
| Giao tiếp bất đồng bộ | RabbitMQ (mở rộng) |
| Bộ nhớ đệm | Redis (mở rộng) |
| Quản lý mã nguồn | Git, GitHub |
| Tự động hóa | GitHub Actions (mở rộng) |

## 3. Kiến trúc hệ thống

Hệ thống gồm một frontend, một API Gateway và sáu dịch vụ nghiệp vụ độc lập.


                     +---------------------+
                     |    React Frontend   |
                     +----------+----------+
                                |
                           REST API
                                |
                     +----------v----------+
                     |     API Gateway     |
                     |      Express.js     |
                     +----------+----------+
                                |
          +----------+----------+----------+----------+
          |          |          |          |          |
          v          v          v          v          v
       User       Product      Cart       Order     Payment
      Service     Service    Service     Service    Service
          |
          +----------------------+
                                 |
                          Tutorial Service

      Mỗi service quản lý nghiệp vụ và dữ liệu của mình.


API Gateway là cổng giao tiếp chính giữa frontend và các backend service. Gateway chịu trách nhiệm định tuyến request đến đúng dịch vụ, đồng thời có thể bổ sung xác thực, ghi log và giới hạn tần suất request.

Mỗi microservice là một ứng dụng riêng, có thể phát triển, kiểm thử và triển khai độc lập. Các service giao tiếp với nhau thông qua API hoặc cơ chế gửi sự kiện bất đồng bộ khi cần thiết.

## 4. Sáu dịch vụ chính

### 4.1. User Service — Quản lý người dùng

**Chức năng:** Quản lý tài khoản và xác thực người dùng.

Các tính năng:
- Đăng ký và đăng nhập.
- Mã hóa và kiểm tra mật khẩu.
- Cấp JWT để xác thực request.
- Xem và cập nhật thông tin cá nhân.
- Phân quyền người dùng và quản trị viên.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/users/register` | Đăng ký tài khoản |
| POST | `/api/users/login` | Đăng nhập |
| GET | `/api/users/me` | Xem thông tin cá nhân |
| PATCH | `/api/users/me` | Cập nhật thông tin |

Cơ sở dữ liệu: `user_db`

### 4.2. Product Service — Quản lý sản phẩm

**Chức năng:** Quản lý thiết bị IoT, linh kiện và danh mục sản phẩm.

Các tính năng:
- Hiển thị danh sách sản phẩm.
- Tìm kiếm và lọc sản phẩm theo danh mục, giá.
- Xem thông tin chi tiết, hình ảnh, giá và tồn kho.
- Thêm, sửa, xóa sản phẩm dành cho quản trị viên.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/products` | Lấy danh sách sản phẩm |
| GET | `/api/products/:id` | Xem chi tiết sản phẩm |
| POST | `/api/products` | Thêm sản phẩm |
| PATCH | `/api/products/:id` | Cập nhật sản phẩm |
| DELETE | `/api/products/:id` | Xóa sản phẩm |

Cơ sở dữ liệu: `product_db`

### 4.3. Cart Service — Quản lý giỏ hàng

**Chức năng:** Quản lý các sản phẩm người dùng muốn mua.

Các tính năng:
- Thêm sản phẩm vào giỏ hàng.
- Thay đổi số lượng sản phẩm.
- Xóa sản phẩm khỏi giỏ hàng.
- Tính tổng tiền tạm tính.
- Xem giỏ hàng của người dùng hiện tại.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart/items` | Thêm sản phẩm |
| PATCH | `/api/cart/items/:itemId` | Cập nhật số lượng |
| DELETE | `/api/cart/items/:itemId` | Xóa sản phẩm |
| DELETE | `/api/cart` | Xóa toàn bộ giỏ hàng |

Cơ sở dữ liệu: `cart_db`

### 4.4. Order Service — Quản lý đơn hàng

**Chức năng:** Xử lý việc tạo đơn và theo dõi đơn hàng.

Các tính năng:
- Tạo đơn hàng từ giỏ hàng.
- Lưu thông tin sản phẩm và giá tại thời điểm mua.
- Theo dõi trạng thái đơn hàng.
- Xem chi tiết và lịch sử đơn hàng.
- Hủy đơn hàng khi đáp ứng điều kiện cho phép.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/orders` | Tạo đơn hàng |
| GET | `/api/orders` | Xem danh sách đơn hàng |
| GET | `/api/orders/:id` | Xem chi tiết đơn hàng |
| PATCH | `/api/orders/:id/cancel` | Hủy đơn hàng |

Cơ sở dữ liệu: `order_db`

### 4.5. Payment Service — Quản lý thanh toán

**Chức năng:** Xử lý và lưu thông tin thanh toán.

Các tính năng:
- Thanh toán mô phỏng phục vụ demo.
- Lưu số tiền và trạng thái thanh toán.
- Mô phỏng trường hợp thanh toán thành công hoặc thất bại.
- Liên kết giao dịch với đơn hàng.
- Tra cứu trạng thái thanh toán.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| POST | `/api/payments` | Khởi tạo thanh toán |
| GET | `/api/payments/:id` | Xem thông tin thanh toán |
| GET | `/api/payments/order/:orderId` | Tra cứu thanh toán của đơn hàng |

Cơ sở dữ liệu: `payment_db`

**Lưu ý:** Phiên bản đầu tiên chỉ sử dụng thanh toán mô phỏng, chưa xử lý giao dịch tiền thật.

### 4.6. Tutorial Service — Quản lý hướng dẫn kỹ thuật

**Chức năng:** Cung cấp nội dung hướng dẫn liên quan đến thiết bị IoT.

Các tính năng:
- Hiển thị danh sách bài hướng dẫn.
- Xem nội dung chi tiết của từng bài.
- Phân loại bài viết theo chủ đề.
- Liên kết bài hướng dẫn với sản phẩm.
- Cho phép quản trị viên tạo, sửa và xóa nội dung.

API dự kiến:

| Phương thức | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/tutorials` | Lấy danh sách bài hướng dẫn |
| GET | `/api/tutorials/:id` | Xem nội dung chi tiết |
| GET | `/api/tutorials/product/:productId` | Tìm hướng dẫn theo sản phẩm |
| POST | `/api/tutorials` | Tạo bài hướng dẫn |
| PATCH | `/api/tutorials/:id` | Cập nhật bài hướng dẫn |
| DELETE | `/api/tutorials/:id` | Xóa bài hướng dẫn |

Cơ sở dữ liệu: `tutorial_db`

## 5. Thiết kế cơ sở dữ liệu

Dự án sử dụng PostgreSQL để lưu trữ dữ liệu lâu dài. Mỗi service chịu trách nhiệm quản lý dữ liệu thuộc nghiệp vụ của mình.

| Service | Cơ sở dữ liệu | Dữ liệu chính |
|---|---|---|
| User | `user_db` | Tài khoản, vai trò |
| Product | `product_db` | Sản phẩm, danh mục |
| Cart | `cart_db` | Giỏ hàng, sản phẩm trong giỏ |
| Order | `order_db` | Đơn hàng, chi tiết đơn |
| Payment | `payment_db` | Giao dịch, trạng thái thanh toán |
| Tutorial | `tutorial_db` | Bài hướng dẫn, danh mục nội dung |

Trong quá trình phát triển, có thể sử dụng một PostgreSQL instance chứa nhiều database riêng để tiết kiệm tài nguyên. Các service không được truy cập trực tiếp database thuộc service khác; thay vào đó, chúng trao đổi thông tin qua API hoặc sự kiện.

## 6. Cơ chế giao tiếp giữa các service

RESTful API được sử dụng để trao đổi dữ liệu giữa frontend, API Gateway và các backend service. Dữ liệu được truyền dưới dạng JSON.

Ví dụ quy trình đặt hàng:

1. Người dùng thêm sản phẩm vào Cart Service.
2. Frontend gửi yêu cầu đặt hàng thông qua API Gateway.
3. Order Service kiểm tra thông tin giỏ hàng và sản phẩm.
4. Order Service tạo đơn hàng ở trạng thái chờ thanh toán.
5. Payment Service xử lý thanh toán mô phỏng.
6. Trạng thái đơn hàng được cập nhật dựa trên kết quả thanh toán.
7. Frontend hiển thị kết quả đặt hàng.

JWT được sử dụng để xác thực các request cần đăng nhập. Các API quản trị cần kiểm tra quyền admin.

## 7. Cấu trúc thư mục dự kiến

mQTT/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── api-gateway/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── services/
│   ├── user-service/
│   ├── product-service/
│   ├── cart-service/
│   ├── order-service/
│   ├── payment-service/
│   └── tutorial-service/
│
├── infrastructure/
│   ├── docker/
│   └── kubernetes/
│
├── docs/
│   ├── architecture.md
│   └── api-design.md
│
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md

Mỗi backend service sẽ có mã nguồn, cấu hình, kiểm thử và Dockerfile riêng. Không cần tạo toàn bộ các thư mục ngay từ đầu; nhóm sẽ bổ sung dần theo tiến độ.

## 8. Các công cụ phục vụ phát triển

### Docker và Docker Compose

- Docker đóng gói ứng dụng cùng các thư viện cần thiết thành container