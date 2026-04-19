# Module 16: Advanced Analytics - Documentation

## Overview

SQL-based advanced analytics providing trend analysis, statistical insights, performance metrics, anomaly detection, and multi-dimensional analysis.

---

## Endpoints (6)

### 1. **GET /analytics/trends**

Get trend analysis with moving averages and growth rates.

**Query Parameters:**
- `months` (optional) - Number of months to analyze (1-24, default: 6)
- `metric` (optional) - Metric to analyze: revenue, jobs, completion (default: revenue)

**Response:**
```json
{
  "success": true,
  "data": {
    "completionTrend": [
      {
        "date": "2026-02-18",
        "completed": 5,
        "ma_7day": 4.2,
        "ma_30day": 4.8
      }
    ],
    "monthlyGrowth": [
      {
        "month": "2026-02",
        "jobs_created": 45,
        "jobs_completed": 38,
        "revenue": 52000,
        "prev_jobs": 42,
        "prev_revenue": 48000,
        "job_growth_rate": 7.14,
        "revenue_growth_rate": 8.33
      }
    ],
    "period": "6 months"
  }
}
```

**Use Cases:**
- Identify growth trends
- Spot seasonal patterns
- Forecast future performance

---

### 2. **GET /analytics/statistics**

Get statistical analysis including mean, median, standard deviation, and percentiles.

**Response:**
```json
{
  "success": true,
  "data": {
    "jobDuration": {
      "avg_duration": 14.5,
      "std_dev": 8.2,
      "min_duration": 2.0,
      "max_duration": 45.0,
      "percentile_25": 8.0,
      "median": 12.0,
      "percentile_75": 18.0,
      "percentile_90": 28.0,
      "sample_size": 230
    },
    "staffProductivity": {
      "avg_jobs_per_staff": 15.2,
      "std_dev_jobs": 5.8,
      "min_jobs": 5,
      "max_jobs": 32,
      "avg_duration_across_staff": 14.8,
      "active_staff_count": 12
    },
    "budget": {
      "avg_budget": 3500.00,
      "std_dev_budget": 1200.00,
      "min_budget": 500.00,
      "max_budget": 12000.00,
      "median_budget": 3000.00,
      "jobs_with_budget": 145
    }
  }
}
```

**Use Cases:**
- Understand data distribution
- Identify outliers
- Set realistic benchmarks
- Compare performance against median/percentiles

---

### 3. **GET /analytics/comparison**

Compare current period vs previous period.

