import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'change_me_in_env';

export default function(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Авторизация требуется' });
  try {
    const { id } = jwt.verify(h.replace('Bearer ', ''), SECRET);
    req.userId = id;
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}
