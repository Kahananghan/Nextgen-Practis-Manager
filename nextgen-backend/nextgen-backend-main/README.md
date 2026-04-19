# Practis Manager Backend - Module 1: Core Setup ✅

Production-ready Fastify backend for Practis Manager XPM Enhancement Layer.

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 22.0.0
- **npm** >= 10.0.0
- **PostgreSQL** >= 14
- **Redis** >= 6

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate encryption keys
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# 3. Copy .env.development and fill in the generated keys
cp .env.development .env

# 4. Update .env with your:
#    - Database credentials
#    - Redis connection
#    - Xero OAuth credentials (from https://developer.xero.com/app/manage)
#    - Generated secrets from step 2

# 5. Create PostgreSQL database
createdb nextgen

# 6. Start the server
npm run dev
```

The server will start on `http://localhost:3000`

API Documentation: `http://localhost:3000/docs` (development only)

---

## 📁 Project Structure

```
nextgen-backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Main config with validation
│   │   ├── database.js   # PostgreSQL connection
│   │   ├── redis.js      # Redis client
│   │   └── xero.js       # Xero OAuth config
│   │
│   ├── middleware/       # Middleware functions
│   │   ├── auth.js       # JWT authentication
│   │   ├── tenant.js     # Multi-tenant isolation
│   │   ├── rbac.js       # Role-based access control
│   │   ├── plan-guard.js # Subscription feature gating
│   │   └── error-handler.js # Global error handling
│   │
│   ├── utils/            # Utility functions
│   │   ├── logger.js     # Winston logger
│   │   ├── errors.js     # Custom error classes
│   │   ├── validators.js # Joi validation schemas
│   │   └── crypto.js     # Encryption utilities
│   │
│   ├── modules/          # Feature modules (to be added)
│   ├── services/         # Service layer (to be added)
│   ├── models/           # Data models (to be added)
│   └── app.js            # Fastify app setup
│
├── server.js             # Application entry point
├── package.json          # Dependencies
└── .env.development      # Environment template
```

---

## 🔧 Configuration

All configuration is in `src/config/index.js` with **Joi validation**.

### Required Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nextgen
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (generate with crypto.randomBytes(32).toString('base64'))
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret
SESSION_MAX_AGE=86400000

# Encryption
TOKEN_ENCRYPTION_KEY=your_encryption_key

# Xero OAuth
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
XERO_REDIRECT_URI=http://localhost:3000/integrations/xero/callback
XERO_SCOPES=openid profile email accounting.transactions accounting.contacts offline_access practicemanager

# Security
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=15m
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=info
```

---

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start                # Start production server

# Database
npm run db:setup         # Create database tables
npm run db:migrate       # Run migrations
npm run db:seed          # Seed initial data

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:integration # Integration tests only

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style
npm run format           # Format with Prettier

# Docker
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
```

---

## 🔐 Security Features

### 1. **Authentication (JWT)**
```javascript
const { authenticate } = require('./middleware/auth')

// Protect route
fastify.get('/protected', { preHandler: authenticate }, handler)
```

### 2. **Multi-Tenant Isolation**
```javascript
const { ensureTenantIsolation } = require('./middleware/tenant')

// Ensure tenant data isolation
fastify.get('/data', { 
  preHandler: [authenticate, ensureTenantIsolation] 
}, handler)
```

### 3. **Role-Based Access Control (RBAC)**
```javascript
const { requirePermission, requireRole } = require('./middleware/rbac')

// Require specific permission
fastify.delete('/jobs/:id', {
  preHandler: [authenticate, requirePermission('jobs', 'delete')]
}, handler)

// Require role
fastify.get('/admin', {
  preHandler: [authenticate, requireRole('admin', 'manager')]
}, handler)
```

### 4. **Subscription Plan Gating**
```javascript
const { requireFeature, checkLimit } = require('./middleware/plan-guard')

// Require feature in plan
fastify.post('/ai/chat', {
  preHandler: [authenticate, requireFeature('ai_chat')]
}, handler)

// Check usage limits
fastify.post('/users', {
  preHandler: [authenticate, checkLimit('users')]
}, handler)
```

