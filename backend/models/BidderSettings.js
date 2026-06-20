import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  target_position_max: { type: Number },
  target_position_min: { type: Number },
  priority: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], required: true },
  conditions: { type: mongoose.Schema.Types.Mixed, required: true },
  action: { type: String, required: true },
  max_bid_limit: { type: Number }
});

const settingsSchema = new mongoose.Schema({
  general_settings: {
    ai_model: { type: String, default: 'gpt-3.5-turbo' },
    optimization_interval_minutes: { type: Number, default: 7 },
    min_bid_threshold_rub: { type: Number, default: 125 },
    max_bid_overall_rub: { type: Number, default: 5000 },
    ai_activity_rate: { type: Number, default: 0.25 },
    currency: { type: String, default: 'RUB' }
  },
  strategy_rules_wildberries: [ruleSchema],
  content_generation_limits: {
    photos_per_user_per_day: { type: Number, default: 10 },
    videos_per_user_per_month: { type: Number, default: 5 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

settingsSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export default mongoose.model('BidderSettings', settingsSchema);
