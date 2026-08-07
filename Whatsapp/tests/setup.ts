process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/college_whatsapp_test';
process.env.PORT = '3001';
process.env.CORS_ORIGINS = 'http://localhost:3001';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';
process.env.WA_SESSION_DIR = './test_auth_info';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long!!';
process.env.JWT_EXPIRES_IN = '1h';
process.env.LOGIN_PORTAL_URL = 'http://localhost:5173/login';
process.env.BCRYPT_ROUNDS = '4';

process.env.GEMINI_API_KEY = 'test-gemini-api-key';