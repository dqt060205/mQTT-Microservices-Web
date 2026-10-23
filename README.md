# mQTT — IoT Marketplace & Tutorials

**mQTT** is a microservices-based web application for shopping for IoT devices and accessing technical tutorials. The platform allows users to explore IoT products, manage shopping carts, place orders, simulate payments, and learn how to use IoT devices through tutorials.

The project is built with JavaScript across the frontend and backend, using Node.js, Express.js, and a microservices architecture.

## 1. Project Objectives

- Build an e-commerce platform for IoT devices and components.
- Provide technical tutorials related to IoT products.
- Apply microservices architecture with independent backend services.
- Design and integrate RESTful APIs.
- Containerize the application using Docker.
- Explore application deployment and orchestration with Kubernetes.
- Practice collaborative software development using Git and GitHub.

## 2. Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript, React.js |
| Backend | Node.js, Express.js |
| API Communication | REST API, JSON, HTTP |
| API Gateway | Express.js |
| Authentication | JWT, bcrypt |
| Database | PostgreSQL |
| Database ORM | Prisma ORM |
| API Testing | Postman, Swagger / OpenAPI |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes, Minikube |
| Message Broker | RabbitMQ (optional) |
| Caching | Redis (optional) |
| Version Control | Git, GitHub |
| CI/CD | GitHub Actions (optional) |

## 3. System Architecture

The application consists of a React frontend, an API Gateway, and six independent backend services.


                       +------------------+
                       |   React Frontend |
                       +--------+---------+
                                |
                         HTTP / REST API
                                |
                       +--------v---------+
                       |    API Gateway   |
                       |  Express.js      |
                       +--------+---------+
                                |
          +---------------------+----------------------+
          |          |          |          |           |
          v          v          v          v           v
      User Svc   Product Svc  Cart Svc  Order Svc  Payment Svc
          |          |          |          |           |
          +----------+----------+----------+-----------+
                                |
                         Tutorial Service

      Each service owns its business logic and data.
      Services communicate through APIs or asynchronous events.


The API Gateway acts as the single entry point for frontend requests. It routes requests to the appropriate backend service and can later handle authentication checks, logging, and rate limiting.

Each microservice runs as an independent application and can be developed, tested, and deployed separately.

## 4. The Six Core Microservices

### 4.1 User Service

**Responsibility:** Manage user accounts and authentication.

Features:
- User registration and login.
- Password hashing and validation.
- JWT access token generation.
- User profile management.
- Role-based access control for users and administrators.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/register` | Register an account |
| POST | `/api/users/login` | Log in |
| GET | `/api/users/me` | Get the current profile |
| PATCH | `/api/users/me` | Update the profile |

Database: `user_db`

### 4.2 Product Service

**Responsibility:** Manage IoT products and product categories.

Features:
- Browse and search IoT devices.
- Filter products by category and price.
- View product details, prices, and stock.
- Create, update, and delete products for administrators.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product details |
| POST | `/api/products` | Create a product |
| PATCH | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |

Database: `product_db`

### 4.3 Cart Service

**Responsibility:** Manage users' shopping carts.

Features:
- Add products to a cart.
- Update item quantities.
- Remove items.
- Calculate the cart subtotal.
- Retrieve the current user's cart.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/cart` | Get the current cart |
| POST | `/api/cart/items` | Add an item |
| PATCH | `/api/cart/items/:itemId` | Update quantity |
| DELETE | `/api/cart/items/:itemId` | Remove an item |
| DELETE | `/api/cart` | Clear the cart |

Database: `cart_db`

### 4.4 Order Service

**Responsibility:** Manage order creation and order history.

Features:
- Create orders from shopping carts.
- Store order items and purchase-time prices.
- Track order status.
- View order details and order history.
- Cancel eligible orders.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create an order |
| GET | `/api/orders` | List the current user's orders |
| GET | `/api/orders/:id` | Get order details |
| PATCH | `/api/orders/:id/cancel` | Cancel an eligible order |

Database: `order_db`

### 4.5 Payment Service

**Responsibility:** Handle payment records and payment processing.

Features:
- Simulate payments for demonstration.
- Record payment amounts and statuses.
- Handle successful and failed payment scenarios.
- Associate payments with orders.
- Provide payment status information.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Initiate a payment |
| GET | `/api/payments/:id` | Get payment details |
| GET | `/api/payments/order/:orderId` | Get payment status for an order |

Database: `payment_db`

**Note:** The initial implementation uses simulated payments. Real payment gateway integration can be added in a later phase.

### 4.6 Tutorial Service

**Responsibility:** Manage technical tutorials and learning content.

Features:
- Browse tutorials related to IoT devices.
- View tutorial details.
- Organize tutorials by topic or product.
- Support tutorial creation and editing for administrators.
- Store tutorial content, images, and external video links.

