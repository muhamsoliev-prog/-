// backend/utils/ai.js
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';

export function getClient() {
  if (!apiKey) {
    console.warn('[AI] OPENAI_API_KEY не задан — ИИ отключён');
    return null;
  }
  try {
    return new OpenAI({ apiKey });
  } catch (e) {
    console.warn('[AI] Ошибка инициализации клиента:', e?.message || e);
    return null;
  }
}

export async function safeChat(prompt) {
  const client = getClient();
  if (!client) return { text: '(AI выключен: нет ключа)' };

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  return { text: res?.choices?.[0]?.message?.content ?? '' };
}

export async function getAIDecision(action, stats, settings = {}) {
  const client = getClient();
  if (!client) {
    // Если ИИ отключен, возвращаем случайную ставку в диапазоне
    return Math.floor(Math.random() * (settings.max_bid_overall_rub || 5000) + (settings.min_bid_threshold_rub || 100));
  }

  try {
    const prompt = `
    Action: ${action}
    Stats: ${JSON.stringify(stats)}
    Settings: ${JSON.stringify(settings)}
    
    Decide on a bid price (in RUB) and return ONLY a number, nothing else.
    Min: ${settings.min_bid_threshold_rub || 100}
    Max: ${settings.max_bid_overall_rub || 5000}
    `;

    const res = await client.chat.completions.create({
      model: settings.ai_model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = res?.choices?.[0]?.message?.content ?? '';
    const bid = parseInt(text.match(/\d+/)?.[0] || settings.min_bid_threshold_rub || 100);
    
    return Math.max(
      settings.min_bid_threshold_rub || 100,
      Math.min(bid, settings.max_bid_overall_rub || 5000)
    );
  } catch (e) {
    console.error('[AI] Error in getAIDecision:', e?.message || e);
    return settings.min_bid_threshold_rub || 100;
  }
}

export async function generateDescriptionWithAI(art) {
  const client = getClient();
  if (!client) {
    return `Товар с артикулом ${art}. Качество высокое, быстрая доставка.`;
  }

  try {
    const prompt = `Напиши короткое, привлекательное описание товара для маркетплейса Wildberries на основе артикула ${art}. Описание должно быть 1-2 предложения.`;

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    return res?.choices?.[0]?.message?.content ?? `Товар ${art}`;
  } catch (e) {
    console.error('[AI] Error in generateDescriptionWithAI:', e?.message || e);
    return `Товар ${art}`;
  }
}

export async function generatePhotoWithAI(prompt) {
  const client = getClient();
  if (!client) {
    // Если ИИ отключен, возвращаем заглушку
    return { url: 'https://via.placeholder.com/500x500?text=AI+Photo' };
  }

  try {
    const image = await client.images.generate({
      model: 'dall-e-3',
      prompt: prompt || 'Professional product photo for e-commerce',
      n: 1,
      size: '1024x1024',
    });

    return { url: image?.data?.[0]?.url ?? 'https://via.placeholder.com/500x500?text=Generated' };
  } catch (e) {
    console.error('[AI] Error in generatePhotoWithAI:', e?.message || e);
    return { url: 'https://via.placeholder.com/500x500?text=Error' };
  }
}

export async function createVideoFromPhotos(photos, options = {}) {
  // Функция-заглушка так как OpenAI не имеет встроенного API для создания видео
  console.warn('[AI] createVideoFromPhotos is not implemented - returning placeholder');
  return {
    url: 'https://via.placeholder.com/500x500?text=Video+Not+Available',
    status: 'not_implemented',
    message: 'Video generation requires external video processing service'
  };
}

