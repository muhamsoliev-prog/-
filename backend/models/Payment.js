import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tariff: { type: mongoose.Schema.Types.ObjectId, ref: 'Tariff', required: true },
  yookassaId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'succeeded', 'canceled'], default: 'pending' },
  paidAt: { type: Date },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Payment', paymentSchema);
