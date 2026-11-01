const { AppError } = require('../lib/errors');

// TODO: PAID orders should trigger a refund through payment-service on cancel.
const CANCELLABLE = ['PENDING', 'PAYMENT_FAILED', 'PAID'];

/**
 * Business logic for orders. Dependencies are injected so the service
 * can be unit-tested without a database or other services.
 */
function createOrderService({ prisma, cartClient, productClient, paymentClient, logger = console }) {
  async function loadLine(cartItem, token) {
    let product;
    try {
      product = await productClient.getProduct(cartItem.productId, token);
    } catch (err) {
      if (err.upstreamStatus === 404) {
        throw new AppError(400, `Product ${cartItem.productId} no longer exists`);
      }
      throw err;
    }
    if (product.stock != null && product.stock < cartItem.quantity) {
      throw new AppError(409, `Not enough stock for "${product.name}"`);
    }
    return {
      productId: String(product.id),
      productName: product.name,
      imageUrl: product.imageUrl ?? null,
      unitPrice: Number(product.price), // snapshot of the price at purchase time
      quantity: cartItem.quantity,
    };
  }

  async function createOrder({ userId, token, shipping }) {
    // 1. Validate cart + product information
    const cart = await cartClient.getCart(token);
    const cartItems = cart?.items ?? [];
    if (cartItems.length === 0) throw new AppError(400, 'Cart is empty');

    const lines = await Promise.all(cartItems.map((item) => loadLine(item, token)));

    // Money is summed in minor units to avoid floating point drift
    const totalCents = lines.reduce(
      (sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity,
      0,
    );
    const totalAmount = (totalCents / 100).toFixed(2);

    // 2. Create the PENDING order
    const order = await prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        totalAmount,
        ...shipping,
        items: {
          create: lines.map((l) => ({ ...l, unitPrice: l.unitPrice.toFixed(2) })),
        },
      },
      include: { items: true },
    });

    // 3. Ask payment-service (simulated). Any failure keeps the order, marked PAYMENT_FAILED.
    let paymentId = null;
    let paid = false;
    try {
      const payment = await paymentClient.pay({ orderId: order.id, amount: Number(totalAmount) }, token);
      paymentId = payment?.id != null ? String(payment.id) : null;
      paid = String(payment?.status).toUpperCase() === 'SUCCESS';
    } catch (err) {
      logger.error(`Payment failed for order ${order.id}: ${err.message}`);
    }

    // 4. Update status from the payment result
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: paid ? 'PAID' : 'PAYMENT_FAILED', paymentId },
      include: { items: true },
    });

    // 5. Empty the cart only when the purchase went through
    if (paid) {
      await cartClient.clearCart(token).catch((err) =>
        logger.error(`Could not clear cart for user ${userId}: ${err.message}`),
      );
    }
    return updated;
  }

  async function listOrders({ userId, page, limit, status }) {
    const where = { userId, ...(status ? { status } : {}) };
    const [total, data] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true },
      }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async function getOrder({ id, userId, role }) {
    const order = await prisma.order.findFirst({
      where: role === 'admin' ? { id } : { id, userId },
      include: { items: true },
    });
    // 404 (not 403) so order ids of other users are not revealed
    if (!order) throw new AppError(404, 'Order not found');
    return order;
  }

  async function cancelOrder({ id, userId, role }) {
    const order = await getOrder({ id, userId, role });
    if (!CANCELLABLE.includes(order.status)) {
      throw new AppError(409, `Orders with status ${order.status} cannot be cancelled`);
    }
    // Conditional update guards against a concurrent status change
    const { count } = await prisma.order.updateMany({
      where: { id: order.id, status: { in: CANCELLABLE } },
      data: { status: 'CANCELLED' },
    });
    if (count === 0) throw new AppError(409, 'Order status changed, please retry');
    return getOrder({ id, userId, role });
  }

  return { createOrder, listOrders, getOrder, cancelOrder };
}

module.exports = { createOrderService, CANCELLABLE };
