const { AppError } = require('../lib/errors');

function createCartService({ prisma, productClient }) {
  async function getCartRecord(userId) {
    return prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async function getCart(userId, token) {
    const cart = await getCartRecord(userId);
    const items = await Promise.all((cart?.items || []).map(async (item) => {
      const product = await productClient.getProduct(item.productId, token);
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          name: product.name,
          price: Number(product.price),
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
        },
        subtotal: Number(product.price) * item.quantity,
      };
    }));

    return {
      id: cart?.id ?? null,
      items,
      total: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }

  async function addItem(userId, token, { productId, quantity }) {
    const product = await productClient.getProduct(productId, token);
    if (Number.isFinite(Number(product.stock)) && quantity > Number(product.stock)) {
      throw new AppError(409, 'Requested quantity exceeds available stock');
    }

    const cart = await prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return getCart(userId, token);
  }

  async function updateItem(userId, token, itemId, quantity) {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new AppError(404, 'Cart item not found');

    const product = await productClient.getProduct(item.productId, token);
    if (Number.isFinite(Number(product.stock)) && quantity > Number(product.stock)) {
      throw new AppError(409, 'Requested quantity exceeds available stock');
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return getCart(userId, token);
  }

  async function removeItem(userId, token, itemId) {
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new AppError(404, 'Cart item not found');
    await prisma.cartItem.delete({ where: { id: item.id } });
    return getCart(userId, token);
  }

  async function clearCart(userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  return { getCart, addItem, updateItem, removeItem, clearCart };
}

module.exports = { createCartService };
