# Subscriptions Module Documentation

## Overview

Complete subscription management system with plan management, usage tracking, and upgrade functionality.

---

## Endpoints

### 1. **GET /subscriptions/plans**

Get all available subscription plans.

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "Starter",
        "tier": "starter",
        "price_monthly": 49.00,
        "price_yearly": 490.00,
        "max_users": 5,
        "max_jobs_per_month": 100,
        "features": {
          "ai_chat": false,
          "advanced_reports": false,
          "custom_integrations": false,
          "priority_support": false,
          "bulk_operations": false,
          "api_access": false
        },
        "is_active": true
      },
      {
        "id": "uuid",
        "name": "Pro",
        "tier": "pro",
        "price_monthly": 149.00,
        "price_yearly": 1490.00,
        "max_users": 25,
        "max_jobs_per_month": null,
        "features": {
          "ai_chat": true,
          "advanced_reports": true,
          "custom_integrations": false,
          "priority_support": true,
          "bulk_operations": true,
          "api_access": true
        },
        "is_active": true
      },
      {
        "id": "uuid",
        "name": "Enterprise",
        "tier": "enterprise",
        "price_monthly": null,
        "price_yearly": null,
        "max_users": null,
        "max_jobs_per_month": null,
        "features": {
          "ai_chat": true,
          "advanced_reports": true,
          "custom_integrations": true,
          "priority_support": true,
          "bulk_operations": true,
          "api_access": true,
          "white_label": true,
          "dedicated_account_manager": true
        },
        "is_active": true
      }
    ]
  }
}
```

---

### 2. **GET /subscriptions/current**

Get current subscription for authenticated user's tenant.

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
    "subscription": {
      "id": "uuid",
      "status": "active",
      "startedAt": "2026-01-15T00:00:00Z",
      "expiresAt": "2027-01-15T00:00:00Z",
      "autoRenew": true
    },
    "plan": {
      "id": "uuid",
      "name": "Pro",
      "tier": "pro",
      "priceMonthly": 149.00,
      "priceYearly": 1490.00,
      "limits": {
        "maxUsers": 25,
        "maxJobsPerMonth": null
      },
      "features": {
        "ai_chat": true,
        "advanced_reports": true,
        "custom_integrations": false,
        "priority_support": true,
        "bulk_operations": true,
        "api_access": true
      }
    },
    "usage": {
      "users": {
        "current": 8
      },
      "jobs": {
        "thisMonth": 45,
        "total": 156
      }
    }
  }
}
```

**Errors:**
- `401` - Invalid or expired token
- `404` - No active subscription found

---

### 3. **GET /subscriptions/usage**

Get usage statistics for tenant.

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
    "users": {
      "current": 8
    },
    "jobs": {
      "thisMonth": 45,
      "total": 156
    }
  }
}
```

---

### 4. **POST /subscriptions/upgrade**

Upgrade subscription to a new plan.

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "planTier": "pro"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "new-uuid",
      "status": "active",
      "startedAt": "2026-02-17T10:30:00Z",
      "expiresAt": "2027-01-15T00:00:00Z",
      "autoRenew": true
    },
    "plan": {
      "id": "uuid",
      "name": "Pro",
      "tier": "pro",
      "priceMonthly": 149.00,
      "priceYearly": 1490.00,
      "limits": {
        "maxUsers": 25,
        "maxJobsPerMonth": null
      },
      "features": { ... }
    },
    "usage": { ... }
  },
  "message": "Successfully upgraded to pro plan"
}
```

**Errors:**
- `400` - Invalid plan tier
- `402` - Already on this plan
- `402` - Current usage exceeds new plan limits
- `402` - Downgrade not supported
- `404` - Plan not found

**Validation:**
- `planTier` must be one of: `starter`, `pro`, `enterprise`

**Notes:**
- Downgrades are not currently supported
- Old subscription is cancelled
- New subscription starts immediately
- Original expiry date is maintained
- Subscription cache is cleared

---

### 5. **GET /subscriptions/limits**

Check plan limits and current usage.

**Access:** Private

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `type` (optional) - Limit type: `users` or `jobs_per_month`

**Examples:**

**Check all limits:**
```
GET /subscriptions/limits
```

**Check specific limit:**
```
GET /subscriptions/limits?type=users
GET /subscriptions/limits?type=jobs_per_month
```

**Response (all limits):**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "checks": {
      "users": {
        "limit": 25,
        "current": 8,
        "remaining": 17,
        "exceeded": false,
        "unlimited": false
      },
      "jobsPerMonth": {
        "limit": null,
        "current": 45,
        "remaining": null,
        "exceeded": false,
        "unlimited": true
      }
    }
  }
}
```

**Response (specific limit):**
```json
{
  "success": true,
  "data": {
    "plan": "pro",
    "checks": {
      "users": {
        "limit": 25,
        "current": 8,
        "remaining": 17,
        "exceeded": false,
        "unlimited": false
      }
    }
  }
}
```

---

### 6. **GET /subscriptions/compare**

Get detailed plan comparison.

**Access:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "tier": "starter",
        "name": "Starter",
        "pricing": {
          "monthly": 49.00,
          "yearly": 490.00,
          "yearlyDiscount": 17
        },
        "limits": {
          "users": 5,
          "jobsPerMonth": 100
        },
        "features": {
          "ai_chat": false,
          "advanced_reports": false,
          "custom_integrations": false,
          "priority_support": false,
          "bulk_operations": false,
          "api_access": false
        }
      },
      {
        "tier": "pro",
        "name": "Pro",
        "pricing": {
          "monthly": 149.00,
          "yearly": 1490.00,
          "yearlyDiscount": 17
        },
        "limits": {
          "users": 25,
          "jobsPerMonth": "Unlimited"
        },
        "features": {
          "ai_chat": true,
          "advanced_reports": true,
          "custom_integrations": false,
          "priority_support": true,
          "bulk_operations": true,
          "api_access": true
        }
      },
      {
        "tier": "enterprise",
        "name": "Enterprise",
        "pricing": {
          "monthly": null,
          "yearly": null,
          "yearlyDiscount": null
        },
        "limits": {
          "users": "Unlimited",
          "jobsPerMonth": "Unlimited"
        },
        "features": {
          "ai_chat": true,
          "advanced_reports": true,
          "custom_integrations": true,
          "priority_support": true,
          "bulk_operations": true,
          "api_access": true,
          "white_label": true,
          "dedicated_account_manager": true
        }
      }
    ],
    "comparison": {
      "features": [
        "ai_chat",
        "advanced_reports",
        "custom_integrations",
        "priority_support",
        "bulk_operations",
        "api_access",
        "white_label",
        "dedicated_account_manager"
      ]
    }
  }
}
```

