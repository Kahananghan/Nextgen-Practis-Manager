# Jobs Module Documentation

## Overview

Complete job management system with CRUD operations, task management, staff assignment, filtering, search, and pagination.

---

## Endpoints

### 1. **GET /jobs**

Get jobs list with filtering, search, and pagination.

**Access:** Private

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (1-100, default: 20)
- `state` (optional) - Filter by state: `Planned`, `In Progress`, `On Hold`, `Complete`
- `priority` (optional) - Filter by priority: `Low`, `Normal`, `Medium`, `High`
- `clientId` (optional) - Filter by client UUID
- `staffId` (optional) - Filter by assigned staff UUID
- `search` (optional) - Search in job name and job number
- `sortBy` (optional) - Sort column: `due_date`, `created_at`, `name`, `state`, `priority`
- `sortOrder` (optional) - Sort order: `ASC`, `DESC`

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "xpmJobId": "xpm-123",
        "jobNumber": "JOB-001",
        "name": "2024 Tax Return - ABC Corp",
        "description": "Annual tax return preparation",
        "jobType": "Tax Return",
        "category": "Compliance",
        "state": "In Progress",
        "priority": "High",
        "startDate": "2026-01-15",
        "dueDate": "2026-03-31",
        "budget": 5000.00,
        "progress": 45,
        "client": {
          "id": "uuid",
          "name": "ABC Corporation"
        },
        "assignedStaff": {
          "id": "uuid",
          "name": "John Doe"
        },
        "manager": {
          "id": "uuid",
          "name": "Jane Smith"
        },
        "taskCount": 10,
        "completedTaskCount": 4,
        "createdAt": "2026-01-15T10:00:00Z",
        "updatedAt": "2026-02-17T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 150,
      "totalPages": 8
    }
  }
}
```

---

### 2. **GET /jobs/:id**

Get single job with all details and tasks.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "xpmJobId": "xpm-123",
    "jobNumber": "JOB-001",
    "name": "2024 Tax Return - ABC Corp",
    "description": "Annual tax return preparation",
    "jobType": "Tax Return",
    "category": "Compliance",
    "state": "In Progress",
    "priority": "High",
    "startDate": "2026-01-15",
    "dueDate": "2026-03-31",
    "budget": 5000.00,
    "progress": 45,
    "client": {
      "id": "uuid",
      "name": "ABC Corporation",
      "email": "contact@abc.com"
    },
    "assignedStaff": {
      "id": "uuid",
      "name": "John Doe"
    },
    "manager": {
      "id": "uuid",
      "name": "Jane Smith"
    },
    "tasks": [
      {
        "id": "uuid",
        "xpmTaskId": "task-1",
        "name": "Gather financial statements",
        "description": "Collect all required documents",
        "isCompleted": true,
        "completedAt": "2026-02-10T15:00:00Z",
        "sortOrder": 1
      },
      {
        "id": "uuid",
        "xpmTaskId": "task-2",
        "name": "Prepare draft return",
        "description": null,
        "isCompleted": false,
        "completedAt": null,
        "sortOrder": 2
      }
    ],
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-02-17T14:30:00Z",
    "lastSyncedAt": "2026-02-17T10:00:00Z"
  }
}
```

---

### 3. **POST /jobs**

Create new job.

**Access:** Private (enforces jobs_per_month limit)

**Request:**
```json
{
  "name": "2024 Tax Return - XYZ Ltd",
  "description": "Annual tax return",
  "clientId": "uuid",
  "jobType": "Tax Return",
  "category": "Compliance",
  "state": "Planned",
  "priority": "High",
  "startDate": "2026-02-20",
  "dueDate": "2026-04-15",
  "budget": 3500.00,
  "assignedStaffId": "uuid",
  "managerId": "uuid"
}
```

**Validation:**
- `name` - Required, max 255 chars
- `clientId` - Required, must be valid UUID
- `state` - Optional: `Planned`, `In Progress`, `On Hold`, `Complete` (default: `Planned`)
- `priority` - Optional: `Low`, `Normal`, `Medium`, `High` (default: `Normal`)
- `dueDate` - Must be after `startDate` if both provided

