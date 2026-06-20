import express from 'express';
import auth from '../middleware/auth.js';
import { generatePhotoWithAI, createVideoFromPhotos } from '../utils/ai.js';

const router = express.Router();

// Генерация фото с AI
router.post('/generate-photo', auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    const photoUrl = await generatePhotoWithAI(prompt);
    res.json({ photoUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Создание видео из фото
router.post('/create-video', auth, async (req, res) => {
  try {
    const { photoUrls } = req.body;
    const videoUrl = await createVideoFromPhotos(photoUrls);
    res.json({ videoUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Загрузка фото/видео на WB
router.post('/upload', auth, async (req, res) => {
  try {
    const { fileUrl, type, art } = req.body;
    res.json({ message: `${type} загружен на WB` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
