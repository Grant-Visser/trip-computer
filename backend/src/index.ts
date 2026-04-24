import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDb } from './db/database';
import vehiclesRouter from './routes/vehicles';
import fillupsRouter from './routes/fillups';

const app = express();
const PORT = process.env['PORT'] ? parseInt(process.env['PORT']) : 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/fillups', fillupsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB then start
initDb();

app.listen(PORT, () => {
  console.log(`Trip Computer backend running on http://localhost:${PORT}`);
});

export default app;
