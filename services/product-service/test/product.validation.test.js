import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCategoryBody,
  parseProductBody,
  parseProductQuery,
  slugify
} from '../src/validation/product.validation.js';

test('slugify handles Vietnamese text', () => {
  assert.equal(slugify('Cảm biến Nhiệt độ Độ ẩm'), 'cam-bien-nhiet-do-do-am');
});

test('parseProductBody normalizes a valid create payload', () => {
  const result = parseProductBody({
    name: 'ESP32 Development Board',
    sku: 'mqtt-esp32-001',
    price: 12.9,
    stock: 10
  });

  assert.deepEqual(result, {
    name: 'ESP32 Development Board',
    slug: 'esp32-development-board',
    sku: 'MQTT-ESP32-001',
    price: '12.90',
    stock: 10
  });
});

test('parseProductBody rejects invalid price and stock', () => {
  assert.throws(
    () =>
      parseProductBody({
        name: 'Sensor',
        sku: 'SENSOR-001',
        price: 0,
        stock: -1
      }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(error.details.length, 2);
      return true;
    }
  );
});

test('parseProductBody requires at least one field for patch', () => {
  assert.throws(
    () => parseProductBody({}, { partial: true }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
});

test('parseCategoryBody derives slug from category name', () => {
  assert.deepEqual(parseCategoryBody({ name: 'Development Boards' }), {
    name: 'Development Boards',
    slug: 'development-boards'
  });
});

test('parseProductQuery parses pagination, filters and sorting', () => {
  assert.deepEqual(
    parseProductQuery({
      page: '2',
      limit: '10',
      minPrice: '5',
      maxPrice: '20.50',
      inStock: 'true',
      sortBy: 'price',
      sortOrder: 'asc'
    }),
    {
      page: 2,
      limit: 10,
      search: undefined,
      category: undefined,
      minPrice: '5.00',
      maxPrice: '20.50',
      inStock: true,
      sortBy: 'price',
      sortOrder: 'asc'
    }
  );
});
