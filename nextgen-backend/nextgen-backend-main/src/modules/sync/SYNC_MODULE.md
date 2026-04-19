# Sync Engine Module Documentation

## Overview

Complete background synchronization system using BullMQ for syncing data from Xero Practice Manager to local database.

---

## Architecture

### Components

1. **Sync Service** - Business logic for full/delta sync
2. **Sync Queue** - BullMQ job queue management
3. **Sync Worker** - Background job processor
4. **Sync Controller** - HTTP API endpoints
5. **Sync Routes** - API route definitions

---

## Endpoints

### 1. **POST /sync/full**

Trigger full synchronization of all XPM data.

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
    "message": "Full sync started",
    "jobId": "full-sync-tenant-id-1234567890"
  }
}
```

**Process:**
1. Adds job to BullMQ queue
2. Worker processes in background
3. Syncs all entities: clients, staff, categories, jobs, tasks
4. Records sync log

---

### 2. **POST /sync/delta**

Trigger delta sync (incremental, modified data only).

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
    "message": "Delta sync started",
    "jobId": "delta-sync-tenant-id-1234567890"
  }
}
```

**Process:**
1. Gets last sync timestamp
2. Syncs only modified records since last sync
3. Falls back to full sync if no previous sync found

---

### 3. **GET /sync/status**

Get sync status and history.

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
    "history": [
      {
        "id": "uuid",
        "sync_type": "full",
        "entity": "all",
        "status": "completed",
        "records_synced": 350,
        "error_message": null,
        "started_at": "2026-02-17T10:00:00Z",
        "completed_at": "2026-02-17T10:05:30Z",
        "duration_ms": 330000
      }
    ],
    "stats": {
      "clients_count": 50,
      "staff_count": 15,
      "jobs_count": 200,
      "tasks_count": 850,
      "last_client_sync": "2026-02-17T10:05:30Z",
      "last_job_sync": "2026-02-17T10:05:30Z"
    }
  }
}
```

---

### 4. **GET /sync/stats**

Get sync statistics only.

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
    "clients_count": 50,
    "staff_count": 15,
    "jobs_count": 200,
    "tasks_count": 850,
    "last_client_sync": "2026-02-17T10:05:30Z",
    "last_job_sync": "2026-02-17T10:05:30Z"
  }
}
```

---

## Sync Types

### Full Sync (Initial)

**When to use:**
- First-time setup after Xero connection
- After data corruption or issues
- Manual refresh of all data

**What it does:**
1. Syncs all clients from XPM
2. Syncs all staff members
3. Syncs all job categories
4. Syncs all jobs
5. Syncs all tasks for each job

**Sync Order:** (Dependencies matter)
```
Clients → Staff → Categories → Jobs → Tasks
```

---

### Delta Sync (Incremental)

**When to use:**
- Regular scheduled updates
- Keep data fresh without full sync overhead
- Automatic background syncing

**What it does:**
1. Gets last successful sync timestamp
2. Queries XPM for modified records only
3. Updates changed records
4. Falls back to full sync if no previous sync

**Efficiency:**
- Only syncs modified data
- Much faster than full sync
- Recommended interval: 15 minutes

---

## Background Worker

### Worker Setup

**File:** `worker.js`

**Start Worker:**
```bash
# Development (auto-reload)
npm run dev:worker

# Production
npm run worker

# Both API + Worker
npm run dev:all
```

### Worker Features

**Concurrency:** 2 jobs at a time  
**Rate Limit:** 10 jobs/minute  
**Retry Logic:** 3 attempts with exponential backoff  
**Job Retention:**
- Completed: Last 100 jobs
- Failed: Last 50 jobs

---

## BullMQ Queue

### Queue Configuration

**Queue Name:** `xpm-sync`

**Job Options:**
- **Attempts:** 3
- **Backoff:** Exponential (5s, 25s, 125s)
- **Priority:** 
  - Full sync: 1 (high)
  - Delta sync: 2 (medium)

### Queue Stats

```javascript
{
  waiting: 0,
  active: 1,
  completed: 45,
  failed: 2,
  delayed: 0,
  total: 48
}
```

---

## Scheduled Syncing

### Setup Recurring Delta Sync

```javascript
// Schedule delta sync every 15 minutes
await syncQueue.scheduleDeltaSync(userId, tenantId, '*/15 * * * *')
```

**Cron Examples:**
```
*/15 * * * *  - Every 15 minutes
0 * * * *     - Every hour
0 */6 * * *   - Every 6 hours
0 0 * * *     - Daily at midnight
0 2 * * 0     - Weekly (Sunday 2 AM)
```

### Remove Scheduled Sync

```javascript
await syncQueue.removeScheduledSync(tenantId)
```

---

## Sync Service Methods

### fullSync(userId, tenantId)

**Returns:**
```javascript
{
  success: true,
  totalRecords: 350,
  duration: 330000,
  breakdown: {
    clients: 50,
    staff: 15,
    categories: 8,
    jobs: 200,
    tasks: 77
  }
}
```

