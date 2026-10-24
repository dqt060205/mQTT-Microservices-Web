import { ApiError } from '../utils/api-error.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]*$/;
const PRODUCT_FIELDS = new Set([
  'name',
  'slug',
  'sku',
  'description',
  'price',
  'stock',
  'imageUrl',
  'categoryId'
]);
const CATEGORY_FIELDS = new Set(['name', 'slug', 'description']);

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertPlainObject(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Request body must be a JSON object.'
    );
  }
}

function addUnknownFieldErrors(body, allowedFields, errors) {
  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      errors.push({
        field,
        message: 'Unknown field.'
      });
    }
  }
}

function readText(value, field, options = {}) {
  const {
    min = 1,
    max = 255,
    nullable = false
  } = options;

  if (value === null && nullable) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(field + ' must be a string.');
  }

  const normalized = value.trim();

  if (normalized.length < min || normalized.length > max) {
    throw new Error(
      field + ' must contain between ' + min + ' and ' + max + ' characters.'
    );
  }

  return normalized;
}

function readMoney(value, field, options = {}) {
  const { allowZero = false } = options;
  const normalized =
    typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'string'
        ? value.trim()
        : '';

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(
      field + ' must be a valid amount with at most two decimal places.'
    );
  }

  const numericValue = Number(normalized);

  if (
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    (!allowZero && numericValue === 0) ||
    numericValue > 9999999999.99
  ) {
    throw new Error(
      field + (allowZero ? ' must be non-negative.' : ' must be greater than zero.')
    );
  }

  return numericValue.toFixed(2);
}

function readInteger(value, field, options = {}) {
  const { min = 0, max = 2147483647 } = options;

  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      field + ' must be an integer between ' + min + ' and ' + max + '.'
    );
  }

  return value;
}

function readNullableUrl(value) {
  if (value === null || value === '') {
    return null;
  }

  const normalized = readText(value, 'imageUrl', {
    min: 1,
    max: 2048
  });

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('imageUrl must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('imageUrl must use HTTP or HTTPS.');
  }

  return parsed.toString();
}

function capture(errors, field, reader) {
  try {
    return reader();
  } catch (error) {
    errors.push({
      field,
      message: error.message
    });
    return undefined;
  }
}

function throwIfInvalid(errors) {
  if (errors.length > 0) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed.',
      errors
    );
  }
}

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function isUuid(value) {
  return UUID_PATTERN.test(value);
}

export function parseUuidParam(value, field = 'id') {
  if (!isUuid(value)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      field + ' must be a valid UUID.',
      [{ field, message: 'Invalid UUID.' }]
    );
  }

  return value;
}

export function parseProductBody(body, options = {}) {
  const { partial = false } = options;
  assertPlainObject(body);

  const errors = [];
  const output = {};
  addUnknownFieldErrors(body, PRODUCT_FIELDS, errors);

  if (hasOwn(body, 'name')) {
    output.name = capture(errors, 'name', () =>
      readText(body.name, 'name', { min: 2, max: 180 })
    );
  } else if (!partial) {
    errors.push({ field: 'name', message: 'name is required.' });
  }

  if (hasOwn(body, 'slug')) {
    output.slug = capture(errors, 'slug', () => {
      const slug = readText(body.slug, 'slug', { min: 2, max: 200 }).toLowerCase();

      if (!SLUG_PATTERN.test(slug)) {
        throw new Error(
          'slug may only contain lowercase letters, numbers and hyphens.'
        );
      }

      return slug;
    });
  } else if (!partial && output.name) {
    output.slug = slugify(output.name);

    if (!output.slug) {
      errors.push({
        field: 'slug',
        message: 'A slug could not be generated from name.'
      });
    }
  }

  if (hasOwn(body, 'sku')) {
    output.sku = capture(errors, 'sku', () => {
      const sku = readText(body.sku, 'sku', { min: 2, max: 80 }).toUpperCase();

      if (!SKU_PATTERN.test(sku)) {
        throw new Error(
          'sku may only contain letters, numbers, periods, underscores and hyphens.'
        );
      }

      return sku;
    });
  } else if (!partial) {
    errors.push({ field: 'sku', message: 'sku is required.' });
  }

  if (hasOwn(body, 'description')) {
    output.description = capture(errors, 'description', () =>
      readText(body.description, 'description', {
        min: 1,
        max: 5000,
        nullable: true
      })
    );
  }

  if (hasOwn(body, 'price')) {
    output.price = capture(errors, 'price', () =>
      readMoney(body.price, 'price')
    );
  } else if (!partial) {
    errors.push({ field: 'price', message: 'price is required.' });
  }

  if (hasOwn(body, 'stock')) {
    output.stock = capture(errors, 'stock', () =>
      readInteger(body.stock, 'stock')
    );
  }

  if (hasOwn(body, 'imageUrl')) {
    output.imageUrl = capture(errors, 'imageUrl', () =>
      readNullableUrl(body.imageUrl)
    );
  }

  if (hasOwn(body, 'categoryId')) {
    output.categoryId = capture(errors, 'categoryId', () => {
      if (body.categoryId === null || body.categoryId === '') {
        return null;
      }

      if (typeof body.categoryId !== 'string' || !isUuid(body.categoryId)) {
        throw new Error('categoryId must be a valid UUID or null.');
      }

      return body.categoryId;
    });
  }

  if (partial && Object.keys(body).length === 0) {
    errors.push({
      field: 'body',
      message: 'At least one product field must be provided.'
    });
  }

  throwIfInvalid(errors);
  return output;
}

