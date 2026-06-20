import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { findUserByEmail, findUserById, createUser } from '../utils/inMemoryDB.js';
const router = express.Router();

const SECRET  = process.env.JWT_SECRET || 'change_me_in_env';
const makeToken = (id) => jwt.sign({ id }, SECRET, { expiresIn: '30d' });

// Flag to track if we're using in-memory DB
let useInMemoryDB = false;

/* Middleware проверки токена */
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Нет токена' });
  try {
    const { id } = jwt.verify(h.replace('Bearer ', ''), SECRET);
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен' });
  }
}

/* РЕГИСТРАЦИЯ */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) 
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    
    let exists;
    try {
      exists = await User.findOne({ email });
    } catch (e) {
      useInMemoryDB = true;
      exists = findUserByEmail(email);
    }
    
    if (exists) 
      return res.status(409).json({ error: 'Email уже зарегистрирован' });
    
    let user;
    try {
      user = await User.create({ email, password, name });
    } catch (e) {
      useInMemoryDB = true;
      user = await createUser(email, password, name);
    }
    
    const token = makeToken(user._id);
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        ipName: user.ipName || '',
        plan: user.plan || 'free'
      } 
    });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

/* ВХОД */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Укажите email и пароль' });
    
    let user;
    try {
      user = await User.findOne({ email });
    } catch (e) {
      useInMemoryDB = true;
      user = findUserByEmail(email);
    }
    
    if (!user || !(await user.checkPassword(password)))
      return res.status(401).json({ error: 'Неверный email или пароль' });
    
    user.lastLogin = new Date();
    
    try {
      await user.save();
    } catch (e) {
      // In-memory user, just continue
    }
    
    const token = makeToken(user._id);
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        ipName: user.ipName || '', 
        plan: user.plan || 'free'
      } 
    });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

/* ПРОФИЛЬ текущего пользователя */
router.get('/me', auth, async (req, res) => {
  try {
    let user;
    try {
      user = await User.findById(req.userId).select('-password');
    } catch (e) {
      user = findUserById(req.userId);
    }
    
    if (!user)
      return res.status(404).json({ error: 'Пользователь не найден' });
    
    res.json(user.toJSON ? user.toJSON() : user);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

/* СМЕНА ПАРОЛЯ */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    let user;
    try {
      user = await User.findById(req.userId);
    } catch (e) {
      user = findUserById(req.userId);
    }
    
    if (!user || !(await user.checkPassword(oldPassword)))
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    
    user.password = newPassword;
    
    try {
      await user.save();
    } catch (e) {
      // In-memory user, just continue
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;