**Response:**
```json
{
  "success": true,
  "data": { ...job object... },
  "message": "Job created successfully"
}
```

---

### 4. **PUT /jobs/:id**

Update job details.

**Access:** Private

**Request:**
```json
{
  "name": "Updated Job Name",
  "state": "In Progress",
  "priority": "Medium",
  "dueDate": "2026-04-30",
  "assignedStaffId": "uuid"
}
```

**Validation:**
- At least one field required
- Only allowed fields accepted

**Response:**
```json
{
  "success": true,
  "data": { ...updated job... },
  "message": "Job updated successfully"
}
```

---

### 5. **DELETE /jobs/:id**

Delete job and all its tasks.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

**Note:** Cascades to delete all associated tasks

---

### 6. **PUT /jobs/:id/assign**

Assign job to staff member.

**Access:** Private

**Request:**
```json
{
  "staffId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...updated job... },
  "message": "Job assigned successfully"
}
```

---

### 7. **GET /jobs/:id/tasks**

Get all tasks for a job.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "xpmTaskId": "task-1",
        "name": "Task 1",
        "description": "Description",
        "isCompleted": true,
        "completedAt": "2026-02-17T10:00:00Z",
        "sortOrder": 1,
        "createdAt": "2026-02-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 8. **POST /jobs/:id/tasks**

Add task to job.

**Access:** Private

**Request:**
```json
{
  "name": "Review documentation",
  "description": "Review all client documents for accuracy",
  "sortOrder": 3
}
```

**Validation:**
- `name` - Required, max 255 chars
- `sortOrder` - Optional, integer >= 0 (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Review documentation",
    "description": "Review all client documents for accuracy",
    "isCompleted": false,
    "sortOrder": 3
  },
  "message": "Task added successfully"
}
```

**Note:** Automatically recalculates job progress

---

### 9. **PUT /jobs/:id/tasks/:taskId**

Update task details.

**Access:** Private

**Request:**
```json
{
  "name": "Updated task name",
  "description": "Updated description",
  "sortOrder": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...updated task... },
  "message": "Task updated successfully"
}
```

---

### 10. **PUT /jobs/:id/tasks/:taskId/complete**

Toggle task completion status.

**Access:** Private

**Request:**
```json
{
  "isCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "data": { ...updated task... },
  "message": "Task marked as completed"
}
```

**Note:** 
- Automatically sets/clears `completedAt` timestamp
- Recalculates job progress

---

### 11. **DELETE /jobs/:id/tasks/:taskId**

Delete task from job.

**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**Note:** Automatically recalculates job progress

---

## Features

### Filtering & Search
- Filter by state, priority, client, assigned staff
- Full-text search in job name and job number
- Combine multiple filters

### Pagination
- Configurable page size (1-100)
- Total count and page count returned
- Efficient offset-based pagination

### Sorting
- Sort by: due date, created date, name, state, priority
- Ascending or descending order

### Progress Tracking
- Auto-calculated based on task completion
- Formula: `(completed tasks / total tasks) * 100`
- Updates automatically when tasks change

### Task Management
- Add/update/delete tasks within jobs
- Reorder tasks with sort order
- Mark tasks complete/incomplete
- Track completion timestamps

### Assignment
- Assign jobs to staff members
- Track job manager
- Filter jobs by assigned staff

### Subscription Limits
- Enforces `jobs_per_month` limit on creation
- Uses plan-guard middleware
- Returns 402 error if limit exceeded

---

## Testing

### Create Job
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "2024 Tax Return - Test Client",
    "clientId": "client-uuid",
    "state": "Planned",
    "priority": "High",
    "dueDate": "2026-04-15"
  }'
```

### Get Jobs (Filtered)
```bash
# Get all in-progress jobs
curl -X GET "http://localhost:3000/jobs?state=In%20Progress&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search jobs
curl -X GET "http://localhost:3000/jobs?search=tax" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get jobs for specific client
curl -X GET "http://localhost:3000/jobs?clientId=uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Job
```bash
curl -X PUT http://localhost:3000/jobs/JOB_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "In Progress",
    "priority": "High"
  }'
