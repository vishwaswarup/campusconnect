const config = require('./config');
const connectDB = require('./config/db');
const createApp = require('./app');

(async () => {
  try {
    await connectDB();
    const app = createApp();
    const server = app.listen(config.port, () => console.log(`Campus Connect running on http://localhost:${config.port} (${config.env})`));
    const shutdown = () => server.close(() => require('mongoose').disconnect().then(() => process.exit(0)));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
})();
