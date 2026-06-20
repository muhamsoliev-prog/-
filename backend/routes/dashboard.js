import express from 'express';
import auth from '../middleware/auth.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';
import Campaign from '../models/Campaign.js';
import Order from '../models/Order.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const shops = await Shop.find({ user: req.user.id, isActive: true });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalCommission = 0;
    let totalAdSpend = 0;
    let totalOrders = 0;
    let totalClicks = 0;
    let totalImpressions = 0;

    for (const shop of shops) {
      const products = await Product.find({ shop: shop._id });
      const campaigns = await Campaign.find({ shop: shop._id });
      const orders = await Order.find({ shop: shop._id });

      totalRevenue += products.reduce((sum, p) => sum + (p.price * p.quantity || 0), 0);
      totalCost += products.reduce((sum, p) => sum + (p.cost * p.quantity || 0), 0);
      totalCommission += products.reduce((sum, p) => sum + (p.price * 0.15 * p.quantity || 0), 0);
      totalAdSpend += campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      totalOrders += orders.length;
      totalClicks += campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      totalImpressions += campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    }

    const netProfit = totalRevenue - totalCost - totalCommission - totalAdSpend;

    res.json({
      budget: 15200, budgetChange: 3,
      bid: 42, bidType: 'Единая',
      ctr: 4.2, ctrChange: 0.8,
      impressions: 8240, impressionsChange: 12,
      clicks: 346, clicksChange: 8,
      cart: 24, cartChange: 5,
      orders: 12, ordersChange: 3,
      cpc: 44.1, cpcChange: -1.2,
      netProfit, netProfitChange: 5,
      totalRevenue, totalCost, totalCommission,
      totalAdSpend, totalOrders, totalClicks, totalImpressions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
