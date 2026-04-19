# Dashboard Module Documentation

## Overview

Complete dashboard analytics and statistics service providing comprehensive insights into jobs, clients, staff, and performance metrics.

---

## Endpoints

### 1. **GET /dashboard/overview**

Get high-level dashboard overview statistics.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": {
      "total": 200,
      "active": 85,
      "completed": 100,
      "overdue": 12,
      "completionRate": 50
    },
    "clients": {
      "active": 50
    },
    "staff": {
      "active": 15
    },
    "tasks": {
      "total": 850,
      "completed": 425,
      "completionRate": 50
    }
  }
}
```

---

### 2. **GET /dashboard/jobs-by-state**

Get job distribution by state (Planned, In Progress, On Hold, Complete).

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": [
    { "state": "In Progress", "count": 85 },
    { "state": "Planned", "count": 45 },
    { "state": "On Hold", "count": 15 },
    { "state": "Complete", "count": 100 }
  ]
}
```

**Use Case:** Pie/donut chart for job state distribution

---

### 3. **GET /dashboard/jobs-by-priority**

Get active job distribution by priority.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": [
    { "priority": "High", "count": 25 },
    { "priority": "Medium", "count": 40 },
    { "priority": "Normal", "count": 60 },
    { "priority": "Low", "count": 20 }
  ]
}
```

**Use Case:** Bar chart for priority breakdown

---

### 4. **GET /dashboard/upcoming-jobs**

Get jobs due in next 7 days (max 10 results).

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "name": "2024 Tax Return - ABC Corp",
        "jobNumber": "JOB-001",
        "dueDate": "2026-02-20",
        "state": "In Progress",
        "priority": "High",
        "clientName": "ABC Corporation",
        "assignedStaff": "John Doe"
      }
    ]
  }
}
```

**Use Case:** Upcoming deadlines list

---

### 5. **GET /dashboard/overdue-jobs**

Get overdue jobs (max 10 results).

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "name": "Annual Audit - XYZ Ltd",
        "jobNumber": "JOB-002",
        "dueDate": "2026-02-10",
        "state": "In Progress",
        "priority": "High",
        "clientName": "XYZ Limited",
        "assignedStaff": "Jane Smith",
        "daysOverdue": 7
      }
    ]
  }
}
```

**Use Case:** Overdue jobs alert list

---

### 6. **GET /dashboard/staff-workload**

Get staff workload distribution.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": "uuid",
        "name": "John Doe",
        "activeJobs": 12,
        "totalAssigned": 18,
        "overdueJobs": 2
      },
      {
        "id": "uuid",
        "name": "Jane Smith",
        "activeJobs": 10,
        "totalAssigned": 15,
        "overdueJobs": 1
      }
    ]
  }
}
```

**Use Case:** Staff workload bar chart, capacity planning

---

### 7. **GET /dashboard/recent-activity**

Get recent activity log.

**Access:** Private

**Query Parameters:**
- `limit` (optional) - Number of activities (1-100, default 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "type": "job_created",
        "title": "Q1 Financial Report",
        "timestamp": "2026-02-17T10:30:00Z",
        "relatedEntity": "ABC Corporation"
      }
    ]
  }
}
```

**Use Case:** Activity feed/timeline

---

### 8. **GET /dashboard/charts**

Get chart data for trends (last 30 days).

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "completionTrend": [
      { "date": "2026-01-18", "completed": 5 },
      { "date": "2026-01-19", "completed": 3 },
      { "date": "2026-01-20", "completed": 8 }
    ],
    "creationTrend": [
      { "date": "2026-01-18", "created": 7 },
      { "date": "2026-01-19", "created": 4 },
      { "date": "2026-01-20", "created": 6 }
    ]
  }
}
```

**Use Case:** Line charts for job completion/creation trends

---

### 9. **GET /dashboard/top-clients**

Get top 10 clients by job count.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "name": "ABC Corporation",
        "totalJobs": 25,
        "activeJobs": 10,
        "completedJobs": 15
      }
    ]
  }
}
```

**Use Case:** Top clients table/chart

---

### 10. **GET /dashboard/kpis**

Get Key Performance Indicators (last 90 days).

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "completionRate": 65.5,
    "onTimeRate": 85.2,
    "avgDurationDays": 12.3,
    "jobsPerStaff": 5.7
  }
}
```

**Metrics:**
- `completionRate` - % of jobs completed vs total
- `onTimeRate` - % of jobs completed on/before due date
- `avgDurationDays` - Average days from creation to completion
- `jobsPerStaff` - Active jobs per active staff member

**Use Case:** KPI cards, performance dashboard

---

## Dashboard Widgets

### Recommended Dashboard Layout

**Row 1: KPI Cards**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Jobs  │  Completion │  On-Time    │   Jobs/     │
│    200      │    Rate     │    Rate     │   Staff     │
│             │    65.5%    │    85.2%    │    5.7      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Row 2: Charts**
```
┌────────────────────────────┬────────────────────────────┐
│   Jobs by State (Pie)      │  Jobs by Priority (Bar)    │
│                            │                            │
│  ◉ In Progress: 85         │  ████ High: 25             │
│  ◉ Planned: 45             │  ████ Medium: 40           │
│  ◉ Complete: 100           │  ████ Normal: 60           │
│                            │  ████ Low: 20              │
└────────────────────────────┴────────────────────────────┘
```

