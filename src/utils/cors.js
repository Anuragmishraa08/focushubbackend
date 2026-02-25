const sanitizeOriginValue = (value = '') =>
  value
    .replace(/[\r\n\t]/g, '')
    .replace(/^['\"]|['\"]$/g, '')
    .trim()
    .replace(/\/+$/, '');

const vercelPattern = /^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/;

const buildAllowedOrigins = () =>
  (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((item) => sanitizeOriginValue(item))
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = sanitizeOriginValue(origin);
  const allowedOrigins = buildAllowedOrigins();
  const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW !== 'false';

  if (allowedOrigins.includes(normalizedOrigin)) return true;
  if (allowVercelPreview && vercelPattern.test(normalizedOrigin)) return true;

  return false;
};

const expressCorsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
};

const socketCorsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin))
};

module.exports = { isAllowedOrigin, expressCorsOptions, socketCorsOptions };
