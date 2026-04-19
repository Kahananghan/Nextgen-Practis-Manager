# XPM Integration Module Documentation

## Overview

Complete Xero Practice Manager OAuth integration with secure token management and automatic token refresh.

---

## Endpoints

### 1. **GET /integrations/xero/connect**

Initiate Xero OAuth connection flow.

**Access:** Private (requires authentication)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "consentUrl": "https://login.xero.com/identity/connect/authorize?...",
    "state": "encrypted_state_for_csrf_protection"
  }
}
```

**Flow:**
1. User calls this endpoint
2. Backend generates OAuth consent URL
3. Frontend redirects user to `consentUrl`
4. User authorizes on Xero
5. Xero redirects to callback URL

---

### 2. **GET /integrations/xero/callback**

Handle OAuth callback from Xero (automatic redirect).

**Access:** Public (OAuth callback)

**Query Parameters:**
- `code` - Authorization code from Xero
- `state` - CSRF protection state
- `scope` - Granted scopes

**Process:**
1. Verifies state (CSRF protection)
2. Exchanges code for tokens
3. Encrypts tokens (AES-256-GCM)
4. Saves to database
5. Updates integration status
6. Redirects to frontend success page

**Frontend Redirect:**
- Success: `{FRONTEND_URL}/integrations/xero/success?tenant={name}`
- Error: `{FRONTEND_URL}/integrations/xero/error?message={error}`

---

### 3. **DELETE /integrations/xero/disconnect**

Disconnect Xero integration.

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Xero integration disconnected successfully"
  }
}
```

**Process:**
1. Revokes tokens with Xero API
2. Deletes tokens from database
3. Clears Redis cache
4. Updates integration status to 'disconnected'

---

### 4. **GET /integrations/xero/status**

Get Xero connection status.

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Connected):**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "tenant": {
      "id": "xpm-tenant-id",
      "name": "Practice Name",
      "type": "PRACTICE"
    },
    "expiresAt": "2026-02-17T11:30:00Z",
    "isExpired": false,
    "connectedAt": "2026-02-17T10:30:00Z",
    "lastUpdated": "2026-02-17T10:35:00Z"
  }
}
```

**Response (Not Connected):**
```json
{
  "success": true,
  "data": {
    "connected": false
  }
}
```

---

### 5. **GET /integrations**

Get all integrations for tenant.

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "integrations": [
      {
        "provider": "xero",
        "status": "connected",
        "last_sync_at": "2026-02-17T10:30:00Z",
        "error_message": null,
        "created_at": "2026-02-17T10:00:00Z",
        "updated_at": "2026-02-17T10:30:00Z"
      }
    ]
  }
}
```

**Status Values:**
- `connected` - Integration active
- `disconnected` - Integration removed
- `error` - Connection error (check error_message)

---

## OAuth Flow

### Complete Flow Diagram

```
1. Frontend: Call GET /integrations/xero/connect
   ↓
2. Backend: Generate consent URL
   ↓
3. Frontend: Redirect user to Xero login
   ↓
4. User: Authorizes on Xero
   ↓
5. Xero: Redirects to /integrations/xero/callback
   ↓
6. Backend: Exchange code for tokens
   ↓
7. Backend: Encrypt & save tokens
   ↓
8. Backend: Update integration status
   ↓
9. Backend: Redirect to frontend success page
   ↓
10. Frontend: Show success message
```

---

## Token Management

### Token Storage

**Encryption:** AES-256-GCM  
**Storage:** PostgreSQL `xero_tokens` table  
**Cache:** Redis (5-minute TTL)  

**Fields Encrypted:**
- `access_token`
- `refresh_token`
- `id_token`

### Automatic Token Refresh

Tokens are automatically refreshed when:
- Expires in less than 5 minutes
- Used in any API call via `getClientForUser()`

**Refresh Process:**
1. Check expiry time
2. If < 5 min, refresh token
3. Encrypt new tokens
4. Update database
5. Clear cache
6. Continue with API call

---

## Security Features

### CSRF Protection

**State Parameter:**
- Generated: `encrypt(JSON.stringify({ userId, tenantId, timestamp }))`
- Stored in Redis (5-minute expiry)
- Verified on callback
- Single-use only

### Token Encryption

**Algorithm:** AES-256-GCM  
**Components:**
- 16-byte IV (random per encryption)
- 16-byte auth tag
- Encrypted token data

**Storage Format:** Base64 encoded

### Session Management

**OAuth State:** Stored in Fastify session  
**CSRF Verification:** State must match  
**Expiry:** 5 minutes  

---

## Frontend Integration

### React Example

```javascript
// 1. Initiate Connection
const connectXero = async () => {
  const response = await fetch('/integrations/xero/connect', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  const { data } = await response.json()
  
  // Redirect user to Xero
  window.location.href = data.consentUrl
}

// 2. Handle Success (on /integrations/xero/success page)
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const tenantName = params.get('tenant')
  
  if (tenantName) {
    showNotification(`Connected to ${tenantName}`)
    // Redirect to dashboard
    navigate('/dashboard')
  }
}, [])

// 3. Check Status
const checkStatus = async () => {
  const response = await fetch('/integrations/xero/status', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  const { data } = await response.json()
  
  if (data.connected) {
    console.log('Connected to:', data.tenant.name)
  } else {
    console.log('Not connected')
  }
}

// 4. Disconnect
const disconnect = async () => {
  await fetch('/integrations/xero/disconnect', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  showNotification('Disconnected from Xero')
}
```

