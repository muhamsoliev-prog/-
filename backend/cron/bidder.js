import cron from 'node-cron';
import BidderSettings from '../models/BidderSettings.js';
import Campaign from '../models/Campaign.js';
import Shop from '../models/Shop.js';
import { getWBStats, updateWBBid } from '../utils/apiClients.js';
import { getAIDecision } from '../utils/ai.js';

cron.schedule('*/7 * * * *', async () => {
  console.log('Запуск задачи бидера...');

  try {
    const settings = await BidderSettings.findOne({ isActive: true });
    if (!settings) {
      console.log('Настройки бидера не найдены, пропуск...');
      return;
    }

    const { general_settings, strategy_rules_wildberries } = settings;
    const campaigns = await Campaign.find({ isActive: true, platform: 'wb' }).populate('shop');

    for (const campaign of campaigns) {
      const shop = campaign.shop;
      if (!shop || !shop.apiToken) continue;

      const stats = await getWBStats(shop.apiToken, campaign.wbCampaignId);

      for (const rule of strategy_rules_wildberries) {
        const { conditions, action, priority } = rule;

        let isConditionMet = true;

        if (conditions.current_position_gt && stats.position <= conditions.current_position_gt) isConditionMet = false;
        if (conditions.hourly_budget_percent_used_lt && stats.hourlyBudgetUsed >= conditions.hourly_budget_percent_used_lt) isConditionMet = false;
        if (conditions.current_ctr_gt && stats.ctr <= conditions.current_ctr_gt) isConditionMet = false;
        if (conditions.current_ctr_lt && stats.ctr >= conditions.current_ctr_lt) isConditionMet = false;
        if (conditions.spent_rub_gt && stats.spent <= conditions.spent_rub_gt) isConditionMet = false;
        if (conditions.time_active_minutes_gt && campaign.minutesActive <= conditions.time_active_minutes_gt) isConditionMet = false;

        if (isConditionMet) {
          console.log(`Правило "${rule.name}" сработало для кампании ${campaign._id}`);

          const newBid = await getAIDecision(action, stats, general_settings);
          await updateWBBid(shop.apiToken, campaign.wbCampaignId, newBid);

          campaign.bidHistory.push({
            timestamp: new Date(),
            oldBid: campaign.currentBid,
            newBid: newBid,
            ruleApplied: rule.name
          });
          await campaign.save();

          break;
        }
      }
    }
  } catch (error) {
    console.error('Ошибка в задаче бидера:', error);
  }
});

export default cron;
