import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  name:         { type: String, default: '' },
  ipName:       { type: String, default: '' },   // "ИП Рахимов М.А."
  inn:          { type: String, default: '' },
  phone:        { type: String, default: '' },
  taxSystem:    { type: String, default: 'usn6' },
  plan:         { type: String, default: 'free', enum: ['free','base','pro','business'] },
  planExpiresAt:{ type: Date, default: null },

  shops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shop' }],

  tokens: {
    statistics: { type: String, default: '' },
    analytics:  { type: String, default: '' },
    finance:    { type: String, default: '' },
    content:    { type: String, default: '' },
    prices:     { type: String, default: '' },
    advert:     { type: String, default: '' },
  },

  wbTokens: {
    main:      { type: String, default: '' },
    lastCheck: { type: Date, default: null },
    status:    { type: String, default: 'inactive' },
  },

  syncedProducts:  { type: Array, default: [] },
  lastProductSync: { type: Date, default: null },

  /* Финансовые параметры */
  costPrice:        { type: Number, default: 0 },          // Себестоимость всех товаров
  advertisingSpend: { type: Number, default: 0 },          // Расходы на рекламу за период
  taxRate:          { type: Number, default: 18 },         // НДС %, по умолчанию 18%
  taxSystem:        { type: String, default: 'nds' },      // 'nds' или 'usn6' или 'usn15'

  referralCode: { type: String, unique: true, sparse: true },
  referredBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  language: { type: String, enum: ['ru','en','zh','tg','ky','uz'], default: 'ru' },

  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
}, { timestamps: true });

/* Хешируем пароль перед сохранением */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* Метод проверки пароля */
userSchema.methods.checkPassword = function(plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);
