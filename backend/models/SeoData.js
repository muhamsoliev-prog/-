import mongoose from 'mongoose';

const seoDataSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  nmID: { type: String, required: true },
  position: { type: Number },
  keyword: { type: String },
  frequency: { type: Number },
  title: { type: String },
  description: { type: String },
  optimizedKeywords: { type: Number, default: 0 },
  totalKeywords: { type: Number, default: 0 },
  speedScore: { type: Number },
  isIndexed: { type: Boolean, default: false },
  ctr: { type: Number },
  ctrChange: { type: Number },
  competitors: [{
    nmID: String,
    name: String,
    price: Number,
    position: Number,
    clusters: [String]
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

seoDataSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: new Date() });
});

export default mongoose.model('SeoData', seoDataSchema);
