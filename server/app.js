const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const config = require('./config');
const { sanitize, originCheck } = require('./middleware/security');
const { notFoundHandler, errorHandler } = require('./middleware/error');

function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: config.isProd ? [] : null,
      },
    },
  }));
  app.use(compression());
  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));

  // CORS: same-origin by default; cross-origin only for explicitly listed origins
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && config.corsOrigins.includes(origin)) {
      res.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE', Vary: 'Origin' });
      if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(sanitize);

  app.use(session({
    name: 'cc.sid',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: config.isTest ? undefined : MongoStore.create({ mongoUrl: config.mongoUri, ttl: 7 * 24 * 3600 }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 7 * 24 * 3600 * 1000 },
  }));
  app.use(originCheck);

  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', require('./routes'));

  // Code files revalidate on every load (ETag -> 304), so a deploy is visible immediately and the
  // browser never mixes new HTML with old CSS/JS. Images and vendor libraries are cached for a day.
  app.use(express.static(path.join(__dirname, '../public'), {
    extensions: ['html'],
    setHeaders: (res, file) => {
      if (/\.(html|css|js)$/.test(file) && !file.includes(`${path.sep}vendor${path.sep}`)) res.setHeader('Cache-Control', 'no-cache');
      else res.setHeader('Cache-Control', config.isProd ? 'public, max-age=86400' : 'no-cache');
    },
  }));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
