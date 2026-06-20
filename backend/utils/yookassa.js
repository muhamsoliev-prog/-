// backend/utils/yookassa.js — заглушка без реальной интеграции
// Позволяет запускать сервер, когда YOOKASSA_* пустые или пакет не установлен.

const enabled = Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);

// Единый интерфейс, чтобы роуты не падали:
async function createPayment(params = {}) {
  return {
    ok: false,
    disabled: true,
    message: 'YooKassa is disabled (no credentials or package not installed)',
    params,
  };
}

export { enabled, createPayment };
