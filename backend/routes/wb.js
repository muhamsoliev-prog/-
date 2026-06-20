import express from 'express';
import axios from 'axios';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const WB_STATS   = 'https://statistics-api.wildberries.ru';
const WB_CONTENT = 'https://content-api.wildberries.ru';

// ISO datetime: 2024-01-01T00:00:00 — для /orders и /sales
function getDateFromISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('.')[0];
}

// Short date: 2024-01-01 — для /reportDetailByPeriod
function getDateFromShort(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function handleWbError(err, res) {
  console.error('WB API Error:', {
    status: err.response?.status,
    data: err.response?.data,
    message: err.message,
  });
  const status = err.response?.status;
  if (status === 401 || status === 403)
    return res.status(401).json({ error: 'Токен недействителен или истёк', details: err.response?.data });
  if (status === 429)
    return res.status(429).json({ error: 'Превышен лимит запросов WB API. Подождите минуту.' });
  res.status(500).json({ error: 'Ошибка WB API', details: err.response?.data || err.message });
}

/* 1. Сохранить и проверить токен */
router.post('/save-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Токен не указан' });

    console.log('=== SAVE TOKEN ===');
    console.log('userId:', req.userId);
    console.log('token length:', token?.length);
    console.log('token preview:', token?.substring(0, 30));

    // Проверяем токен — НО сохраняем в любом случае.
    // WB может вернуть 401 если у токена нет прав на statistics,
    // но токен всё равно может работать для других APIs.
    let tokenStatus = 'unverified';
    let warning = null;

    const check = await axios.get(
      `${WB_STATS}/api/v1/supplier/sales?dateFrom=${getDateFromISO(7)}`,
      { headers: { Authorization: token }, timeout: 10000 }
    ).catch(e => {
      console.log('WB check status:', e.response?.status, e.message);
      return { status: e.response?.status || 500 };
    });

    console.log('WB check HTTP status:', check.status);

    if (check.status >= 200 && check.status < 300) {
      tokenStatus = 'active';
    } else if (check.status === 401 || check.status === 403) {
      tokenStatus = 'limited'; // токен сохраняем, но он не прошёл проверку статистики
      warning = 'Токен сохранён, но не прошёл проверку Statistics API. Убедитесь что у токена есть доступ к статистике.';
    } else {
      tokenStatus = 'unverified'; // сеть недоступна или WB временно лежит
      warning = 'Токен сохранён, но проверка WB API недоступна. Попробуйте обновить позже.';
    }

    // Сохраняем всегда — явный $set (Mongoose 7)
    const result = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'wbTokens.main':      token,
          'wbTokens.lastCheck': new Date(),
          'wbTokens.status':    tokenStatus,
        },
      },
      { new: true }
    );

    console.log('Saved wbTokens.main length:', result?.wbTokens?.main?.length);
    console.log('Saved wbTokens.status:', result?.wbTokens?.status);

    res.json({ ok: true, message: 'Токен сохранён', status: tokenStatus, warning });
  } catch (err) {
    console.error('save-token error:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* 2. Продажи */
router.get('/sales', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const token = user?.wbTokens?.main;
    if (!token) return res.status(400).json({ error: 'Токен не добавлен' });

    const days = parseInt(req.query.days) || 30;
    const dateFrom = req.query.dateFrom || getDateFromISO(days);
    const { data } = await axios.get(
      `${WB_STATS}/api/v1/supplier/sales?dateFrom=${dateFrom}&flag=0`,
      { headers: { Authorization: token } }
    );
    res.json(data);
  } catch (err) {
    handleWbError(err, res);
  }
});

/* 3. Заказы */
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const token = user?.wbTokens?.main;
    if (!token) return res.status(400).json({ error: 'Токен не добавлен' });

    const days = parseInt(req.query.days) || 30;
    const dateFrom = req.query.dateFrom || getDateFromISO(days);
    const { data } = await axios.get(
      `${WB_STATS}/api/v1/supplier/orders?dateFrom=${dateFrom}&flag=0`,
      { headers: { Authorization: token } }
    );
    console.log('ORDERS response:', Array.isArray(data) ? data.length : 'not array');
    res.json(data);
  } catch (err) {
    handleWbError(err, res);
  }
});

/* 4. Финансовый отчёт реализации */
router.get('/finance-report', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const token = user?.wbTokens?.main;
    if (!token) return res.status(400).json({ error: 'Токен не добавлен' });

    const days     = parseInt(req.query.days) || 30;
    const dateTo   = getDateFromShort(0);
    const dateFrom = getDateFromShort(days);

    console.log('Finance report request:', { userId: req.userId, days, dateFrom, dateTo });
    console.log('TOKEN:', token?.substring(0, 20) + '...');

    const { data } = await axios.get(
      `${WB_STATS}/api/v5/supplier/reportDetailByPeriod?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=100000`,
      { headers: { Authorization: token } }
    );

    console.log('WB RESPONSE rows:', Array.isArray(data) ? data.length : data);

    const summary = {
      revenue: 0, commission: 0, logistics: 0,
      storage: 0, penalties: 0, returns: 0, paidToSeller: 0,
    };

    if (Array.isArray(data)) {
      data.forEach(row => {
        if (row.doc_type_name === 'Продажа') {
          summary.revenue     += row.retail_price_withdisc_rub || 0;
          summary.commission  += row.commission_percent
            ? (row.retail_price_withdisc_rub * row.commission_percent / 100) : 0;
          summary.logistics   += row.delivery_rub   || 0;
          summary.storage     += row.storage_fee    || 0;
          summary.penalties   += row.penalty        || 0;
          summary.paidToSeller+= row.ppvz_for_pay   || 0;
        }
        if (row.doc_type_name === 'Возврат') {
          summary.returns += row.retail_price_withdisc_rub || 0;
        }
      });
    }

    res.json({ summary, raw: Array.isArray(data) ? data.slice(0, 100) : [] });
  } catch (err) {
    handleWbError(err, res);
  }
});

/* 5. Синхронизация карточек товаров */
router.post('/sync-products', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const token = user?.wbTokens?.main;
    if (!token) return res.status(400).json({ error: 'Токен не добавлен' });

    const { data } = await axios.post(
      `${WB_CONTENT}/content/v2/get/cards/list`,
      { settings: { cursor: { limit: 100 }, filter: { withPhoto: -1 } } },
      { headers: { Authorization: token } }
    );

    const cards = data?.data?.cards || [];
    const saved = cards.map(card => ({
      nmID:       card.nmID,
      vendorCode: card.vendorCode,
      name:       card.title || card.subjectName,
      photoUrl:   card.mediaFiles?.[0] || null,
      photos:     card.mediaFiles || [],
    }));

    await User.findByIdAndUpdate(
      req.userId,
      { $set: { syncedProducts: saved, lastProductSync: new Date() } },
      { new: true }
    );

    res.json({ ok: true, count: saved.length, products: saved });
  } catch (err) {
    handleWbError(err, res);
  }
});

/* 6. Остатки на складах */
router.get('/stocks', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const token = user?.wbTokens?.main;
    if (!token) return res.status(400).json({ error: 'Токен не добавлен' });

    const { data } = await axios.get(
      `${WB_STATS}/api/v1/supplier/stocks?dateFrom=${getDateFromISO(1)}`,
      { headers: { Authorization: token } }
    );
    res.json(data);
  } catch (err) {
    handleWbError(err, res);
  }
});

/* 7. Получить сохранённые товары */
router.get('/synced-products', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      products: user?.syncedProducts || [],
      lastSync: user?.lastProductSync || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
