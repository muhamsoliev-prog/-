import express from 'express';
import auth from '../middleware/auth.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Campaign from '../models/Campaign.js';

const router = express.Router();

// Получить данные для дашборда отчётов
router.get('/dashboard', auth, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id });
    const orders = await Order.find({ user: req.user.id });
    const campaigns = await Campaign.find({ user: req.user.id });

    const salesData = {
      months: ['мар-16', 'апр-16', 'май-16', 'июн-16', 'июл-16', 'авг-16', 'сен-16', 'окт-16', 'ноя-16', 'дек-16', 'янв-17', 'фев-17', 'мар-17', 'апр-17', 'май-17', 'июн-17', 'июл-17', 'авг-17', 'сен-17', 'окт-17', 'ноя-17'],
      webSales: [25000, 28000, 27000, 26000, 35000, 20000, 28000, 25000, 27000, 26000, 35000, 20000, 28000, 25000, 27000, 26000, 35000, 20000, 28000, 25000, 27000],
      appSales: [15000, 18000, 17000, 16000, 25000, 10000, 18000, 15000, 17000, 16000, 25000, 10000, 18000, 15000, 17000, 16000, 25000, 10000, 18000, 15000, 17000]
    };

    const usersByCountry = {
      top5: [
        { country: 'Япония', users: 8678345 },
        { country: 'США', users: 8345234 },
        { country: 'Испания', users: 4567744 },
        { country: 'Китай', users: 1098765 },
        { country: 'Сингапур', users: 912456 }
      ],
      worldMap: 'https://via.placeholder.com/400x200?text=Карта+мира'
    };

    const userGrowth = {
      months: ['мар-16', 'апр-16', 'май-16', 'июн-16', 'июл-16', 'авг-16', 'сен-16', 'окт-16', 'ноя-16', 'дек-16', 'янв-17', 'фев-17', 'мар-17', 'апр-17', 'май-17', 'июн-17', 'июл-17', 'авг-17', 'сен-17', 'окт-17', 'ноя-17'],
      growth: [0, 0, 0, 0, 10000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };

    const genderDistribution = { man: 19, woman: 81 };
    const mainData = { totalSales: 863748, totalUserGrowth: 28482315 };

    res.json({ salesData, usersByCountry, userGrowth, genderDistribution, mainData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