### 5. **Token Encryption (AES-256-GCM)**
```javascript
const crypto = require('./utils/crypto')

// Encrypt sensitive tokens before DB storage
const encrypted = crypto.encrypt('sensitive_token')

// Decrypt when needed
const decrypted = crypto.decrypt(encrypted)
```

---

## 🏥 Health Checks

### Basic Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

### Detailed Health Check
```bash
curl http://localhost:3000/health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-17T10:30:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "timestamp": "2026-02-17T10:30:00.000Z"
    },
    "redis": {
      "status": "healthy",
      "response": "PONG"
    }
  }
}
```

---

## 🚨 Error Handling

All errors are caught and formatted consistently:

```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "Email is required",
    "statusCode": 400
  }
}
```

### Available Error Classes

- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `SubscriptionError` (402)
- `XeroApiError` (502)
- `DatabaseError` (500)

---

## 📝 Logging

Winston logger with structured logging:

```javascript
const logger = require('./utils/logger')

logger.info({
  event: 'USER_LOGIN',
  userId: user.id,
  status: 'SUCCESS'
})

logger.error({
  event: 'DB_ERROR',
  error: error.message,
  query: 'SELECT...'
})
```

**Log Levels:** `error`, `warn`, `info`, `debug`, `trace`

**Production:** Logs written to `logs/error.log` and `logs/combined.log`

---

## 🔒 Rate Limiting

Default: **100 requests per 15 minutes**

Configured in `.env`:
```env
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=15m
```

Rate limit exceeded response:
```json
{
  "success": false,
  "error": {
    "name": "RateLimitError",
    "message": "Too many requests. Please try again later.",
    "statusCode": 429
  }
}
```

---

## 🐳 Docker Support

Coming in future modules with docker-compose setup for:
- PostgreSQL
- Redis
- Application container

---

## 🧪 Testing

(To be added in future modules)

Test structure:
```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

---

## 📊 Database Connection

PostgreSQL connection with:
- **Connection pooling** (2-20 connections)
- **Auto-reconnect** on failure
- **Transaction support**
- **Health checks**

Example query:
```javascript
const db = require('./config/database')

const result = await db.query('SELECT * FROM users WHERE id = $1', [userId])
```

Example transaction:
```javascript
await db.transaction(async (client) => {
  await client.query('INSERT INTO users ...')
  await client.query('INSERT INTO profiles ...')
  // Auto-commit on success, auto-rollback on error
})
```

---

## 🔴 Redis Integration

Redis client with:
- **Auto-reconnect**
- **JSON serialization**
- **TTL support**
- **Health checks**

Example usage:
```javascript
const redis = require('./config/redis')

// Set with 5-minute expiry
await redis.set('user:123', userData, 300)

// Get
const data = await redis.get('user:123')

// Delete
await redis.delete('user:123')
```

---

## 🔐 Password Hashing

Bcrypt with 10 salt rounds:

```javascript
const crypto = require('./utils/crypto')

// Hash password
const hash = await crypto.hashPassword('myPassword123')

// Verify password
const isValid = await crypto.comparePassword('myPassword123', hash)
```

---

## 🎯 Next Steps

**Module 1 is complete!** ✅

**Next Module: Database Schema (Module 2)**

Create:
- 23 database migration files
- Seed data for subscription plans
- Initial tenant setup

See `NEXTGEN_BACKEND_ROADMAP.md` for full development plan.

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
cat .env | grep DB_
```

### Redis Connection Failed
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### JWT Verification Failed
- Ensure `JWT_SECRET` is set and matches across requests
- Check token expiry (default 1 hour)
- Verify token format: `Authorization: Bearer <token>`

---

## 📚 Documentation

- **API Docs:** http://localhost:3000/docs (development only)
- **Fastify:** https://www.fastify.io/
- **Xero API:** https://developer.xero.com/documentation/
- **Winston:** https://github.com/winstonjs/winston
- **Joi:** https://joi.dev/

---

## 📄 License

MIT License - Product Array

---

## 👨‍💻 Author

**Product Array**  
Building modern solutions for Australian accounting practices.

---

**Module 1: Core Setup - Complete! 🎉**

Ready to move to Module 2: Database Schema
