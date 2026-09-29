import express from 'express';
import { searchItems } from '../controllers/publicCatalogController.js';
import validate from '../middleware/validate.js';
import { itemSearchQuerySchema } from '../validators/searchValidator.js';

const router = express.Router();

// GET /api/search/items
router.get('/items', validate({ query: itemSearchQuerySchema }), searchItems);

export default router;
