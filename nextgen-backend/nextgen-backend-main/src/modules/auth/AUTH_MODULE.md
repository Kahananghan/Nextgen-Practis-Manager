# Auth Module Documentation

## Overview

Complete authentication system with JWT tokens, OTP verification, and password management.

---

## Endpoints

### 1. **POST /auth/login**

Login with email and password.

**Request:**
```json
{
  "email": "admin@demo.nextgen.local",
  "password": "Demo123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "tenant_id": "uuid",
      "email": "admin@demo.nextgen.local",
      "name": "Demo Admin",
      "mobile": "+61412345678",
      "avatar": null,
      "status": "active",
      "tenant_name": "Demo Practice"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `401` - Account not active
- `401` - Organization not active

---

### 2. **POST /auth/forgot-password**

Request password reset OTP via email.

**Request:**
```json
{
  "email": "admin@demo.nextgen.local"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, a verification code has been sent",
    // Development only:
    "otp": "1234",
    "email": "admin@demo.nextgen.local"
  }
}
```

**Notes:**
- Always returns success (doesn't reveal if user exists)
- In development, OTP is logged and returned in response
- In production, OTP is sent via email (not implemented yet)
- OTP expires in 10 minutes

---

### 3. **POST /auth/verify-otp**

Verify OTP code and get reset token.

**Request:**
```json
{
  "email": "admin@demo.nextgen.local",
  "otp": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "resetToken": "encrypted_reset_token_here",
    "email": "admin@demo.nextgen.local"
  }
}
```

**Errors:**
- `400` - Invalid or expired OTP
- `400` - OTP already used

**Notes:**
- OTP is marked as used after verification
- Reset token is valid for 15 minutes

---

### 4. **POST /auth/reset-password**

Reset password using reset token from OTP verification.

**Request:**
```json
{
  "resetToken": "encrypted_reset_token_here",
  "password": "NewPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password reset successful. You can now login with your new password."
  }
}
```

**Errors:**
- `400` - Invalid reset token
- `400` - Reset token expired
- `400` - Password validation failed

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

### 5. **POST /auth/refresh-token**

Get new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_access_token_here",
    "user": {
      "id": "uuid",
      "tenant_id": "uuid",
      "email": "admin@demo.nextgen.local",
      "name": "Demo Admin"
    }
  }
}
```

**Errors:**
- `401` - Invalid refresh token
- `401` - User not active
- `401` - Organization not active

---

### 6. **GET /auth/me**

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "tenant_id": "uuid",
      "email": "admin@demo.nextgen.local",
      "name": "Demo Admin",
      "mobile": "+61412345678",
      "avatar": null,
      "status": "active",
      "last_login": "2026-02-17T10:30:00Z",
      "tenant_name": "Demo Practice"
    }
  }
}
```

**Errors:**
- `401` - Invalid or expired token
- `404` - User not found

---

### 7. **POST /auth/change-password**

Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "oldPassword": "Demo123!",
  "newPassword": "NewPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Errors:**
- `400` - Current password incorrect
- `400` - New password validation failed
- `401` - Invalid or expired token

---

### 8. **POST /auth/logout**

Logout user (client-side token removal).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Notes:**
- Stateless JWT system
- Client should remove tokens from storage
- Optional: Token blacklist in Redis (commented in code)

---

## Authentication Flow

### Login Flow
```
1. POST /auth/login
   ↓
2. Validate credentials
   ↓
3. Generate JWT tokens
   ↓
4. Return user + tokens
```

### Password Reset Flow
```
1. POST /auth/forgot-password
   ↓
2. Generate 4-digit OTP
   ↓
3. Save OTP (expires 10 mins)
   ↓
4. Send OTP via email
   ↓
5. POST /auth/verify-otp
   ↓
6. Validate OTP
   ↓
7. Generate reset token (expires 15 mins)
   ↓
8. POST /auth/reset-password
   ↓
9. Validate reset token
   ↓
10. Update password
```

### Token Refresh Flow
```
1. Access token expires (1 hour)
   ↓
2. POST /auth/refresh-token with refresh token
   ↓
3. Verify refresh token (7 days)
   ↓
4. Generate new access token
   ↓
5. Continue API requests
```

---

## JWT Token Structure

### Access Token
```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234571490  // 1 hour
}
```

### Refresh Token
```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "email": "user@example.com",
  "type": "refresh",
  "iat": 1234567890,
  "exp": 1235172690  // 7 days
}
```

---

## Security Features

### Password Security
- **Bcrypt hashing** with 10 salt rounds
- **Password requirements:** 8+ chars, uppercase, lowercase, number
- **Automatic salting** per password

### OTP Security
- **4-digit random code**
- **10-minute expiration**
- **Single-use only** (marked as used after verification)
- **Email-based delivery** (production)

### Token Security
- **JWT signing** with HS256
- **Access token:** 1 hour expiry
- **Refresh token:** 7 days expiry
- **Encrypted reset tokens** (AES-256-GCM)

### Account Security
- **Status checks:** User and tenant must be active
- **Last login tracking**
- **Failed login logging**

---

## Testing with cURL

### 1. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.nextgen.local",
    "password": "Demo123!"
  }'
```

### 2. Get Current User
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Request Password Reset
```bash
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.nextgen.local"
  }'
```

### 4. Verify OTP
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.nextgen.local",
    "otp": "1234"
  }'
```

### 5. Reset Password
```bash
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "resetToken": "RESET_TOKEN_FROM_VERIFY_OTP",
    "password": "NewPass123!"
  }'
```

### 6. Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 7. Change Password
```bash
curl -X POST http://localhost:3000/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Demo123!",
    "newPassword": "NewPass123!"
  }'
```

### 8. Logout
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "name": "AuthenticationError",
    "message": "Invalid email or password",
    "statusCode": 401
  }
}
```

### Common Status Codes
- `200` - Success
- `400` - Validation error
- `401` - Authentication failed
- `404` - Resource not found
- `500` - Internal server error

---

## Database Tables Used

### users
- Email and password verification
- User status checks
- Last login tracking

### tenants
- Organization status checks
- Multi-tenant isolation

### otp_codes
- OTP storage and verification
- Expiration tracking
- Single-use enforcement

---

## Future Enhancements

### Email Service
```javascript
// TODO: Implement email service
const emailService = require('../../services/email')

async forgotPassword(email) {
  // ...
  await emailService.sendOTP(user.email, user.name, otp)
}
```

### Token Blacklist
```javascript
// TODO: Add to logout
const redis = require('../../config/redis')

async logout(request, reply) {
  const token = request.headers.authorization.split(' ')[1]
  const decoded = request.server.jwt.decode(token)
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000)
  await redis.set(`blacklist:${token}`, '1', expiresIn)
}
```

### Rate Limiting
```javascript
// TODO: Add stricter rate limiting on auth endpoints
fastify.register(rateLimit, {
  max: 5,
  timeWindow: '15 minutes',
  redis: redis.client
})
```

---

**Module 3: Auth Complete!** ✅
