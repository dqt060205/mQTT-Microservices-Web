import { randomUUID } from 'node:crypto';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fake "bank". No real money moves and no external API is called.
 *
 * To plug in a real gateway later (VNPay, MoMo, Stripe...), write another file with the
 * same shape and pass it to buildApp({ provider }):
 *
 *   name:    short identifier stored in payments.provider
 *   charge:  ({ orderId, amount }) => { status: 'SUCCESS' | 'FAILED', providerRef, failureReason }
 *   refund:  ({ providerRef, amount }) => void   (throw if the refund is rejected)
 */
export function createDemoProvider({
  delayMs = 0,
  failRate = 0,
  maxAmount = null,
  random = Math.random,
  sleep = defaultSleep
} = {}) {
  return {
    name: 'demo',

    async charge({ amount }) {
      if (delayMs > 0) {
        await sleep(delayMs);
      }

      const providerRef = 'demo_' + randomUUID();

      if (maxAmount !== null && amount > maxAmount) {
        return { status: 'FAILED', providerRef, failureReason: 'AMOUNT_LIMIT_EXCEEDED' };
      }

      if (failRate > 0 && random() < failRate) {
        return { status: 'FAILED', providerRef, failureReason: 'DEMO_RANDOM_DECLINE' };
      }

      return { status: 'SUCCESS', providerRef, failureReason: null };
    },

    async refund() {
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  };
}
