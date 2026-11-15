function readNumber(env, name, fallback, { min, max }) {
  const raw = env[name];

  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(name + ' must be a number between ' + min + ' and ' + max + '.');
  }

  return value;
}

/** Reads the demo-provider settings. Invalid values fail fast at startup. */
export function loadPaymentConfig(env = process.env) {
  return {
    demoDelayMs: readNumber(env, 'PAYMENT_DEMO_DELAY_MS', 300, { min: 0, max: 10000 }),
    demoFailRate: readNumber(env, 'PAYMENT_DEMO_FAIL_RATE', 0, { min: 0, max: 1 }),
    demoMaxAmount: readNumber(env, 'PAYMENT_DEMO_MAX_AMOUNT', null, {
      min: 0.01,
      max: 9999999999.99
    })
  };
}
