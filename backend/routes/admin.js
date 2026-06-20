import express from 'express';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import User from '../models/User.js';
import Tariff from '../models/Tariff.js';
import Payment from '../models/Payment.js';

const router = express.Router();

// Получить статистику админ-панели
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    const referrals = await User.countDocuments({ referredBy: { $exists: true } });
    const monthlyRevenue = 120000;

    res.json({ activeUsers, newUsers, referrals, monthlyRevenue });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить список тарифов
router.get('/tariffs', auth, admin, async (req, res) => {
  try {
    const tariffs = await Tariff.find();
    res.json(tariffs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Добавить тариф
router.post('/tariffs', auth, admin, async (req, res) => {
  try {
    const { name, price, features, trialDays, aiFeatures, isActive } = req.body;
    const tariff = new Tariff({
      name, price,
      features: features ? features.split(',').map(f => f.trim()) : [],
      trialDays: trialDays || 4,
      aiFeatures: aiFeatures || false,
      isActive: isActive !== undefined ? isActive : true
    });
    await tariff.save();
    res.status(201).json({ message: 'Тариф добавлен', tariff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Редактировать тариф
router.put('/tariffs/:id', auth, admin, async (req, res) => {
  try {
    const { name, price, features, trialDays, aiFeatures, isActive } = req.body;
    const tariff = await Tariff.findByIdAndUpdate(
      req.params.id,
      {
        name, price,
        features: features ? features.split(',').map(f => f.trim()) : [],
        trialDays: trialDays || 4,
        aiFeatures: aiFeatures || false,
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true }
    );
    if (!tariff) return res.status(404).json({ message: 'Тариф не найден' });
    res.json({ message: 'Тариф обновлён', tariff });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить тариф
router.delete('/tariffs/:id', auth, admin, async (req, res) => {
  try {
    const tariff = await Tariff.findByIdAndDelete(req.params.id);
    if (!tariff) return res.status(404).json({ message: 'Тариф не найден' });
    res.json({ message: 'Тариф удалён' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить список пользователей
router.get('/users', auth, admin, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (status === 'verified') query.isVerified = true;
    if (status === 'unverified') query.isVerified = false;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate('tariff');

    res.json({ users, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Редактировать пользователя
router.put('/users/:id', auth, admin, async (req, res) => {
  try {
    const { tariff, isActive, isVerified } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        tariff,
        isActive: isActive !== undefined ? isActive : true,
        isVerified: isVerified !== undefined ? isVerified : false
      },
      { new: true }
    ).populate('tariff');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Пользователь обновлён', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить пользователя
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить настройки рефералов
router.get('/referral-settings', auth, admin, async (req, res) => {
  try {
    res.json({ refLink: 'https://osinot.ru/ref/USER_ID', refPercent: 10 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить настройки рефералов
router.put('/referral-settings', auth, admin, async (req, res) => {
  try {
    const { refPercent } = req.body;
    res.json({ message: `Процент рефералов изменён на ${refPercent}%`, refPercent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
