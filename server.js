const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const promptsRouter = require('./routes/prompts');
const galleryRouter = require('./routes/gallery');
const plannerRouter = require('./routes/planner');
const stateRouter = require('./routes/state');
const studioRouter = require('./routes/studio');
const imageModelsRouter = require('./routes/imageModels');
const imageGenerationRouter = require('./routes/imageGeneration');
const providerCredentialsRouter = require('./routes/providerCredentials');
const geminiLegacyRouter = require('./routes/geminiLegacy');
const generatorRouter = require('./routes/generator');
const aiRouter = require('./routes/ai');
const { router: directorRouter } = require('./routes/director');
const { db } = require('./db/sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/image-generation', express.json({ limit: '36mb' }));
app.use('/api/gemini/image', express.json({ limit: '36mb' }));
app.use('/api/state', express.json({ limit: '36mb' }));
app.use(express.json({ limit: '6mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    providers: ['gemini'],
    database: 'sqlite'
  });
});

app.use('/api/prompts', promptsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/state', stateRouter);
app.use('/api/studio', studioRouter);
app.use('/api/image-models', imageModelsRouter);
app.use('/api/image-generation', imageGenerationRouter);
app.use('/api/provider-credentials', providerCredentialsRouter);
app.use('/api/generator', generatorRouter);
app.use('/api/ai', aiRouter);
app.use('/api/director', directorRouter);
app.use('/api/gemini', geminiLegacyRouter);

// v3.9.5: chat experiment removed. Studio Pulse uses /api/studio/pulse for structured studio guidance.

process.on('SIGINT', () => {
  try { db.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { db.close(); } catch {}
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
