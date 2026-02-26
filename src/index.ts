import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Scheduler } from './scheduler';
import messagesRouter from './routes/messages';
import testingRouter from './routes/testing';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/messages', messagesRouter);
app.use('/api/testing', testingRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Start the scheduler
const scheduler = new Scheduler();
scheduler.start();

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  scheduler.stop();
  server.close(() => {
    console.log('Closed out remaining connections.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