---

## Database Tables

### xero_tokens

```sql
CREATE TABLE xero_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  access_token TEXT NOT NULL,      -- Encrypted
  refresh_token TEXT NOT NULL,     -- Encrypted
  id_token TEXT,                   -- Encrypted
  expires_at TIMESTAMP NOT NULL,
  xpm_tenant_id VARCHAR(255),
  xpm_tenant_name VARCHAR(255),
  xpm_tenant_type VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### integrations

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  provider VARCHAR(100) CHECK (provider IN ('xero', ...)),
  status VARCHAR(50) CHECK (status IN ('connected', 'disconnected', 'error')),
  config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);
```

---

## Testing

### 1. Initiate Connection
```bash
# Login first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.nextgen.local",
    "password": "Demo123!"
  }'

# Get consent URL
curl -X GET http://localhost:3000/integrations/xero/connect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "consentUrl": "https://login.xero.com/identity/connect/authorize?...",
    "state": "..."
  }
}
```

### 2. Manual OAuth Flow

1. Copy `consentUrl` from response
2. Open in browser
3. Login to Xero
4. Authorize application
5. Get redirected to callback
6. Backend handles token exchange
7. Redirected to frontend success page

### 3. Check Status
```bash
curl -X GET http://localhost:3000/integrations/xero/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Disconnect
```bash
curl -X DELETE http://localhost:3000/integrations/xero/disconnect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Xero Developer Setup

### 1. Create Xero App

Visit: https://developer.xero.com/app/manage

**Settings:**
- App Name: NextGen XPM
- Company/App URL: Your domain
- OAuth 2.0 redirect URI: `http://localhost:3000/integrations/xero/callback`
- Scopes: 
  - `openid`
  - `profile`
  - `email`
  - `offline_access`
  - `practicemanager`

### 2. Get Credentials

After creating app:
- Copy **Client ID**
- Copy **Client Secret**
- Add to `.env`:

```env
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=http://localhost:3000/integrations/xero/callback
XERO_SCOPES=openid profile email offline_access practicemanager
```

### 3. Production Setup

For production:
- Update redirect URI to production URL
- Enable HTTPS
- Update CORS settings

---

## Error Handling

### Common Errors

**Invalid State:**
```json
{
  "success": false,
  "error": {
    "name": "AuthenticationError",
    "message": "Invalid OAuth state. Please try connecting again.",
    "statusCode": 403
  }
}
```

**No Organizations:**
```json
{
  "success": false,
  "error": {
    "name": "AuthenticationError",
    "message": "No Xero organizations connected",
    "statusCode": 401
  }
}
```

**Not Connected:**
```json
{
  "success": false,
  "error": {
    "name": "NotFoundError",
    "message": "No Xero connection found. Please connect to Xero first.",
    "statusCode": 404
  }
}
```

---

## Token Lifecycle

### Token Expiry

**Access Token:** 30 minutes  
**Refresh Token:** 60 days  
**Auto-Refresh:** When < 5 min remaining  

### Refresh Logic

```javascript
// Automatic refresh in getClientForUser()
const expiresIn = tokenSet.expires_at - now

if (expiresIn < 300) { // 5 minutes
  // Refresh token
  const newTokenSet = await client.refreshToken()
  // Save new tokens
  // Clear cache
}
```

---

## Integration Status Tracking

### Status Values

**connected:**
- OAuth successful
- Tokens valid
- Can sync data

**disconnected:**
- User disconnected
- No tokens stored
- Need to reconnect

**error:**
- OAuth failed
- Token refresh failed
- Connection issue
- Check `error_message`

### Status Updates

Automatically updated on:
- OAuth success → `connected`
- OAuth failure → `error`
- Disconnect → `disconnected`
- Token refresh failure → `error`

---

## Caching Strategy

### Token Cache

**Key:** `xero:tokens:{userId}`  
**TTL:** 5 minutes  
**Invalidation:**
- Token refresh
- Disconnect
- Manual clear

### OAuth State Cache

**Key:** `oauth:state:{userId}`  
**TTL:** 5 minutes  
**Single-use:** Deleted after verification

---

## Future Enhancements

### Multi-Organization Support
```javascript
// TODO: Support multiple Xero orgs per tenant
// - Allow selecting which org to use
// - Store multiple token sets
// - Switch between orgs
```

### Webhook Support
```javascript
// TODO: Xero webhooks for real-time updates
// - Subscribe to XPM events
// - Process webhook notifications
// - Trigger delta syncs
```

### Token Monitoring
```javascript
// TODO: Proactive token management
// - Monitor token health
// - Alert on expiry
// - Auto-reconnect prompts
```

---

**Module 5: XPM Integration Complete!** ✅
