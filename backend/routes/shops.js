import express from 'express';
import auth from '../middleware/auth.js';
import Shop from '../models/Shop.js';

const router = express.Router();

// Получить список магазинов
router.get('/list', auth, async (req, res) => {
  try {
    const shops = await Shop.find({ user: req.user.id });
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Добавить магазин
router.post('/add', auth, async (req, res) => {
  try {
    const { name, platform, apiToken } = req.body;
    const shop = new Shop({ user: req.user.id, name, platform, apiToken });
    await shop.save();
    res.status(201).json({ message: 'Магазин добавлен', shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить магазин
router.delete('/:id', auth, async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, user: req.user.id });
    if (!shop) return res.status(404).json({ message: 'Магазин не найден' });
    await Shop.deleteOne({ _id: req.params.id });
    res.json({ message: 'Магазин удалён' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
