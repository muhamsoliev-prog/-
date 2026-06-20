import User from '../models/User.js';

const admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещён' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default admin;
