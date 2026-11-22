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
    const items = (await Promise.all((cart?.items || []).map(async (item) => {
      let product;
      try {
        product = await productClient.getProduct(item.productId, token);
      } catch (err) {
        // A product deleted after it was added must not make the whole cart unreadable.
        if (err.status === 404) return null;
        throw err;
      }
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.productId,
          name: product.name,
          price: Number(product.price),
          ...(Number.isFinite(Number(product.stock)) ? { stock: Number(product.stock) } : {}),
          ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
          ...(product.category?.name ? { category: { name: product.category.name } } : {}),
        },
        subtotal: Number(product.price) * item.quantity,
      };
    }))).filter(Boolean);

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