# Module 1: Core Setup - Setup Guide

## ✅ What We've Built

### 1. Project Structure
- Complete folder hierarchy
- Proper separation of concerns
- Scalable architecture

### 2. Configuration System
- Environment-based config with Joi validation
- PostgreSQL connection with pooling
- Redis client with auto-reconnect
- Xero OAuth configuration

### 3. Core Middleware
- **JWT Authentication** - Token verification
- **Tenant Isolation** - Multi-tenant data separation
- **RBAC** - Role and permission-based access
- **Plan Guard** - Subscription feature gating
- **Error Handler** - Centralized error management

### 4. Utility Functions
- **Logger** - Winston structured logging
- **Errors** - Custom error classes
- **Validators** - Joi schemas for common validations
- **Crypto** - AES-256-GCM encryption + bcrypt hashing

### 5. Fastify Application
- Security headers (Helmet)
- CORS configuration
- Rate limiting (Redis-backed)
- JWT plugin
- Session management (Redis store)
- Swagger documentation (dev only)
- Health check endpoints

---

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
cd nextgen-backend
npm install
```

This installs:
- `fastify` - Web framework
- `pg` - PostgreSQL client
- `ioredis` - Redis client
- `xero-node` - Xero API SDK
- `joi` - Validation
- `winston` - Logging
- `bcrypt` - Password hashing
- `bullmq` - Queue system
- Plus all Fastify plugins

---

### Step 2: Generate Security Keys

Run these commands to generate strong random keys:

```bash
# Generate JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate session secret
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate encryption key
node -e "console.log('TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

**Save these outputs!** You'll need them in the next step.

---

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.development .env

# Edit .env and fill in:
nano .env
```

**Required changes:**

1. **Database** (your PostgreSQL credentials):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nextgen
DB_USER=postgres
DB_PASSWORD=your_password_here
```

2. **Redis** (if password-protected):
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_or_leave_empty
```

3. **Security Keys** (paste from Step 2):
```env
JWT_SECRET=<paste_generated_jwt_secret>
SESSION_SECRET=<paste_generated_session_secret>
TOKEN_ENCRYPTION_KEY=<paste_generated_encryption_key>
```

4. **Xero OAuth** (get from https://developer.xero.com/app/manage):
```env
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=http://localhost:3000/integrations/xero/callback
```

5. **CORS** (your frontend URL):
```env
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

---

### Step 4: Setup PostgreSQL Database

```bash
# Create database
createdb nextgen

# Or using psql
psql -U postgres
CREATE DATABASE nextgen;
\q
```

---

### Step 5: Setup Redis

**Option A: Install locally**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt install redis-server
sudo systemctl start redis

# Verify
redis-cli ping
# Should return: PONG
```

**Option B: Use Docker**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

---

### Step 6: Start the Server

```bash
# Development mode (auto-reload)
npm run dev

# Or production mode
npm start
```

**Success output:**
```
============================================================
🚀 Practis Manager Backend is running!
   Environment: development
   Address: http://0.0.0.0:3000
   API Docs: http://localhost:3000/docs
============================================================
```

---

### Step 7: Test the Server

**Test health endpoint:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

**Test detailed health:**
```bash
curl http://localhost:3000/health/detailed
```

Expected response:
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

**Browse API docs:**
Open in browser: http://localhost:3000/docs

---

## 📁 Files Created

### Configuration (5 files)
- ✅ `src/config/index.js` - Main config with Joi validation
- ✅ `src/config/database.js` - PostgreSQL connection pool
- ✅ `src/config/redis.js` - Redis client with reconnect
- ✅ `src/config/xero.js` - Xero OAuth factory

### Middleware (5 files)
- ✅ `src/middleware/auth.js` - JWT authentication
- ✅ `src/middleware/tenant.js` - Multi-tenant isolation
- ✅ `src/middleware/rbac.js` - Permission checks with caching
- ✅ `src/middleware/plan-guard.js` - Subscription limits
- ✅ `src/middleware/error-handler.js` - Global error handling

### Utilities (4 files)
- ✅ `src/utils/logger.js` - Winston structured logging
- ✅ `src/utils/errors.js` - 10 custom error classes
- ✅ `src/utils/validators.js` - Common Joi schemas
- ✅ `src/utils/crypto.js` - AES-256 encryption + bcrypt

### Application (2 files)
- ✅ `src/app.js` - Fastify app with all plugins
- ✅ `server.js` - Entry point with graceful shutdown

### Setup Files (5 files)
- ✅ `package.json` - Dependencies and scripts
- ✅ `.env.development` - Environment template
- ✅ `.gitignore` - Git ignore rules
- ✅ `.eslintrc.js` - Code linting rules
- ✅ `.prettierrc.js` - Code formatting rules

### Documentation (2 files)
- ✅ `README.md` - Complete usage guide
- ✅ `MODULE_1_SETUP.md` - This file

**Total: 23 files created** ✅

---

## 🧪 Quick Tests

### Test 1: JWT Generation
```javascript
// In Node.js REPL or script
const jwt = require('jsonwebtoken')
const secret = 'your_jwt_secret_from_env'

