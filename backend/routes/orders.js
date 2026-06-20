import express from 'express';
import auth from '../middleware/auth.js';
import Order from '../models/Order.js';

const router = express.Router();

// Получить список заказов
router.get('/list', auth, async (req, res) => {
  try {
    const { status, warehouse, page = 1, limit = 20 } = req.query;

    let query = { user: req.user.id };
    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    res.json({ orders, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить статус заказа
router.post('/update-status', auth, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: 'Заказ не найден' });
    order.status = status;
    await order.save();
    res.json({ message: 'Статус обновлён', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
