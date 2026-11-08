const express = require('express');
const { z } = require('zod');
const { AppError } = require('../lib/errors');
const { authenticate } = require('../middlewares/auth');

const addItemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().positive().max(999),
});
const updateItemSchema = z.object({
  quantity: z.number().int().positive().max(999),
});

function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError(400, result.error.issues[0].message);
  return result.data;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createCartRouter(cartService) {
  const router = express.Router();
  router.use(authenticate);

  router.get('/', asyncRoute(async (req, res) => {
    res.json(await cartService.getCart(req.user.id, req.token));
  }));

  router.post('/items', asyncRoute(async (req, res) => {
    const item = parse(addItemSchema, req.body);
    res.status(200).json(await cartService.addItem(req.user.id, req.token, item));
  }));

  router.patch('/items/:itemId', asyncRoute(async (req, res) => {
    const { quantity } = parse(updateItemSchema, req.body);
    res.json(await cartService.updateItem(req.user.id, req.token, req.params.itemId, quantity));
  }));

  router.delete('/items/:itemId', asyncRoute(async (req, res) => {
    res.json(await cartService.removeItem(req.user.id, req.token, req.params.itemId));
  }));

  router.delete('/', asyncRoute(async (req, res) => {
    await cartService.clearCart(req.user.id);
    res.status(204).end();
  }));

  return router;
}

module.exports = { createCartRouter };
