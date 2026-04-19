# NextGen Database Schema

## Overview

**Total Tables:** 23  
**Migration Files:** 23  
**Seed Files:** 2

---

## Table Categories

### 1. Core Tables (4)
- `tenants` - Multi-tenant organizations
- `users` - User accounts
- `subscription_plans` - Available subscription tiers
- `tenant_subscriptions` - Active subscriptions

### 2. RBAC Tables (4)
- `roles` - Custom roles per tenant
- `permissions` - Permission definitions
- `user_roles` - User-role mapping
- `user_permissions` - Direct user permissions

### 3. Auth & Security Tables (2)
- `otp_codes` - Email verification codes
- `xero_tokens` - Encrypted OAuth tokens

### 4. Integration Tables (1)
- `integrations` - Third-party connection status

### 5. XPM Synced Tables (5)
- `xpm_clients` - Clients from XPM
- `xpm_staff` - Staff from XPM
- `xpm_jobs` - Jobs from XPM
- `xpm_tasks` - Tasks from XPM
- `xpm_categories` - Job categories from XPM

### 6. Local Feature Tables (5)
- `templates` - Job templates
- `template_tasks` - Tasks in templates
- `favourite_clients` - User's starred clients
- `chat_messages` - Internal messaging
- `alerts` - System notifications

### 7. Operational Tables (2)
- `sync_logs` - XPM sync operation logs
- `user_staff_mapping` - User to XPM staff mapping

---

## Entity Relationships

```
tenants
  ├── users
  │   ├── user_roles → roles
  │   ├── user_permissions → permissions
  │   ├── otp_codes
  │   ├── xero_tokens
  │   ├── favourite_clients → xpm_clients
  │   ├── chat_messages (from/to)
  │   ├── alerts
  │   ├── templates
  │   └── user_staff_mapping → xpm_staff
  │
  ├── tenant_subscriptions → subscription_plans
  ├── integrations
  ├── sync_logs
  │
  ├── xpm_clients
  │   └── xpm_jobs
  │       └── xpm_tasks
  │
  ├── xpm_staff
  │   ├── xpm_jobs (assigned_staff, manager)
  │   └── user_staff_mapping
  │
  └── xpm_categories
```

---

## Key Indexes

### Performance Indexes
- `idx_xpm_jobs_tenant_state` - Fast job filtering
- `idx_xpm_jobs_overdue` - Quick overdue job lookup
- `idx_user_permissions_active` - Active permission checks
- `idx_alerts_unread` - Unread alerts per user
- `idx_chat_messages_conversation` - Message threads

### Unique Constraints
- `users.email` - Unique email addresses
- `tenants.domain` - Unique custom domains
- `xpm_clients(tenant_id, xpm_client_id)` - Prevent duplicates
- `xpm_jobs(tenant_id, xpm_job_id)` - Prevent duplicates
- `user_staff_mapping.user_id` - One-to-one mapping

---

## Data Types

### UUID Fields
All primary keys use `UUID` (gen_random_uuid())

### Timestamps
- `created_at` - Record creation time
- `updated_at` - Last modification time
- `last_synced_at` - Last XPM sync time

### JSONB Fields
- `subscription_plans.features` - Feature flags
- `integrations.config` - Provider config
- `xpm_*.xpm_data` - Full XPM API response
- `xpm_clients.address` - Structured address

### Enums (CHECK constraints)
- Job state: Planned, In Progress, On Hold, Complete
- Job priority: Low, Normal, Medium, High
- Alert type: overdue, due_soon, completed, assigned, system
- Sync type: full, delta
- Subscription status: active, expired, cancelled

---

## Cascading Deletes

### ON DELETE CASCADE
- Delete tenant → Deletes all related data
- Delete user → Deletes user's data
- Delete job → Deletes related tasks
- Delete template → Deletes template tasks

### ON DELETE SET NULL
- Delete client → Sets job.client_id to NULL
- Delete staff → Sets job.assigned_staff_id to NULL

---

## Subscription Plans

### Starter
- **Price:** $49/month, $490/year
- **Limits:** 5 users, 100 jobs/month
- **Features:** Basic job management

