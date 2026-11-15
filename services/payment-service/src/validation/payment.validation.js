import { ApiError } from '../utils/api-error.js';

const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,100}$/;
const MAX_AMOUNT = 9999999999.99; // DECIMAL(12,2)
const CREATE_FIELDS = new Set(['orderId', 'amount']);

function validationError(details) {
  return new ApiError(400, 'VALIDATION_ERROR', 'The request is invalid.', details);
}

/**
 * Body of POST /api/payments. Unknown fields are rejected (not ignored), so a client can
 * never smuggle in `status`, `userId`, `provider`... even if the model gains them later.
 */
export function validateCreatePayment(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError([{ field: 'body', message: 'Request body must be a JSON object.' }]);
  }

  const details = [];

  for (const key of Object.keys(body)) {
    if (!CREATE_FIELDS.has(key)) {
      details.push({ field: key, message: 'Unknown field.' });
    }
  }

  const { orderId, amount } = body;

  if (typeof orderId !== 'string' || !ORDER_ID_PATTERN.test(orderId)) {
    details.push({
      field: 'orderId',
      message: 'orderId must be 1-64 characters: letters, digits, "-" or "_".'
    });
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    details.push({ field: 'amount', message: 'amount must be a number.' });
  } else if (amount <= 0) {
    details.push({ field: 'amount', message: 'amount must be greater than 0.' });
  } else if (amount > MAX_AMOUNT) {
    details.push({ field: 'amount', message: 'amount is too large.' });
  } else if (Number(amount.toFixed(2)) !== amount) {
    details.push({ field: 'amount', message: 'amount can have at most 2 decimal places.' });
  }

  if (details.length > 0) {
    throw validationError(details);
  }

  return { orderId, amount };
}

/** Optional `Idempotency-Key` header. Returns null when absent. */
export function validateIdempotencyKey(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const key = String(value).trim();

  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw validationError([
      {
        field: 'Idempotency-Key',
        message: 'Idempotency-Key must be 8-100 characters: letters, digits, "_", ".", ":" or "-".'
      }
    ]);
  }

  return key;
}

/** Malformed ids are reported as 404 (same as unknown ids): no information leak. */
export function validatePaymentId(id) {
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'The payment was not found.');
  }

  return id;
}

function readSingle(query, name, details) {
  const value = query[name];

  // `?orderId=a&orderId=b` makes Express return an array: reject it (HTTP parameter pollution)
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    details.push({ field: name, message: name + ' must be a single value.' });
    return undefined;
  }

  return value === '' ? undefined : value;
}

function readInteger(query, name, fallback, { min, max }, details) {
  const raw = readSingle(query, name, details);

  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < min || value > max) {
    details.push({
      field: name,
      message: name + ' must be an integer between ' + min + ' and ' + max + '.'
    });
    return fallback;
  }

  return value;
}

/** Query of GET /api/payments */
export function validateListQuery(query = {}) {
  const details = [];
  const orderId = readSingle(query, 'orderId', details);

  if (orderId !== undefined && !ORDER_ID_PATTERN.test(String(orderId))) {
    details.push({ field: 'orderId', message: 'orderId is not valid.' });
  }

  const limit = readInteger(query, 'limit', 20, { min: 1, max: 100 }, details);
  const offset = readInteger(query, 'offset', 0, { min: 0, max: 1000000 }, details);

  if (details.length > 0) {
    throw validationError(details);
  }

  return { orderId: orderId === undefined ? undefined : String(orderId), limit, offset };
}
