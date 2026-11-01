// Minimal in-memory stand-in for the Prisma calls used by order.service.js
function createFakePrisma() {
  const orders = [];
  let seq = 0;
  return {
    orders,
    order: {
      async create({ data }) {
        const { items, ...rest } = data;
        const id = `order-${++seq}`;
        const order = {
          id,
          paymentId: null,
          createdAt: new Date(),
          ...rest,
          items: items.create.map((item, i) => ({ id: `${id}-item-${i}`, ...item })),
        };
        orders.push(order);
        return order;
      },
      async update({ where, data }) {
        const order = orders.find((o) => o.id === where.id);
        Object.assign(order, data);
        return order;
      },
      async findFirst({ where }) {
        return (
          orders.find(
            (o) => o.id === where.id && (where.userId === undefined || o.userId === where.userId),
          ) ?? null
        );
      },
      async updateMany({ where, data }) {
        const order = orders.find((o) => o.id === where.id && where.status.in.includes(o.status));
        if (!order) return { count: 0 };
        Object.assign(order, data);
        return { count: 1 };
      },
    },
  };
}

module.exports = { createFakePrisma };
