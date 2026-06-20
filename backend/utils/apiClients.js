import axios from 'axios';

// Заглушка: получить статистику кампании из WB
const getWBStats = async (token, campaignId) => {
  return {
    position: Math.floor(Math.random() * 100) + 1,
    ctr: (Math.random() * 10).toFixed(2),
    spent: Math.floor(Math.random() * 1000),
    hourlyBudgetUsed: Math.floor(Math.random() * 100),
    minutesActive: Math.floor(Math.random() * 600)
  };
};

// Заглушка: обновить ставку в WB
const updateWBBid = async (token, campaignId, newBid) => {
  console.log(`Ставка для кампании ${campaignId} обновлена до ${newBid} руб.`);
  return true;
};

// Заглушка: загрузить описание на WB
const uploadDescriptionToWB = async (art, description) => {
  console.log(`Описание для артикула ${art} загружено: ${description}`);
  return true;
};

export { getWBStats, updateWBBid, uploadDescriptionToWB };
