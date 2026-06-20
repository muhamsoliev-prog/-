import mongoose from 'mongoose';

const tariffSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  features: [String],
  trialDays: { type: Number, default: 4 },
  aiFeatures: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  yookassaId: { type: String }
});

export default mongoose.model('Tariff', tariffSchema);
