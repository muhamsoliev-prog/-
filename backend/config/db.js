import mongoose from 'mongoose';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_DB_URI;
  const localUri = 'mongodb://127.0.0.1:27017/osinot';
  let uri = primaryUri || localUri;

  const connect = async (databaseUri) => {
    return mongoose.connect(databaseUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  };

  try {
    const conn = await connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (error) {
    console.error('Database connection error:', error.message);

    if (primaryUri && uri !== localUri) {
      console.warn(`Trying fallback local MongoDB at ${localUri}...`);
      try {
        const conn = await connect(localUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error('Fallback MongoDB connection error:', fallbackError.message);
      }
    }

    console.warn('Using in-memory database for development (no external MongoDB available).');
    console.warn('Note: Data will be reset when server restarts.');
  }
};

export default connectDB;