### Pro
- **Price:** $149/month, $1,490/year
- **Limits:** 25 users, unlimited jobs
- **Features:** AI chat, advanced reports, bulk operations, API access

### Enterprise
- **Price:** Custom
- **Limits:** Unlimited
- **Features:** All Pro features + custom integrations, white label, dedicated support

---

## Default Permissions

```sql
-- Full Access
('full_access', 'all')

-- Jobs
('jobs', 'create')
('jobs', 'view')
('jobs', 'edit')
('jobs', 'delete')

-- Reports
('reports', 'create')
('reports', 'view')
('reports', 'edit')

-- Users
('users', 'create')
('users', 'view')
('users', 'edit')
('users', 'delete')

-- Templates
('templates', 'create')
('templates', 'view')
('templates', 'edit')
('templates', 'delete')

-- Clients
('clients', 'view')

-- Settings
('settings', 'manage')
```

---

## Migration Order

Migrations must run in sequence:

1. **Foundation:** tenants, users
2. **Subscriptions:** plans, tenant_subscriptions
3. **RBAC:** roles, permissions, user_roles, user_permissions
4. **Auth:** otp_codes
5. **Integrations:** integrations, xero_tokens
6. **XPM Sync:** xpm_clients, xpm_staff, xpm_categories
7. **XPM Jobs:** xpm_jobs, xpm_tasks
8. **Local Features:** templates, template_tasks, favourite_clients, chat_messages, alerts
9. **Operational:** sync_logs, user_staff_mapping

---

## Sync Strategy

### Full Sync (Initial)
Runs once after Xero connection:
- Sync all clients
- Sync all staff
- Sync all job categories
- Sync all current jobs
- Sync tasks for each job

### Delta Sync (Ongoing)
Runs every 5-15 minutes:
- Uses `modifiedsince` header
- Only syncs changed records
- Updates `last_synced_at` timestamp

---

## Security Features

### Encrypted Fields
- `xero_tokens.access_token` - AES-256-GCM
- `xero_tokens.refresh_token` - AES-256-GCM
- `xero_tokens.id_token` - AES-256-GCM
- `users.password_hash` - bcrypt (10 rounds)

### Multi-Tenant Isolation
All queries filtered by `tenant_id`:
```sql
WHERE tenant_id = $1
```

### RBAC Enforcement
Permission checks via:
```sql
user_permissions + user_roles → permissions
```

---

## Sample Queries

### Get User's Active Jobs
```sql
SELECT j.* 
FROM xpm_jobs j
JOIN user_staff_mapping usm ON j.assigned_staff_id = usm.xpm_staff_id
WHERE usm.user_id = $1
  AND j.state = 'In Progress'
ORDER BY j.due_date ASC;
```

### Get Overdue Jobs Count
```sql
SELECT COUNT(*) 
FROM xpm_jobs
WHERE tenant_id = $1
  AND due_date < CURRENT_DATE
  AND state != 'Complete';
```

### Check User Permission
```sql
SELECT EXISTS(
  SELECT 1 FROM user_permissions up
  JOIN permissions p ON up.permission_id = p.id
  WHERE up.user_id = $1
    AND p.resource = $2
    AND p.action = $3
    AND up.is_active = true
);
```

### Get Job Progress
```sql
SELECT 
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_tasks,
  ROUND(100.0 * COUNT(*) FILTER (WHERE is_completed = true) / COUNT(*), 0) as progress
FROM xpm_tasks
WHERE job_id = $1;
```

---

## Backup Recommendations

### Daily Backups
- Full database dump
- Encrypted token backup (separate file)
- Sync logs (for audit trail)

### Retention
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months

---

## Performance Considerations

### Indexes Created: 60+
All foreign keys indexed for JOIN performance

### Query Optimization
- Composite indexes on common filters
- Partial indexes for common WHERE clauses
- JSONB indexes for feature flags (future)

### Partitioning (Future)
Consider partitioning for:
- `sync_logs` by created_at (monthly)
- `chat_messages` by created_at (monthly)
- `alerts` by created_at (weekly)

---

**Schema Version:** 1.0  
**Last Updated:** Module 2 - Database Schema  
**Migration Count:** 23
