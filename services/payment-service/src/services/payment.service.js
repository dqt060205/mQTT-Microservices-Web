import { ApiError } from '../utils/api-error.js';

function sameAmount(a, b) {
  return Number(a) === Number(b);
}

/** What clients (and order-service) get to see. providerRef / idempotencyKey stay internal. */
export function toPublicPayment(payment) {
  return {
    id: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    amount: Number(payment.amount),
    status: payment.status,
    provider: payment.provider,
    failureReason: payment.failureReason ?? null,
    refundedAt: payment.refundedAt ?? null,
    createdAt: payment.createdAt
  };
}

/**
 * Business logic of payment-service. Dependencies are injected so it can be unit-tested
 * without a database or a real payment gateway.
 */
export function createPaymentService({ prisma, provider, logger = console }) {
  function assertOwnerOrAdmin(payment, user) {
    // 404 (not 403) so other people's payment ids cannot be probed
    if (!payment || (user.role !== 'admin' && payment.userId !== user.id)) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'The payment was not found.');
    }
  }

  async function createPayment({ userId, orderId, amount, idempotencyKey }) {
    return prisma.$transaction(
      async (tx) => {
        // Serialise concurrent requests for the same order: no double charge.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;

        // 1. Replay of a request we already handled
        if (idempotencyKey) {
          const previous = await tx.payment.findUnique({ where: { idempotencyKey } });

          if (previous) {
            if (
              previous.userId !== userId ||
              previous.orderId !== orderId ||
              !sameAmount(previous.amount, amount)
            ) {
              throw new ApiError(
                409,
                'IDEMPOTENCY_KEY_REUSED',
                'This Idempotency-Key was already used for a different request.'
              );
            }

            return { payment: toPublicPayment(previous), created: false };
          }
        }

        // 2. An order can be paid only once
        const alreadyPaid = await tx.payment.findFirst({
          where: { orderId, status: 'SUCCESS' }
        });

        if (alreadyPaid) {
          if (alreadyPaid.userId === userId && sameAmount(alreadyPaid.amount, amount)) {
            return { payment: toPublicPayment(alreadyPaid), created: false };
          }

          throw new ApiError(409, 'ORDER_ALREADY_PAID', 'This order has already been paid.');
        }

        // 3. Ask the provider (the fake bank, for now)
        let outcome;

        try {
          outcome = await provider.charge({ orderId, amount });
        } catch (error) {
          logger.error('Payment provider error for order ' + orderId + ': ' + error.message);
          outcome = { status: 'FAILED', providerRef: null, failureReason: 'PROVIDER_ERROR' };
        }

        // 4. Record the attempt, success or not
        const payment = await tx.payment.create({
          data: {
            orderId,
            userId,
            amount,
            status: outcome.status,
            provider: provider.name,
            providerRef: outcome.providerRef ?? null,
            failureReason: outcome.failureReason ?? null,
            idempotencyKey
          }
        });

        return { payment: toPublicPayment(payment), created: true };
      },
      // The lock is held while the provider answers; a real gateway may be slower than the default 5 s.
      { timeout: 15000, maxWait: 5000 }
    );
  }

  async function getPayment({ id, user }) {
    const payment = await prisma.payment.findUnique({ where: { id } });
    assertOwnerOrAdmin(payment, user);
    return toPublicPayment(payment);
  }

  async function listPayments({ user, orderId, limit, offset }) {
    const where = {};

    if (user.role !== 'admin') {
      where.userId = user.id;
    }

    if (orderId !== undefined) {
      where.orderId = orderId;
    }

    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.payment.count({ where })
    ]);

    return {
      data: rows.map(toPublicPayment),
      pagination: { total, limit, offset }
    };
  }

  /** Admin only (enforced by the route). Later order-service will call this when a PAID order is cancelled. */
  async function refundPayment({ id }) {
    const payment = await prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'The payment was not found.');
    }

    if (payment.status === 'REFUNDED') {
      return toPublicPayment(payment);
    }

    if (payment.status !== 'SUCCESS') {
      throw new ApiError(
        409,
        'PAYMENT_NOT_REFUNDABLE',
        'Only successful payments can be refunded.'
      );
    }

    try {
      await provider.refund({ providerRef: payment.providerRef, amount: Number(payment.amount) });
    } catch (error) {
      logger.error('Refund rejected for payment ' + id + ': ' + error.message);
      throw new ApiError(502, 'REFUND_REJECTED', 'The payment provider rejected the refund.');
    }

    // Only one concurrent refund can flip SUCCESS -> REFUNDED
    const { count } = await prisma.payment.updateMany({
      where: { id, status: 'SUCCESS' },
      data: { status: 'REFUNDED', refundedAt: new Date() }
    });

    const current = await prisma.payment.findUnique({ where: { id } });

    if (count === 0 && current?.status !== 'REFUNDED') {
      throw new ApiError(409, 'PAYMENT_NOT_REFUNDABLE', 'Only successful payments can be refunded.');
    }

    return toPublicPayment(current);
  }

  return { createPayment, getPayment, listPayments, refundPayment };
}