export function parseCategoryBody(body, options = {}) {
  const { partial = false } = options;
  assertPlainObject(body);

  const errors = [];
  const output = {};
  addUnknownFieldErrors(body, CATEGORY_FIELDS, errors);

  if (hasOwn(body, 'name')) {
    output.name = capture(errors, 'name', () =>
      readText(body.name, 'name', { min: 2, max: 120 })
    );
  } else if (!partial) {
    errors.push({ field: 'name', message: 'name is required.' });
  }

  if (hasOwn(body, 'slug')) {
    output.slug = capture(errors, 'slug', () => {
      const slug = readText(body.slug, 'slug', { min: 2, max: 140 }).toLowerCase();

      if (!SLUG_PATTERN.test(slug)) {
        throw new Error(
          'slug may only contain lowercase letters, numbers and hyphens.'
        );
      }

      return slug;
    });
  } else if (!partial && output.name) {
    output.slug = slugify(output.name);

    if (!output.slug) {
      errors.push({
        field: 'slug',
        message: 'A slug could not be generated from name.'
      });
    }
  }

  if (hasOwn(body, 'description')) {
    output.description = capture(errors, 'description', () =>
      readText(body.description, 'description', {
        min: 1,
        max: 2000,
        nullable: true
      })
    );
  }

  if (partial && Object.keys(body).length === 0) {
    errors.push({
      field: 'body',
      message: 'At least one category field must be provided.'
    });
  }

  throwIfInvalid(errors);
  return output;
}

function readSingleQueryValue(value, field) {
  if (Array.isArray(value)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      field + ' must be provided only once.',
      [{ field, message: 'Multiple values are not allowed.' }]
    );
  }

  return value;
}

function readPositiveQueryInteger(value, field, defaultValue, max) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = readSingleQueryValue(value, field);

  if (!/^\d+$/.test(normalized)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      field + ' must be a positive integer.'
    );
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      field + ' must be between 1 and ' + max + '.'
    );
  }

  return parsed;
}

export function parseProductQuery(query) {
  const page = readPositiveQueryInteger(query.page, 'page', 1, 1000000);
  const limit = readPositiveQueryInteger(query.limit, 'limit', 20, 100);
  const searchValue = readSingleQueryValue(query.search, 'search');
  const categoryValue = readSingleQueryValue(query.category, 'category');
  const minPriceValue = readSingleQueryValue(query.minPrice, 'minPrice');
  const maxPriceValue = readSingleQueryValue(query.maxPrice, 'maxPrice');
  const inStockValue = readSingleQueryValue(query.inStock, 'inStock');
  const sortByValue =
    readSingleQueryValue(query.sortBy, 'sortBy') ?? 'createdAt';
  const sortOrderValue =
    readSingleQueryValue(query.sortOrder, 'sortOrder') ?? 'desc';
  const errors = [];

  let search;
  let category;
  let minPrice;
  let maxPrice;
  let inStock;

  if (searchValue !== undefined) {
    search = capture(errors, 'search', () =>
      readText(searchValue, 'search', { min: 1, max: 100 })
    );
  }

  if (categoryValue !== undefined) {
    category = capture(errors, 'category', () => {
      const normalized = readText(categoryValue, 'category', {
        min: 1,
        max: 140
      }).toLowerCase();

      if (!isUuid(normalized) && !SLUG_PATTERN.test(normalized)) {
        throw new Error('category must be a category UUID or slug.');
      }

      return normalized;
    });
  }

  if (minPriceValue !== undefined) {
    minPrice = capture(errors, 'minPrice', () =>
      readMoney(minPriceValue, 'minPrice', { allowZero: true })
    );
  }

  if (maxPriceValue !== undefined) {
    maxPrice = capture(errors, 'maxPrice', () =>
      readMoney(maxPriceValue, 'maxPrice', { allowZero: true })
    );
  }

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    Number(minPrice) > Number(maxPrice)
  ) {
    errors.push({
      field: 'minPrice',
      message: 'minPrice cannot be greater than maxPrice.'
    });
  }

  if (inStockValue !== undefined) {
    if (!['true', 'false'].includes(inStockValue)) {
      errors.push({
        field: 'inStock',
        message: 'inStock must be true or false.'
      });
    } else {
      inStock = inStockValue === 'true';
    }
  }

  const allowedSortFields = ['createdAt', 'name', 'price', 'stock'];

  if (!allowedSortFields.includes(sortByValue)) {
    errors.push({
      field: 'sortBy',
      message: 'sortBy must be one of: ' + allowedSortFields.join(', ') + '.'
    });
  }

  if (!['asc', 'desc'].includes(sortOrderValue)) {
    errors.push({
      field: 'sortOrder',
      message: 'sortOrder must be asc or desc.'
    });
  }

  throwIfInvalid(errors);

  return {
    page,
    limit,
    search,
    category,
    minPrice,
    maxPrice,
    inStock,
    sortBy: sortByValue,
    sortOrder: sortOrderValue
  };
}
