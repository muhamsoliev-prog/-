import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Получить настройки пользователя
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-code');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить язык
router.post('/update-language', auth, async (req, res) => {
  try {
    const { language } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { language }, { new: true }).select('-code');
    res.json({ message: 'Язык обновлён', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить API-токены
router.post('/update-tokens', auth, async (req, res) => {
  try {
    const { wbTokens } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { wbTokens }, { new: true }).select('-code');
    res.json({ message: 'Токены обновлены', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить себестоимость и налоги
router.post('/update-financial', auth, async (req, res) => {
  try {
    const { costPrice, taxRate, taxSystem } = req.body;
    const updateData = {};
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (taxRate !== undefined) updateData.taxRate = taxRate;
    if (taxSystem !== undefined) updateData.taxSystem = taxSystem;
    
    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json({ 
      message: 'Финансовые параметры обновлены', 
      data: { costPrice: user.costPrice, taxRate: user.taxRate, taxSystem: user.taxSystem } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
