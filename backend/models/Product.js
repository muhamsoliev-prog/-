import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  nmID: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export default mongoose.model('Product', productSchema);
