import express from 'express';
import auth from '../middleware/auth.js';
import Debt from '../models/Debt.js';

const router = express.Router();

// Получить список долгов
router.get('/debts', auth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;

    let query = { user: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const total = await Debt.countDocuments(query);
    const debts = await Debt.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ date: -1 });

    res.json({ debts, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Добавить долг
router.post('/debts/add', auth, async (req, res) => {
  try {
    const { debtorName, amount, date, comment, type } = req.body;
    const debt = new Debt({ user: req.user.id, debtorName, amount, date, comment, type });
    await debt.save();
    res.status(201).json({ message: 'Долг добавлен', debt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить долг (увеличить/уменьшить)
router.post('/debts/:id/update', auth, async (req, res) => {
  try {
    const { amount, type } = req.body;
    const debt = await Debt.findOne({ _id: req.params.id, user: req.user.id });
    if (!debt) return res.status(404).json({ message: 'Долг не найден' });

    if (type === 'increase') {
      debt.amount += amount;
      debt.paidAmount -= amount;
    } else if (type === 'decrease') {
      debt.amount -= amount;
      debt.paidAmount += amount;
    }

    if (debt.paidAmount >= debt.amount) {
      debt.status = 'paid';
    } else if (debt.paidAmount > 0) {
      debt.status = 'partial';
    } else {
      debt.status = 'unpaid';
    }

    debt.transactions.push({ date: new Date(), amount, type });
    await debt.save();
    res.json({ message: 'Долг обновлён', debt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить отчёты по долгам
router.get('/reports', auth, async (req, res) => {
  try {
    const owedToMe = await Debt.find({ user: req.user.id, type: 'owed-to-me' });
    const iOwe = await Debt.find({ user: req.user.id, type: 'i-owe' });

    const totalOwedToMe = owedToMe.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
    const totalIOwe = iOwe.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    res.json({ totalOwedToMe, totalIOwe, netDebt: totalOwedToMe - totalIOwe, owedToMe, iOwe });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