**Query Parameters:**
- `type` (optional) - Comparison type: month, quarter, year (default: month)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "month",
    "comparison": {
      "current_jobs_created": 45,
      "previous_jobs_created": 42,
      "jobs_change_pct": 7.14,
      "current_jobs_completed": 38,
      "previous_jobs_completed": 35,
      "completion_change_pct": 8.57,
      "current_budget": 52000,
      "previous_budget": 48000,
      "budget_change_pct": 8.33,
      "current_avg_duration": 14.2,
      "previous_avg_duration": 15.1
    }
  }
}
```

**Use Cases:**
- Month-over-month growth tracking
- Quarter-over-quarter performance
- Year-over-year comparisons
- Identify improvement or decline

---

### 4. **GET /analytics/performance**

Get performance metrics for efficiency, utilization, and engagement.

**Response:**
```json
{
  "success": true,
  "data": {
    "efficiency": {
      "total_jobs": 200,
      "completed_jobs": 142,
      "completion_rate": 71.00,
      "overdue_jobs": 12,
      "overdue_rate": 20.69,
      "on_time_completions": 128,
      "on_time_rate": 90.14
    },
    "staffUtilization": {
      "total_staff": 15,
      "staff_with_jobs": 12,
      "active_jobs": 58,
      "active_staff": 14,
      "utilization_rate": 85.71,
      "avg_jobs_per_staff": 4.14
    },
    "clientEngagement": {
      "total_clients": 48,
      "clients_with_jobs": 42,
      "total_jobs": 200,
      "total_revenue": 450000,
      "engagement_rate": 87.50,
      "avg_jobs_per_client": 4.76,
      "avg_revenue_per_client": 10714.29
    }
  }
}
```

**Use Cases:**
- Monitor operational efficiency
- Track staff capacity
- Measure client engagement
- Identify underutilized resources

---

### 5. **GET /analytics/anomalies**

Detect anomalies and unusual patterns.

**Response:**
```json
{
  "success": true,
  "data": {
    "anomalies": [
      {
        "type": "slow_jobs",
        "severity": "high",
        "count": 3,
        "message": "3 jobs taking 2x longer than average",
        "jobs": [
          {
            "id": "uuid",
            "name": "Complex Tax Return",
            "xpm_job_number": "JOB-001",
            "current_duration": 42.5,
            "avg_days": 14.2
          }
        ]
      },
      {
        "type": "high_overdue_staff",
        "severity": "medium",
        "count": 2,
        "message": "2 staff members with >30% overdue rate",
        "staff": [
          {
            "id": "uuid",
            "name": "John Doe",
            "total_jobs": 15,
            "overdue_jobs": 6,
            "overdue_rate": 40.00
          }
        ]
      },
      {
        "type": "job_creation_spike",
        "severity": "low",
        "message": "Job creation increased by 65.5% this week",
        "data": {
          "recent_count": 28,
          "previous_count": 17,
          "change_pct": 64.71
        }
      }
    ],
    "count": 3
  }
}
```

**Anomaly Types:**
- **slow_jobs** - Jobs taking 2x longer than average
- **high_overdue_staff** - Staff with >30% overdue rate
- **job_creation_spike** - >50% increase in job creation

**Use Cases:**
- Early warning system
- Identify struggling jobs/staff
- Spot unusual activity
- Proactive problem solving

---

### 6. **GET /analytics/multi-dimensional**

Get multi-dimensional analysis (cross-tabulations).

**Response:**
```json
{
  "success": true,
  "data": {
    "byClientState": [
      {
        "client_name": "ABC Corp",
        "state": "Complete",
        "job_count": 15,
        "total_budget": 45000
      },
      {
        "client_name": "ABC Corp",
        "state": "In Progress",
        "job_count": 3,
        "total_budget": 12000
      }
    ],
    "byPriorityCategory": [
      {
        "priority": "High",
        "category": "Tax",
        "job_count": 25,
        "avg_duration": 12.5
      }
    ],
    "byStaffJobType": [
      {
        "staff_name": "Jane Smith",
        "job_type": "Tax Return",
        "jobs_handled": 18,
        "avg_completion_days": 14.2
      }
    ]
  }
}
```

**Use Cases:**
- Understand job distribution patterns
- Identify best staff for job types
- Analyze client behavior by state
- Priority-based performance analysis

---

## Features

### Trend Analysis
✅ **Moving Averages** - 7-day and 30-day smoothing  
✅ **Growth Rates** - Month-over-month percentage change  
✅ **Time Series** - Daily/monthly data points  
✅ **Forecasting Base** - Historical data for predictions  

### Statistical Analysis
✅ **Central Tendency** - Mean, median  
✅ **Dispersion** - Standard deviation, range  
✅ **Distribution** - Percentiles (25th, 50th, 75th, 90th)  
✅ **Sample Size** - Count for statistical significance  

### Period Comparison
✅ **Flexible Periods** - Month, quarter, year  
✅ **Percentage Change** - Automatic calculation  
✅ **Multiple Metrics** - Jobs, revenue, duration  
✅ **Trend Direction** - Growth or decline  

### Performance Metrics
✅ **Efficiency** - Completion rate, on-time rate  
✅ **Utilization** - Staff capacity usage  
✅ **Engagement** - Client activity rate  
✅ **KPIs** - Key performance indicators  

### Anomaly Detection
✅ **Threshold-Based** - Statistical outlier detection  
✅ **Severity Levels** - High, medium, low  
✅ **Actionable Alerts** - Specific jobs/staff identified  
✅ **Pattern Recognition** - Spikes, drops, unusual behavior  

### Multi-Dimensional Analysis
✅ **Cross-Tabulations** - Two-way breakdowns  
✅ **Drill-Down** - Detailed segmentation  
✅ **Comparative Analysis** - Multiple dimensions  
✅ **Pattern Discovery** - Hidden insights  

---

## Use Cases

### Strategic Planning
1. **Revenue Forecasting** - Use growth trends to predict future revenue
2. **Capacity Planning** - Utilization metrics show staffing needs
3. **Client Segmentation** - Multi-dimensional analysis identifies high-value clients

### Operational Improvement
1. **Bottleneck Identification** - Anomalies show where delays occur
2. **Process Optimization** - Statistical analysis reveals inefficiencies
3. **Resource Allocation** - Performance metrics guide assignments

### Risk Management
1. **Early Warning** - Anomaly detection catches problems early
2. **Trend Monitoring** - Growth rate changes signal issues
3. **Quality Control** - On-time rate tracks delivery quality

---

## Testing

```bash
# Trend analysis (6 months)
curl -X GET "http://localhost:3000/analytics/trends?months=6" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Statistical analysis
curl -X GET http://localhost:3000/analytics/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Month-over-month comparison
curl -X GET "http://localhost:3000/analytics/comparison?type=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Performance metrics
curl -X GET http://localhost:3000/analytics/performance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Detect anomalies
curl -X GET http://localhost:3000/analytics/anomalies \
  -H "Authorization: Bearer YOUR_TOKEN"

