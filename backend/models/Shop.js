import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  platform: { type: String, enum: ['wb', 'ozon', 'ym'], required: true },
  apiToken: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Shop', shopSchema);
