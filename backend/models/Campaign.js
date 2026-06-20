import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  platform: { type: String, enum: ['wb', 'ozon', 'ym'], required: true },
  wbCampaignId: { type: String },
  isActive: { type: Boolean, default: true },
  currentBid: { type: Number },
  targetPosition: { type: Number },
  createdAt: { type: Date, default: Date.now },
  bidHistory: [{
    timestamp: { type: Date },
    oldBid: { type: Number },
    newBid: { type: Number },
    ruleApplied: { type: String }
  }]
});

export default mongoose.model('Campaign', campaignSchema);
