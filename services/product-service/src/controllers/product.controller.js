import * as productService from '../services/product.service.js';
import {
  parseProductBody,
  parseProductQuery,
  parseUuidParam
} from '../validation/product.validation.js';

export async function listProducts(req, res) {
  const filters = parseProductQuery(req.query);
  const result = await productService.listProducts(filters);

  res.status(200).json({
    success: true,
    data: result.items,
    meta: {
      pagination: result.pagination
    }
  });
}

export async function getProduct(req, res) {
  const id = parseUuidParam(req.params.id);
  const product = await productService.getProductById(id);

  res.status(200).json({
    success: true,
    data: product
  });
}

export async function createProduct(req, res) {
  const input = parseProductBody(req.body);
  const product = await productService.createProduct(input);

  res.status(201).json({
    success: true,
    data: product
  });
}

export async function updateProduct(req, res) {
  const id = parseUuidParam(req.params.id);
  const input = parseProductBody(req.body, { partial: true });
  const product = await productService.updateProduct(id, input);

  res.status(200).json({
    success: true,
    data: product
  });
}

export async function deleteProduct(req, res) {
  const id = parseUuidParam(req.params.id);
  await productService.deleteProduct(id);
  res.status(204).send();
}
