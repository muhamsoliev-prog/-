import express from 'express';
import auth from '../middleware/auth.js';
import Tariff from '../models/Tariff.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { createPayment } from '../utils/yookassa.js';

const router = express.Router();

// Получить все тарифы
router.get('/', async (req, res) => {
  try {
    const tariffs = await Tariff.find({ isActive: true });
    res.json(tariffs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Создать платёж для тарифа
router.post('/pay', auth, async (req, res) => {
  try {
    const { tariffId } = req.body;
    const tariff = await Tariff.findById(tariffId);
    if (!tariff) return res.status(404).json({ message: 'Тариф не найден' });

    const paymentData = await createPayment(tariff.price, req.user.id, tariffId);

    const payment = new Payment({
      user: req.user.id,
      tariff: tariffId,
      yookassaId: paymentData.id,
      amount: tariff.price,
    });
    await payment.save();

    res.json({
      confirmation_url: paymentData.confirmation.confirmation_url,
      payment_id: paymentData.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Вебхук для YooKassa
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = req.body;

  if (event.event === 'payment.succeeded') {
    const paymentId = event.object.id;
    const metadata = event.object.metadata;

    await Payment.findOneAndUpdate(
      { yookassaId: paymentId },
      { status: 'succeeded', paidAt: new Date() }
    );

    await User.findByIdAndUpdate(metadata.userId, { tariff: metadata.tariffId });
  }

  res.sendStatus(200);
});

export default router;