---

## Subscription Plans

### Starter - $49/month
- **Users:** 5
- **Jobs:** 100/month
- **Features:** Basic job management

### Pro - $149/month
- **Users:** 25
- **Jobs:** Unlimited
- **Features:** 
  - AI Chat ✅
  - Advanced Reports ✅
  - Priority Support ✅
  - Bulk Operations ✅
  - API Access ✅

### Enterprise - Custom Pricing
- **Users:** Unlimited
- **Jobs:** Unlimited
- **Features:**
  - All Pro features
  - Custom Integrations ✅
  - White Label ✅
  - Dedicated Account Manager ✅

**Yearly Discount:** 17% off when billed annually

---

## Usage Tracking

### Users
- Counts active users in tenant
- Checked against `max_users` limit

### Jobs
- Counts jobs created this month
- Checked against `max_jobs_per_month` limit
- Resets at start of each month

---

## Plan Upgrade Flow

```
1. GET /subscriptions/current
   ↓
   Check current plan
   ↓
2. GET /subscriptions/compare
   ↓
   Compare features
   ↓
3. POST /subscriptions/upgrade
   ↓
   Validate upgrade
   ↓
   Check usage vs limits
   ↓
   Cancel old subscription
   ↓
   Create new subscription
   ↓
   Clear cache
   ↓
   Return updated subscription
```

---

## Testing with cURL

### 1. Get All Plans (Public)
```bash
curl -X GET http://localhost:3000/subscriptions/plans
```

### 2. Get Current Subscription (Private)
```bash
curl -X GET http://localhost:3000/subscriptions/current \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Usage Stats
```bash
curl -X GET http://localhost:3000/subscriptions/usage \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Upgrade Plan
```bash
curl -X POST http://localhost:3000/subscriptions/upgrade \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planTier": "pro"
  }'
```

### 5. Check Limits
```bash
# Check all limits
curl -X GET http://localhost:3000/subscriptions/limits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Check specific limit
curl -X GET "http://localhost:3000/subscriptions/limits?type=users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6. Compare Plans
```bash
curl -X GET http://localhost:3000/subscriptions/compare
```

---

## Feature Gating Integration

The subscriptions module integrates with the `plan-guard` middleware:

```javascript
// Example: Require AI Chat feature
const { requireFeature } = require('../../middleware/plan-guard')

fastify.post('/ai/chat', {
  preHandler: [authenticate, requireFeature('ai_chat')]
}, handler)
```

**Available Features:**
- `ai_chat`
- `advanced_reports`
- `custom_integrations`
- `priority_support`
- `bulk_operations`
- `api_access`
- `white_label`
- `dedicated_account_manager`

---

## Limit Enforcement

The subscriptions module integrates with the `checkLimit` middleware:

```javascript
// Example: Check user limit before creating
const { checkLimit } = require('../../middleware/plan-guard')

fastify.post('/users', {
  preHandler: [authenticate, checkLimit('users')]
}, handler)
```

**Available Limits:**
- `users` - Maximum active users
- `jobs_per_month` - Maximum jobs per month

---

## Database Tables Used

### subscription_plans
- Available plan definitions
- Pricing and limits
- Feature flags

### tenant_subscriptions
- Active subscriptions
- Status tracking
- Expiry dates

### users
- User count for limits

### xpm_jobs
- Job count for limits
- Monthly tracking

---

## Caching

Subscription data is cached in Redis:

**Cache Key:** `subscription:{tenantId}`

**TTL:** 10 minutes

**Cleared on:**
- Plan upgrade
- Subscription change
- Manual cache clear

---

## Error Responses

### Validation Errors (400)
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "Plan tier must be one of: starter, pro, enterprise",
    "statusCode": 400
  }
}
```

### Subscription Errors (402)
```json
{
  "success": false,
  "error": {
    "name": "SubscriptionError",
    "message": "Already subscribed to pro plan",
    "statusCode": 402
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "name": "NotFoundError",
    "message": "No active subscription found",
    "statusCode": 404
  }
}
```

---

## Future Enhancements

### Subscription Cancellation
```javascript
// TODO: Implement
async cancelSubscription(tenantId) {
  // Set auto_renew to false
  // Set status to 'cancelled' at end of period
  // Send cancellation email
}
```

### Subscription Reactivation
```javascript
// TODO: Implement
async reactivateSubscription(tenantId) {
  // Reactivate cancelled subscription
  // Process payment
  // Send confirmation email
}
```

### Payment Integration
```javascript
// TODO: Add Stripe integration
// - Process payments
// - Handle webhooks
// - Manage invoices
```

### Usage Alerts
```javascript
// TODO: Alert when approaching limits
// - 80% usage warning
// - 100% usage notification
// - Email alerts
```

---

**Module 4: Subscriptions Complete!** ✅