# Multi-dimensional analysis
curl -X GET http://localhost:3000/analytics/multi-dimensional \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Frontend Integration

### React Example

```javascript
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

function AnalyticsDashboard() {
  const [trends, setTrends] = useState(null)
  const [anomalies, setAnomalies] = useState([])

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    // Trends
    const trendsRes = await fetch('/analytics/trends?months=6', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const trendsData = await trendsRes.json()
    setTrends(trendsData.data)

    // Anomalies
    const anomaliesRes = await fetch('/analytics/anomalies', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const anomaliesData = await anomaliesRes.json()
    setAnomalies(anomaliesData.data.anomalies)
  }

  return (
    <div>
      {/* Trend Chart */}
      {trends && (
        <LineChart width={600} height={300} data={trends.completionTrend}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="completed" stroke="#8884d8" />
          <Line type="monotone" dataKey="ma_7day" stroke="#82ca9d" />
        </LineChart>
      )}

      {/* Anomalies Alert */}
      {anomalies.map(anomaly => (
        <div key={anomaly.type} className={`alert-${anomaly.severity}`}>
          <strong>{anomaly.message}</strong>
          {/* Show details */}
        </div>
      ))}
    </div>
  )
}
```

---

## Performance

### Query Optimization
✅ **Indexed Columns** - All queries use indexed fields  
✅ **CTEs** - Common Table Expressions for readability  
✅ **Window Functions** - Efficient moving averages  
✅ **Aggregate Functions** - Database-level calculations  

### Caching Recommendations
- **Trends:** Cache for 15 minutes
- **Statistics:** Cache for 30 minutes
- **Comparisons:** Cache for 1 hour
- **Anomalies:** No cache (real-time)
- **Multi-dimensional:** Cache for 30 minutes

---

## Limitations

### What This Module Does NOT Include:
❌ Machine learning predictions  
❌ AI-based forecasting  
❌ Complex neural networks  
❌ Automated recommendations  

### Why:
- These require Python + ML libraries
- Training datasets needed
- Not realistic in Node.js

### What You Get Instead:
✅ **Statistical forecasting** - Trend-based projections  
✅ **Threshold detection** - SQL-based anomalies  
✅ **Historical analysis** - Pattern recognition  
✅ **Data-driven insights** - Actionable analytics  

---

**Module 16: Advanced Analytics Complete!** ✅
