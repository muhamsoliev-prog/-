import mongoose from 'mongoose';

const debtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  debtorName: { type: String, required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  comment: { type: String },
  type: { type: String, enum: ['owed-to-me', 'i-owe'], required: true },
  transactions: [{
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['increase', 'decrease'], required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

debtSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export default mongoose.model('Debt', debtSchema);