Example APIs:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tutorials` | List tutorials |
| GET | `/api/tutorials/:id` | Get tutorial details |
| GET | `/api/tutorials/product/:productId` | Find tutorials for a product |
| POST | `/api/tutorials` | Create a tutorial |
| PATCH | `/api/tutorials/:id` | Update a tutorial |
| DELETE | `/api/tutorials/:id` | Delete a tutorial |

Database: `tutorial_db`

## 5. Database Design

PostgreSQL is used for persistent data storage.

Each microservice owns its database and is responsible for accessing and modifying its own data.

| Service | Database | Example entities |
|---|---|---|
| User | `user_db` | Users, roles |
| Product | `product_db` | Products, categories |
| Cart | `cart_db` | Carts, cart items |
| Order | `order_db` | Orders, order items |
| Payment | `payment_db` | Payments, payment transactions |
| Tutorial | `tutorial_db` | Tutorials, tutorial categories |

Services should not directly access another service's database. Cross-service data should be obtained through APIs or asynchronous events.

For example, the Order Service can request product information from the Product Service and store a snapshot of the product name and price in the order.

## 6. API Communication

RESTful APIs are used for communication between the frontend, API Gateway, and backend services.

Example request flow for placing an order:

1. The user adds products to the Cart Service.
2. The frontend sends a checkout request through the API Gateway.
3. The Order Service validates the cart and product information.
4. The Order Service creates a pending order.
5. The Payment Service processes a simulated payment.
6. The order status is updated based on the payment result.
7. The frontend displays the order confirmation.

All API requests and responses use JSON unless another format is explicitly required.

JWT access tokens are used to authenticate protected requests.

## 7. Project Structure

mQTT-Microservices-Web/
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

Each backend service should contain its own source code, configuration, database schema, tests, and Dockerfile.

## 8. Development and Deployment Tools

### Docker and Docker Compose

Docker packages each service and its dependencies into a container.

Docker Compose is used during local development to run the frontend, API Gateway, backend services, and databases together.

### Kubernetes

Kubernetes is used to orchestrate containers in a cluster. It can manage deployments, service discovery, scaling, configuration, and recovery of failed containers.

Minikube can provide a local Kubernetes environment for learning and demonstration.

### Postman

Postman is used to test REST APIs independently before connecting them to the frontend.

### Prisma ORM

Prisma provides database access, schema management, and migrations for Node.js applications using PostgreSQL.

### GitHub Actions

GitHub Actions can automate linting, tests, Docker image builds, and deployment workflows.

### RabbitMQ (Optional)

RabbitMQ can support asynchronous communication between services. For example, an order-created event can trigger a notification or other background task without requiring every operation to run synchronously.

### Redis (Optional)

Redis can be used for caching frequently accessed data or temporary session-related data when needed.

## 9. Development Roadmap

### Phase 1 — Project Setup
- Create the GitHub repository.
- Define the architecture and API contracts.
- Set up the frontend and backend project structure.
- Establish Git branching and collaboration conventions.

### Phase 2 — Core Services
- Implement Product Service CRUD operations.
- Implement User Service and authentication.
- Implement Cart Service.
- Implement Order Service and simulated Payment Service.
- Implement Tutorial Service.

### Phase 3 — Frontend Integration
- Build the home page and product catalog.
- Implement product details and tutorial pages.
- Implement login and registration.
- Implement the shopping cart and checkout flow.
- Display order history and payment status.

### Phase 4 — Containerization
- Create a Dockerfile for each application.
- Configure Docker Compose.
- Connect services and databases.
- Test the entire application locally.

### Phase 5 — Testing and Deployment
- Test APIs using Postman.
- Add automated tests.
- Add logging and error handling.
- Deploy the application locally using Minikube.
- Document the deployment and architecture.

### Phase 6 — Optional Improvements
- Introduce RabbitMQ for event-driven communication.
- Add Redis caching.
- Set up GitHub Actions for CI/CD.
- Add monitoring and centralized logging.

## 10. Getting Started

Prerequisites:
- Node.js and npm
- Git
- Docker Desktop with Docker Compose
- A code editor such as Visual Studio Code

Initial setup:

git clone <repository-url>
cd mQTT


Install dependencies separately in the frontend, API Gateway, and each service directory as they are implemented.

Configure environment variables using `.env.example`. Do not commit actual credentials or secrets to GitHub.

During early development, run individual services directly with Node.js and use their API documentation or Postman to test them. Once the core services work independently, use Docker Compose to run the integrated application.

## 11. Project Scope

The initial version focuses on essential e-commerce and tutorial functionality. Real payment processing, complex inventory synchronization, recommendation systems, and production Kubernetes deployment are outside the initial scope.

The goal is to demonstrate a working microservices-based web application, REST API integration, independent service responsibilities, containerization, and collaborative software development.

## 12. License

The project license will be specified in the repository's `LICENSE` file.