**Row 3: Trends**
```
┌──────────────────────────────────────────────────────────┐
│  Job Completion Trend (Last 30 Days) - Line Chart        │
│                                                           │
│  Completed: ──────/\────────/\──                         │
│  Created:   ─────/──\──────/──\──                        │
└──────────────────────────────────────────────────────────┘
```

**Row 4: Lists**
```
┌────────────────────────────┬────────────────────────────┐
│  Upcoming Jobs (7 days)    │  Overdue Jobs              │
│                            │                            │
│  • ABC Corp - Due Feb 20   │  ⚠ XYZ Ltd - 7 days late  │
│  • DEF Inc - Due Feb 22    │  ⚠ GHI Co - 3 days late   │
│  • JKL LLC - Due Feb 24    │                            │
└────────────────────────────┴────────────────────────────┘
```

**Row 5: Staff & Clients**
```
┌────────────────────────────┬────────────────────────────┐
│  Staff Workload            │  Top Clients               │
│                            │                            │
│  John Doe: 12 active jobs  │  ABC Corp: 25 jobs         │
│  Jane Smith: 10 jobs       │  XYZ Ltd: 18 jobs          │
│  Bob Wilson: 8 jobs        │  DEF Inc: 15 jobs          │
└────────────────────────────┴────────────────────────────┘
```

---

## Testing

### Get Overview

```bash
curl -X GET http://localhost:3000/dashboard/overview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Charts Data

```bash
curl -X GET http://localhost:3000/dashboard/charts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get KPIs

```bash
curl -X GET http://localhost:3000/dashboard/kpis \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Frontend Integration

### React Example

```javascript
// Dashboard Component
import { useEffect, useState } from 'react'

function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [kpis, setKPIs] = useState(null)
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('accessToken')
    
    // Fetch all dashboard data in parallel
    const [overviewRes, kpisRes, chartsRes] = await Promise.all([
      fetch('/dashboard/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/dashboard/kpis', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('/dashboard/charts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ])

    setOverview(await overviewRes.json())
    setKPIs(await kpisRes.json())
    setCharts(await chartsRes.json())
  }

  return (
    <div className="dashboard">
      {/* KPI Cards */}
      <div className="kpi-cards">
        <KPICard title="Total Jobs" value={overview?.data.jobs.total} />
        <KPICard title="Completion Rate" value={`${kpis?.data.completionRate}%`} />
        <KPICard title="On-Time Rate" value={`${kpis?.data.onTimeRate}%`} />
        <KPICard title="Jobs/Staff" value={kpis?.data.jobsPerStaff} />
      </div>

      {/* Charts */}
      <div className="charts">
        <PieChart data={jobsByState} />
        <LineChart data={charts?.data.completionTrend} />
      </div>

      {/* Lists */}
      <div className="lists">
        <UpcomingJobsList />
        <OverdueJobsList />
      </div>
    </div>
  )
}
```

---

## Performance

### Query Optimization

All dashboard queries are optimized with:
- **Indexed columns** - All WHERE/JOIN columns have indexes
- **Filtered aggregations** - Using `COUNT(*) FILTER (WHERE ...)`
- **Limited results** - Top 10 for lists
- **Date ranges** - 30/90 day windows for trends

### Caching Strategy

**Recommended:**
- Cache overview data: 5 minutes
- Cache charts data: 10 minutes
- Cache KPIs: 15 minutes
- Real-time: Upcoming/overdue jobs

```javascript
// Example: Redis caching
const cacheKey = `dashboard:overview:${tenantId}`
let overview = await redis.get(cacheKey)

if (!overview) {
  overview = await dashboardService.getOverview(tenantId)
  await redis.set(cacheKey, overview, 300) // 5 min TTL
}
```

---

## Database Schema Usage

### Tables Queried

**Primary:**
- `xpm_jobs` - Job statistics, states, priorities
- `xpm_clients` - Client counts, top clients
- `xpm_staff` - Staff workload
- `xpm_tasks` - Task completion rates

**Indexes Used:**
- `idx_xpm_jobs_tenant_state`
- `idx_xpm_jobs_overdue`
- `idx_xpm_jobs_due_date`
- `idx_xpm_tasks_completed`

---

## Future Enhancements

### Real-time Updates

```javascript
// TODO: WebSocket for real-time dashboard
io.on('connection', (socket) => {
  socket.on('subscribe:dashboard', (tenantId) => {
    socket.join(`dashboard:${tenantId}`)
  })
})

// Emit updates on job changes
io.to(`dashboard:${tenantId}`).emit('dashboard:update', { ... })
```

### Custom Dashboards

```javascript
// TODO: User-configurable widgets
POST /dashboard/widgets
GET /dashboard/widgets/:id
```

### Export Reports

```javascript
// TODO: Export dashboard as PDF
GET /dashboard/export?format=pdf
```

---

**Module 7: Dashboard Complete!** ✅