```

### Add Task
```bash
curl -X POST http://localhost:3000/jobs/JOB_UUID/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gather financial statements",
    "sortOrder": 1
  }'
```

### Complete Task
```bash
curl -X PUT http://localhost:3000/jobs/JOB_UUID/tasks/TASK_UUID/complete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isCompleted": true
  }'
```

---

## Database Schema

### xpm_jobs Table

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Multi-tenant isolation
- `xpm_job_id` - External XPM ID or `local-{timestamp}`
- `xpm_job_number` - Display job number
- `name` - Job name
- `description` - Job description
- `client_id` - Foreign key to xpm_clients
- `job_type` - Type of job
- `category` - Job category
- `state` - Current state (enum)
- `priority` - Priority level (enum)
- `start_date` - Start date
- `due_date` - Due date
- `budget` - Budget amount
- `assigned_staff_id` - Assigned staff member
- `manager_id` - Job manager
- `progress` - Completion percentage (0-100)
- `xpm_data` - Full XPM payload (JSONB)
- `last_synced_at` - Last sync timestamp

**Indexes:**
- `idx_xpm_jobs_tenant_state`
- `idx_xpm_jobs_overdue`
- `idx_xpm_jobs_due_date`
- `idx_xpm_jobs_client`
- `idx_xpm_jobs_staff`

### xpm_tasks Table

**Columns:**
- `id` - UUID primary key
- `tenant_id` - Multi-tenant isolation
- `job_id` - Foreign key to xpm_jobs (CASCADE DELETE)
- `xpm_task_id` - External XPM ID or `local-{timestamp}`
- `name` - Task name
- `description` - Task description
- `is_completed` - Completion status
- `completed_at` - Completion timestamp
- `sort_order` - Display order

**Indexes:**
- `idx_xpm_tasks_job`
- `idx_xpm_tasks_completed`

---

## Frontend Integration

### React Example

```javascript
import { useState, useEffect } from 'react'

function JobsList() {
  const [jobs, setJobs] = useState([])
  const [filters, setFilters] = useState({
    state: '',
    priority: '',
    search: '',
    page: 1
  })

  useEffect(() => {
    fetchJobs()
  }, [filters])

  const fetchJobs = async () => {
    const params = new URLSearchParams(filters)
    const res = await fetch(`/jobs?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    setJobs(data.data.jobs)
  }

  const createJob = async (jobData) => {
    const res = await fetch('/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jobData)
    })
    const data = await res.json()
    if (data.success) {
      fetchJobs() // Refresh list
    }
  }

  const toggleTask = async (jobId, taskId, isCompleted) => {
    await fetch(`/jobs/${jobId}/tasks/${taskId}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isCompleted })
    })
    // Refresh job details
  }

  return (
    <div>
      {/* Filters */}
      <select onChange={(e) => setFilters({...filters, state: e.target.value})}>
        <option value="">All States</option>
        <option value="Planned">Planned</option>
        <option value="In Progress">In Progress</option>
        <option value="Complete">Complete</option>
      </select>

      {/* Jobs List */}
      {jobs.map(job => (
        <div key={job.id}>
          <h3>{job.name}</h3>
          <p>Progress: {job.progress}%</p>
          <p>Tasks: {job.completedTaskCount}/{job.taskCount}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Performance

### Query Optimization
- Indexed filters (state, priority, client, staff)
- Efficient JOIN operations
- Limited result sets with pagination
- COUNT query optimized separately

### Caching Recommendations
- Cache job lists: 2 minutes
- Cache single job: 5 minutes
- Real-time: Task completion (no cache)

---

## Error Responses

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "name": "NotFoundError",
    "message": "Job not found",
    "statusCode": 404
  }
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "name": "ValidationError",
    "message": "Job name is required",
    "statusCode": 400
  }
}
```

### Limit Exceeded (402)
```json
{
  "success": false,
  "error": {
    "name": "SubscriptionError",
    "message": "Monthly job limit exceeded. Upgrade your plan.",
    "statusCode": 402
  }
}
```

---

**Module 8: Jobs Complete!** ✅
