import * as categoryService from '../services/category.service.js';
import {
  parseCategoryBody,
  parseUuidParam
} from '../validation/product.validation.js';

export async function listCategories(_req, res) {
  const categories = await categoryService.listCategories();

  res.status(200).json({
    success: true,
    data: categories
  });
}

export async function getCategory(req, res) {
  const id = parseUuidParam(req.params.id);
  const category = await categoryService.getCategoryById(id);

  res.status(200).json({
    success: true,
    data: category
  });
}

export async function createCategory(req, res) {
  const input = parseCategoryBody(req.body);
  const category = await categoryService.createCategory(input);

  res.status(201).json({
    success: true,
    data: category
  });
}

export async function updateCategory(req, res) {
  const id = parseUuidParam(req.params.id);
  const input = parseCategoryBody(req.body, { partial: true });
  const category = await categoryService.updateCategory(id, input);

  res.status(200).json({
    success: true,
    data: category
  });
}

export async function deleteCategory(req, res) {
  const id = parseUuidParam(req.params.id);
  await categoryService.deleteCategory(id);
  res.status(204).send();
}
