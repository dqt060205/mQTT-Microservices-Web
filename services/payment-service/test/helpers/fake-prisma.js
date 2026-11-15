import { randomUUID } from 'node:crypto';

/** Minimal in-memory stand-in for the parts of Prisma that payment-service uses. */
export function createFakePrisma() {
  const rows = [];
  const matches = (row, where = {}) =>
    Object.entries(where).every(([key, value]) => row[key] === value);

  const payment = {
    async findUnique({ where }) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async findFirst({ where }) {
      return rows.find((row) => matches(row, where)) ?? null;
    },
    async create({ data }) {
      if (data.idempotencyKey && rows.some((row) => row.idempotencyKey === data.idempotencyKey)) {
        const error = new Error('Unique constraint failed');
        error.code = 'P2002';
        throw error;
      }
      const now = new Date();
      const row = {
        id: randomUUID(),
        providerRef: null,
        failureReason: null,
        idempotencyKey: null,
        refundedAt: null,
        createdAt: now,
        updatedAt: now,
        ...data
      };
      rows.push(row);
      return row;
    },
    async findMany({ where, take, skip }) {
      return rows
        .filter((row) => matches(row, where))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(skip, skip + take);
    },
    async count({ where }) {
      return rows.filter((row) => matches(row, where)).length;
    },
    async updateMany({ where, data }) {
      const hits = rows.filter((row) => matches(row, where));
      hits.forEach((row) => Object.assign(row, data, { updatedAt: new Date() }));
      return { count: hits.length };
    }
  };

  const client = {
    payment,
    rows,
    async $executeRaw() {
      return 0;
    },
    async $queryRaw() {
      return [{ ok: 1 }];
    },
    async $transaction(callback) {
      return typeof callback === 'function' ? callback(client) : Promise.all(callback);
    }
  };

  return client;
}
