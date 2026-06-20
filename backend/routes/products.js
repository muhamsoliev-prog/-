import express from 'express';
import auth from '../middleware/auth.js';
import Product from '../models/Product.js';

const router = express.Router();

// Получить список товаров
router.get('/list', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = 'position', sortOrder = 'asc', search = '' } = req.query;

    let query = { user: req.user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nmID: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить себестоимость товара
router.post('/update-cost', auth, async (req, res) => {
  try {
    const { productId, cost } = req.body;
    const product = await Product.findOne({ _id: productId, user: req.user.id });
    if (!product) return res.status(404).json({ message: 'Товар не найден' });
    product.cost = cost;
    await product.save();
    res.json({ message: 'Себестоимость обновлена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
