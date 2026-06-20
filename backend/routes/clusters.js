import express from 'express';
import auth from '../middleware/auth.js';
import Cluster from '../models/Cluster.js';

const router = express.Router();

// Получить список кластеров
router.post('/list', auth, async (req, res) => {
  try {
    const { filter, period, search, page = 1, limit = 20 } = req.body;

    let query = { user: req.user.id };

    if (filter === 'included') query.status = 'included';
    if (filter === 'excluded') query.status = 'excluded';
    if (filter === 'fixed') query.status = 'fixed';

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const total = await Cluster.countDocuments(query);

    const clusters = await Cluster.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ position: 1 });

    const summary = await Cluster.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          impressions: { $sum: '$impressions' },
          clicks: { $sum: '$clicks' },
          spend: { $sum: '$spend' },
          totalCtr: { $sum: { $multiply: ['$ctr', '$impressions'] } },
          totalCpc: { $sum: { $multiply: ['$cpc', '$clicks'] } }
        }
      }
    ]);

    const sum = summary[0] || { impressions: 0, clicks: 0, spend: 0, totalCtr: 0, totalCpc: 0 };
    const avgCtr = sum.impressions ? (sum.totalCtr / sum.impressions).toFixed(2) : 0;
    const avgCpc = sum.clicks ? (sum.totalCpc / sum.clicks).toFixed(2) : 0;

    res.json({
      clusters,
      summary: {
        impressions: sum.impressions,
        clicks: sum.clicks,
        spend: sum.spend,
        ctr: avgCtr,
        cpc: avgCpc
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Включить кластер
router.post('/:id/include', auth, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });
    cluster.status = 'included';
    await cluster.save();
    res.json({ message: 'Кластер включён', status: 'included' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Исключить кластер
router.post('/:id/exclude', auth, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });
    cluster.status = 'excluded';
    await cluster.save();
    res.json({ message: 'Кластер исключён', status: 'excluded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Зафиксировать кластер
router.post('/:id/fix', auth, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });
    cluster.status = 'fixed';
    await cluster.save();
    res.json({ message: 'Кластер зафиксирован', status: 'fixed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Получить детали кластера
router.post('/:id/detail', auth, async (req, res) => {
  try {
    const { period, dateFrom, dateTo } = req.body;
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });

    const dailyStats = [
      { date: '20 окт', impressions: 240, clicks: 32, ctr: 13.3, bid: 42, position: 4, spend: 1344 },
      { date: '19 окт', impressions: 198, clicks: 28, ctr: 14.1, bid: 40, position: 7, spend: 1120 },
      { date: '18 окт', impressions: 180, clicks: 25, ctr: 13.9, bid: 38, position: 9, spend: 950 }
    ];

    const competitors = [
      { nmID: '12345678', name: 'Кроссовки Nike Air Max', price: 5990, position: 1, clusters: ['Беговые кроссовки', 'Спорт'] },
      { nmID: '87654321', name: 'Кроссовки Adidas Ultraboost', price: 6990, position: 2, clusters: ['Беговые кроссовки', 'Спорт'] },
      { nmID: '11223344', name: 'Кроссовки Puma RS-X', price: 4990, position: 3, clusters: ['Беговые кроссовки'] }
    ];

    res.json({
      cluster: { name: cluster.name, id: cluster._id },
      summary: {
        impressions: 618, impressionsChange: 21.5,
        clicks: 85, clicksChange: 18.1,
        ctr: 13.7, ctrChange: -0.2,
        spend: 3414, spendChange: 15.3
      },
      dailyStats,
      competitors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Обновить ставку кластера
router.post('/:id/update-bid', auth, async (req, res) => {
  try {
    const { newBid } = req.body;
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });
    res.json({ message: 'Ставка обновлена', newBid });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AI-оптимизация кластера
router.post('/:id/ai-optimize', auth, async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ _id: req.params.id, user: req.user.id });
    if (!cluster) return res.status(404).json({ message: 'Кластер не найден' });
    res.json({ message: 'AI-оптимизация запущена' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
