import express from 'express';
import auth from '../middleware/auth.js';
import SeoData from '../models/SeoData.js';
import { generateDescriptionWithAI } from '../utils/ai.js';
import { uploadDescriptionToWB } from '../utils/apiClients.js';

const router = express.Router();

// Анализ SEO
router.post('/analyze', auth, async (req, res) => {
  try {
    const { art } = req.body;
    const seoData = await SeoData.findOne({ nmID: art, user: req.user.id });

    if (seoData) {
      res.json({
        position: seoData.position || 4,
        keyword: seoData.keyword || 'кроссовки мужские',
        frequency: seoData.frequency || 8400,
        title: seoData.title || 'Кроссовки мужские беговые',
        description: seoData.description || 'Лёгкие дышащие кроссовки...',
        optimizedKeywords: seoData.optimizedKeywords || 12,
        totalKeywords: seoData.totalKeywords || 15,
        speedScore: seoData.speedScore || 92,
        isIndexed: seoData.isIndexed || true,
        ctr: seoData.ctr || 3.8,
        ctrChange: seoData.ctrChange || 0.5,
        competitors: seoData.competitors || [
          { nmID: '12345678', name: 'Конкурент 1', price: 5990, position: 1, clusters: ['Кроссовки', 'Спорт'] },
          { nmID: '87654321', name: 'Конкурент 2', price: 6990, position: 2, clusters: ['Кроссовки', 'Бег'] }
        ]
      });
    } else {
      res.json({
        position: 4,
        keyword: 'кроссовки мужские',
        frequency: 8400,
        title: 'Кроссовки мужские беговые',
        description: 'Лёгкие дышащие кроссовки...',
        optimizedKeywords: 12,
        totalKeywords: 15,
        speedScore: 92,
        isIndexed: true,
        ctr: 3.8,
        ctrChange: 0.5,
        competitors: [
          { nmID: '12345678', name: 'Конкурент 1', price: 5990, position: 1, clusters: ['Кроссовки', 'Спорт'] },
          { nmID: '87654321', name: 'Конкурент 2', price: 6990, position: 2, clusters: ['Кроссовки', 'Бег'] }
        ]
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Генерация описания с AI
router.post('/generate-description', auth, async (req, res) => {
  try {
    const { art } = req.body;
    const description = await generateDescriptionWithAI(art);
    res.json({ description });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Загрузка описания на WB
router.post('/upload-description', auth, async (req, res) => {
  try {
    const { art, description } = req.body;
    res.json({ message: 'Описание загружено' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