const token = jwt.sign(
  { userId: '123', tenantId: '456', email: 'test@example.com' },
  secret,
  { expiresIn: '1h' }
)

console.log('Token:', token)

// Verify
const decoded = jwt.verify(token, secret)
console.log('Decoded:', decoded)
```

### Test 2: Password Hashing
```javascript
// In Node.js REPL
const bcrypt = require('bcrypt')

async function test() {
  const hash = await bcrypt.hash('myPassword123', 10)
  console.log('Hash:', hash)
  
  const match = await bcrypt.compare('myPassword123', hash)
  console.log('Match:', match) // true
  
  const wrong = await bcrypt.compare('wrongPassword', hash)
  console.log('Wrong:', wrong) // false
}

test()
```

### Test 3: Encryption
```javascript
// Create test file: test-crypto.js
const crypto = require('./src/utils/crypto')

const plaintext = 'my_secret_access_token'
const encrypted = crypto.encrypt(plaintext)
console.log('Encrypted:', encrypted)

const decrypted = crypto.decrypt(encrypted)
console.log('Decrypted:', decrypted)
console.log('Match:', plaintext === decrypted)

// Run: node test-crypto.js
```

---

## 🔍 Verification Checklist

Before moving to Module 2, verify:

- [ ] `npm install` completed successfully
- [ ] PostgreSQL is running and accessible
- [ ] Redis is running and responding to PING
- [ ] `.env` file is configured with all secrets
- [ ] Server starts without errors (`npm run dev`)
- [ ] Health check returns `"status": "ok"`
- [ ] Detailed health shows both services as "healthy"
- [ ] API docs accessible at http://localhost:3000/docs
- [ ] No errors in terminal logs

---

## 🐛 Common Issues & Fixes

### Issue: "Config validation error: DB_HOST is required"
**Fix:** Your `.env` file is missing or not loaded. Ensure:
1. File is named `.env` (not `.env.txt`)
2. File is in project root (same level as `server.js`)
3. All required variables are filled in

### Issue: "ECONNREFUSED" for PostgreSQL
**Fix:** 
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql
```

### Issue: "ECONNREFUSED" for Redis
**Fix:**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# macOS: brew services start redis
# Ubuntu: sudo systemctl start redis

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

### Issue: "Port 3000 already in use"
**Fix:**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### Issue: "Encryption key must be 32 bytes"
**Fix:** Regenerate the encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Update `TOKEN_ENCRYPTION_KEY` in `.env`

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `DB_HOST` | **Yes** | - | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | **Yes** | - | Database name |
| `DB_USER` | **Yes** | - | Database user |
| `DB_PASSWORD` | **Yes** | - | Database password |
| `REDIS_HOST` | **Yes** | - | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | `''` | Redis password |
| `JWT_SECRET` | **Yes** | - | JWT signing secret |
| `JWT_EXPIRES_IN` | No | `1h` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token expiry |
| `SESSION_SECRET` | **Yes** | - | Session signing secret |
| `TOKEN_ENCRYPTION_KEY` | **Yes** | - | AES-256 encryption key |
| `XERO_CLIENT_ID` | **Yes** | - | Xero OAuth client ID |
| `XERO_CLIENT_SECRET` | **Yes** | - | Xero OAuth secret |
| `XERO_REDIRECT_URI` | **Yes** | - | OAuth callback URL |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_TIME_WINDOW` | No | `15m` | Rate limit window |
| `LOG_LEVEL` | No | `info` | Logging level |

---

## 🎯 Next Steps

**Module 1 Complete!** 🎉

**Ready for Module 2: Database Schema**

Module 2 will create:
- 23 database migration files
- All table schemas
- Indexes and relationships
- Seed data for subscription plans
- Database setup scripts

See `NEXTGEN_BACKEND_ROADMAP.md` for complete development plan.

---

## 📞 Support

If you encounter issues not covered here, check:
1. All environment variables are set correctly
2. PostgreSQL and Redis are running
3. Node.js version is >= 22.0.0
4. No port conflicts

---

**Module 1: Core Setup - Complete!** ✅
