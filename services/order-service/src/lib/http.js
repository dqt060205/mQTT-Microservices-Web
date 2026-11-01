const env = require('../config/env');
const { AppError } = require('./errors');

/**
 * Small fetch wrapper for service-to-service calls.
 * Forwards the caller's JWT so downstream services can authenticate the user.
 * Errors carry `upstreamStatus` so callers can react to e.g. a 404.
 */
async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(env.requestTimeoutMs),
    });
  } catch {
    throw new AppError(503, `Upstream service unreachable (${baseUrl})`);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new AppError(
      res.status >= 500 ? 502 : res.status,
      data?.message || `Upstream request failed (${res.status})`,
    );
    err.upstreamStatus = res.status;
    throw err;
  }
  return data;
}

module.exports = { request };
