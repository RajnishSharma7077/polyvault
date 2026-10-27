require('dotenv').config();

const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const connectDatabase = require('./config/db');
const { seedDemoAccounts } = require('./seed/demoAccounts');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/', (req, res) => res.json({ ok: true, service: 'PolyVault API' }));
app.use('/customers', require('./routes/customer.routes'));
app.use('/assets', require('./routes/asset.routes'));
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5001;

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  await connectDatabase();
  await seedDemoAccounts();
  app.listen(port, () => {
    console.log(`PolyVault API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start PolyVault API:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;
