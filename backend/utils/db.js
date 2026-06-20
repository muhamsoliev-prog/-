// DB connect helper (placeholder)
import mongoose from 'mongoose';
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/osinot';
mongoose.connect(uri).then(() => console.log('Mongo connected')).catch(console.error);
