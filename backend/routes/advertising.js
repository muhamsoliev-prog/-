import express from 'express';
import auth from '../middleware/auth.js';
import Campaign from '../models/Campaign.js';
import { getWBStats, updateWBBid } from '../utils/apiClients.js';
import { getAIDecision } from '../utils/ai.js';

const router = express.Router();

// Получить дашборд рекламы
router.get('/dashboard', auth, async (req, res) => {
  try {
    res.json({
      budget: 15200, budgetChange: 3,
      bid: 42, bidType: 'Единая',
      ctr: 4.2, ctrChange: 0.8,
      impressions: 8240, impressionsChange: 12,
      clicks: 346, clicksChange: 8,
      cart: 24, cartChange: 5,
      orders: 12, ordersChange: 3,
      cpc: 44.1, cpcChange: -1.2
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить список кампаний
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ user: req.user.id }).populate('shop');
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Переключить статус кампании
router.post('/campaigns/:id/toggle', auth, async (req, res) => {
  try {
    const { isActive } = req.body;
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user.id });
    if (!campaign) return res.status(404).json({ message: 'Кампания не найдена' });
    campaign.isActive = isActive;
    await campaign.save();
    res.json({ message: 'Статус обновлён', isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Удалить кампанию
router.delete('/campaigns/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user.id });
    if (!campaign) return res.status(404).json({ message: 'Кампания не найдена' });
    await Campaign.deleteOne({ _id: req.params.id });
    res.json({ message: 'Кампания удалена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AI-оптимизация кампании
router.post('/campaigns/:id/ai-optimize', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, user: req.user.id }).populate('shop');
    if (!campaign || !campaign.shop || !campaign.shop.apiToken) {
      return res.status(404).json({ message: 'Кампания или токен не найдены' });
    }

    const stats = await getWBStats(campaign.shop.apiToken, campaign.wbCampaignId);
    const newBid = await getAIDecision('Увеличить ставку для поднятия позиции', stats, {
      min_bid_threshold_rub: 125,
      max_bid_overall_rub: 5000,
      ai_model: 'gpt-3.5-turbo'
    });

    await updateWBBid(campaign.shop.apiToken, campaign.wbCampaignId, newBid);

    campaign.bidHistory.push({
      timestamp: new Date(),
      oldBid: campaign.currentBid,
      newBid: newBid,
      ruleApplied: 'AI-оптимизация'
    });
    campaign.currentBid = newBid;
    await campaign.save();

    res.json({ message: 'AI-оптимизация завершена', newBid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
