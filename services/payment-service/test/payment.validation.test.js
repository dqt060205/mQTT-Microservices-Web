import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreatePayment,
  validateIdempotencyKey,
  validateListQuery,
  validatePaymentId
} from '../src/validation/payment.validation.js';

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (error) {
    return error.details.map((detail) => detail.field);
  }
  assert.fail('expected a validation error');
};

test('accepts a valid payment body', () => {
  assert.deepEqual(validateCreatePayment({ orderId: 'a1b2-c3', amount: 1999.99 }), {
    orderId: 'a1b2-c3',
    amount: 1999.99
  });
});

test('rejects unknown fields instead of ignoring them', () => {
  assert.deepEqual(
    fieldsOf(() => validateCreatePayment({ orderId: 'o1', amount: 5, status: 'SUCCESS' })),
    ['status']
  );
  assert.deepEqual(fieldsOf(() => validateCreatePayment(JSON.parse('{"__proto__":{"x":1},"orderId":"o1","amount":5}'))), [
    '__proto__'
  ]);
});

test('rejects bad amounts', () => {
  for (const amount of [0, -1, '10', NaN, Infinity, 10.123, 1e12, null, undefined]) {
    assert.deepEqual(fieldsOf(() => validateCreatePayment({ orderId: 'o1', amount })), ['amount'], String(amount));
  }
  assert.doesNotThrow(() => validateCreatePayment({ orderId: 'o1', amount: 9999999999.99 }));
  assert.doesNotThrow(() => validateCreatePayment({ orderId: 'o1', amount: 0.01 }));
});

test('rejects bad order ids', () => {
  for (const orderId of ['', 'a b', "o1'; DROP TABLE x;--", 'x'.repeat(65), 5, null, ['o1']]) {
    assert.deepEqual(fieldsOf(() => validateCreatePayment({ orderId, amount: 5 })), ['orderId']);
  }
});

test('rejects non-object bodies', () => {
  for (const body of [undefined, null, 'x', 5, []]) {
    assert.deepEqual(fieldsOf(() => validateCreatePayment(body)), ['body']);
  }
});

test('idempotency key is optional but validated', () => {
  assert.equal(validateIdempotencyKey(undefined), null);
  assert.equal(validateIdempotencyKey(''), null);
  assert.equal(validateIdempotencyKey('order-123-attempt-1'), 'order-123-attempt-1');
  assert.throws(() => validateIdempotencyKey('short'));
  assert.throws(() => validateIdempotencyKey('has spaces in it!'));
});

test('malformed payment ids look like unknown ids (404)', () => {
  assert.throws(() => validatePaymentId('nope'), (error) => error.statusCode === 404);
  assert.equal(
    validatePaymentId('3f2b8c1e-6a4d-4e0b-9d57-1c2a3b4c5d6e'),
    '3f2b8c1e-6a4d-4e0b-9d57-1c2a3b4c5d6e'
  );
});

test('list query: defaults, bounds and parameter pollution', () => {
  assert.deepEqual(validateListQuery({}), { orderId: undefined, limit: 20, offset: 0 });
  assert.deepEqual(validateListQuery({ orderId: 'o1', limit: '5', offset: '10' }), {
    orderId: 'o1',
    limit: 5,
    offset: 10
  });
  assert.deepEqual(fieldsOf(() => validateListQuery({ orderId: ['a', 'b'] })), ['orderId']);
  assert.deepEqual(fieldsOf(() => validateListQuery({ limit: ['1', '2'] })), ['limit']);
  assert.deepEqual(fieldsOf(() => validateListQuery({ limit: '1000' })), ['limit']);
  assert.deepEqual(fieldsOf(() => validateListQuery({ offset: '-1' })), ['offset']);
});
