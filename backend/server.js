// backend/server.js
import app from './app.js';

// На случай, если по ошибке где-то остался CommonJS-экспорт,
// делаем «защитный» импорт:
const expressApp = app?.listen ? app : (app?.default || app);

const PORT = process.env.PORT || 4000;

expressApp.listen(PORT, () => {
  console.log(`OSINOT backend listening on port ${PORT}`);
});
