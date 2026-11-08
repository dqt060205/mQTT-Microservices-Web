import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT, 10) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  proxyTimeout: parseInt(process.env.PROXY_TIMEOUT_MS, 10) || 10000,
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500,
  },
  services: {
    user: {
      id: 'user-service',
      name: 'User Service',
      url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      routes: ['/api/users', '/users'],
      description: 'Quản lý tài khoản, xác thực JWT, thông tin người dùng',
    },
    product: {
      id: 'product-service',
      name: 'Product Service',
      url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
      routes: ['/api/products', '/products', '/api/categories', '/categories'],
      description: 'Quản lý danh mục, thông tin thiết bị IoT và sản phẩm',
    },
    cart: {
      id: 'cart-service',
      name: 'Cart Service',
      url: process.env.CART_SERVICE_URL || 'http://localhost:3003',
      routes: ['/api/cart', '/cart'],
      description: 'Quản lý giỏ hàng người dùng',
    },
    order: {
      id: 'order-service',
      name: 'Order Service',
      url: process.env.ORDER_SERVICE_URL || 'http://localhost:3004',
      routes: ['/api/orders', '/orders'],
      description: 'Tạo và quản lý đơn hàng, theo dõi trạng thái',
    },
    payment: {
      id: 'payment-service',
      name: 'Payment Service',
      url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
      routes: ['/api/payments', '/payments'],
      description: 'Xử lý và theo dõi thanh toán mô phỏng',
    },
    tutorial: {
      id: 'tutorial-service',
      name: 'Tutorial Service',
      url: process.env.TUTORIAL_SERVICE_URL || 'http://localhost:3006',
      routes: ['/api/tutorials', '/tutorials'],
      description: 'Bài viết hướng dẫn kỹ thuật IoT liên quan',
    },
  },
};