### deltaSync(userId, tenantId)

**Returns:**
```javascript
{
  success: true,
  totalRecords: 12,
  duration: 5500,
  lastSync: "2026-02-17T09:45:00Z",
  breakdown: {
    clients: 2,
    staff: 0,
    jobs: 8,
    tasks: 2
  }
}
```

---

## Database Schema

### sync_logs Table

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  sync_type VARCHAR(100) CHECK (sync_type IN ('full', 'delta')),
  entity VARCHAR(100) CHECK (entity IN ('clients', 'jobs', 'tasks', 'staff', 'categories', 'all')),
  status VARCHAR(50) CHECK (status IN ('started', 'completed', 'failed')),
  records_synced INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### XPM Data Tables

**xpm_clients:**
- `last_synced_at` - Last sync timestamp
- `xpm_data` - Full XPM API response (JSONB)

**xpm_staff:**
- `last_synced_at` - Last sync timestamp
- `xpm_data` - Full XPM API response (JSONB)

**xpm_jobs:**
- `last_synced_at` - Last sync timestamp
- `xpm_data` - Full XPM API response (JSONB)

**xpm_tasks:**
- `last_synced_at` - Last sync timestamp
- `xpm_data` - Full XPM API response (JSONB)

**xpm_categories:**
- `last_synced_at` - Last sync timestamp
- `xpm_data` - Full XPM API response (JSONB)

---

## Error Handling

### Retry Logic

**Automatic Retries:**
1. First attempt fails → Wait 5 seconds
2. Second attempt fails → Wait 25 seconds
3. Third attempt fails → Job marked as failed

### Failed Job Recovery

```javascript
// Get failed jobs
const failed = await syncQueue.queue.getFailed()

// Retry specific job
await failed[0].retry()

// Retry all failed jobs
for (const job of failed) {
  await job.retry()
}
```

---

## Testing

### 1. Connect to Xero First

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.nextgen.local",
    "password": "Demo123!"
  }'

# Connect to Xero (follow OAuth flow)
curl -X GET http://localhost:3000/integrations/xero/connect \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Trigger Full Sync

```bash
curl -X POST http://localhost:3000/sync/full \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Full sync started",
    "jobId": "full-sync-..."
  }
}
```

### 3. Check Sync Status

```bash
curl -X GET http://localhost:3000/sync/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Trigger Delta Sync

```bash
curl -X POST http://localhost:3000/sync/delta \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Running in Production

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start API
pm2 start server.js --name "nextgen-api"

# Start Worker
pm2 start worker.js --name "nextgen-worker"

# View logs
pm2 logs

# Monitor
pm2 monit

# Save config
pm2 save
pm2 startup
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
  
  worker:
    build: .
    command: npm run worker
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: nextgen
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
  
  redis:
    image: redis:7-alpine
```

---

## Monitoring

### Sync Logs

```sql
-- Recent syncs
SELECT 
  sync_type,
  status,
  records_synced,
  duration_ms,
  started_at,
  completed_at
FROM sync_logs
WHERE tenant_id = $1
ORDER BY started_at DESC
LIMIT 20;

-- Failed syncs
SELECT *
FROM sync_logs
WHERE status = 'failed'
ORDER BY started_at DESC;

-- Sync performance
SELECT 
  sync_type,
  AVG(duration_ms) as avg_duration,
  AVG(records_synced) as avg_records
FROM sync_logs
WHERE status = 'completed'
GROUP BY sync_type;
```

### Worker Health

```javascript
// Check worker is running
const workers = await syncQueue.queue.getWorkers()
console.log(`Active workers: ${workers.length}`)

// Check queue stats
const stats = await syncQueue.getQueueStats()
console.log(stats)
```

---

## Performance Optimization

### Batching

```javascript
// Process in batches of 50
const BATCH_SIZE = 50
for (let i = 0; i < clients.length; i += BATCH_SIZE) {
  const batch = clients.slice(i, i + BATCH_SIZE)
  await Promise.all(batch.map(client => saveClient(client)))
}
```

### Caching

```javascript
// Cache client lookups
const clientCache = new Map()

// Use cache for foreign key lookups
const getClientId = async (xpmClientId) => {
  if (clientCache.has(xpmClientId)) {
    return clientCache.get(xpmClientId)
  }
  const client = await db.query('...')
  clientCache.set(xpmClientId, client.id)
  return client.id
}
```

---

## Future Enhancements

### Real-time Webhooks

```javascript
// TODO: Xero webhook integration
// Listen for XPM events and trigger delta sync
```

### Selective Sync

```javascript
// TODO: Sync specific entities
await syncService.syncClients(userId, tenantId)
await syncService.syncJobs(userId, tenantId)
```

### Conflict Resolution

```javascript
// TODO: Handle bidirectional sync
// Detect and resolve conflicts between XPM and local changes
```

---

**Module 6: Sync Engine Complete!** ✅
