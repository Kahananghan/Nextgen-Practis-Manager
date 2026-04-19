import React, { useState } from 'react';
 
interface WIPItem {
  client: string;
  job: string;
  staff: {
    initials: string;
    name: string;
    color: string;
  };
  hours: number;
  unbilledValue: number;
  status: 'In Progress' | 'Over budget' | 'Completed' | 'Overdue';
  statusColor: string;
  actionText: string;
  actionColor: string;
}
 
interface BudgetItem {
  job: string;
  budget: number;
  actual: number;
  progress: number;
  progressColor: string;
  variance: number;
  varianceColor: string;
  isOverBudget?: boolean;
}
 
interface StaffItem {
  staff: {
    initials: string;
    name: string;
    color: string;
  };
  billable: number;
  nonBillable: number;
  total: number;
  utilization: number;
  utilizationColor: string;
  revenue: number;
  revenueColor: string;
}
 
const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'wip' | 'budget' | 'staff'>('wip');
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('week');
  const [showCustomRange, setShowCustomRange] = useState(false);
 
  const wipData: WIPItem[] = [
    {
      client: 'Big Kahuna Burger Ltd.',
      job: 'Monthly Bookkeeping',
      staff: { initials: 'AJ', name: 'Alice Johnson', color: '#fef3c7' },
      hours: 6.5,
      unbilledValue: 915.00,
      status: 'In Progress',
      statusColor: '#fef3c7',
      actionText: 'Invoice',
      actionColor: '#6366f1'
    },
    {
      client: 'Sanford Group',
      job: 'Quarterly Tax Filing',
      staff: { initials: 'DS', name: 'Darrell Steward', color: '#fce7f3' },
      hours: 9.0,
      unbilledValue: 1350.00,
      status: 'Over budget',
      statusColor: '#fee2e2',
      actionText: 'Invoice',
      actionColor: '#6366f1'
    },
    {
      client: 'Abernathy Ltd',
      job: 'Annual Audit',
      staff: { initials: 'EJ', name: 'Emma Johnson', color: '#e0f2fe' },
      hours: 14.0,
      unbilledValue: 1680.00,
      status: 'Completed',
      statusColor: '#dcfce7',
      actionText: 'Invoice now',
      actionColor: '#16a34a'
    },
    {
      client: 'Conn Group',
      job: 'Payroll Processing',
      staff: { initials: 'AJ', name: 'Alice Johnson', color: '#fef3c7' },
      hours: 4.5,
      unbilledValue: 675.00,
      status: 'Overdue',
      statusColor: '#fee2e2',
      actionText: 'Invoice now',
      actionColor: '#dc2626'
    },
    {
      client: 'Kemmer-Effertz',
      job: 'Monthly Tax Filing',
      staff: { initials: 'SL', name: 'Sarah Lee', color: '#fce7f3' },
      hours: 8.0,
      unbilledValue: 960.00,
      status: 'In Progress',
      statusColor: '#fef3c7',
      actionText: 'Invoice',
      actionColor: '#6366f1'
    }
  ];
 
  const budgetData: BudgetItem[] = [
    {
      job: 'Monthly Bookkeeping — BKB',
      budget: 10,
      actual: 6.5,
      progress: 65,
      progressColor: '#16a34a',
      variance: 3.5,
      varianceColor: '#16a34a'
    },
    {
      job: 'Quarterly Tax Filing — Sanford',
      budget: 8,
      actual: 9.0,
      progress: 113,
      progressColor: '#dc2626',
      variance: -1.0,
      varianceColor: '#dc2626',
      isOverBudget: true
    },
    {
      job: 'Annual Audit — Abernathy',
      budget: 16,
      actual: 14.0,
      progress: 87,
      progressColor: '#16a34a',
      variance: 2.0,
      varianceColor: '#16a34a'
    },
    {
      job: 'Payroll Processing — Conn Group',
      budget: 4,
      actual: 4.5,
      progress: 113,
      progressColor: '#dc2626',
      variance: -0.5,
      varianceColor: '#dc2626',
      isOverBudget: true
    }
  ];
 
  const staffData: StaffItem[] = [
    {
      staff: { initials: 'AJ', name: 'Alice Johnson', color: '#fef3c7' },
      billable: 28,
      nonBillable: 4,
      total: 32,
      utilization: 87,
      utilizationColor: '#16a34a',
      revenue: 4200,
      revenueColor: '#0f1f3d'
    },
    {
      staff: { initials: 'EJ', name: 'Emma Johnson', color: '#e0f2fe' },
      billable: 22,
      nonBillable: 6,
      total: 28,
      utilization: 78,
      utilizationColor: '#6366f1',
      revenue: 2640,
      revenueColor: '#0f1f3d'
    },
    {
      staff: { initials: 'DS', name: 'Darrell Steward', color: '#fce7f3' },
      billable: 10,
      nonBillable: 8,
      total: 18,
      utilization: 55,
      utilizationColor: '#dc2626',
      revenue: 1500,
      revenueColor: '#dc2626'
    },
    {
      staff: { initials: 'SL', name: 'Sarah Lee', color: '#fce7f3' },
      billable: 24,
      nonBillable: 4,
      total: 28,
      utilization: 85,
      utilizationColor: '#16a34a',
      revenue: 2880,
      revenueColor: '#0f1f3d'
    }
  ];
 
  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'custom') => {
    setPeriod(newPeriod);
    setShowCustomRange(newPeriod === 'custom');
  };
 
  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'In Progress': return '#92400e';
      case 'Over budget': return '#991b1b';
      case 'Completed': return '#166534';
      case 'Overdue': return '#991b1b';
      default: return '#555';
    }
  };
 
  return (
    <div style={{ padding: '24px', overflowY: 'auto' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f1f3d', margin: '0 0 2px' }}>WIP Report</h2>
          <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Work in progress — unbilled time and job profitability</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Period filter */}
          <div style={{ display: 'flex', gap: 0, border: '1px solid #c7d2fe', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => handlePeriodChange('week')}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: period === 'week' ? '#6366f1' : '#fff',
                color: period === 'week' ? '#fff' : '#555',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              This week
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: period === 'month' ? '#6366f1' : '#fff',
                color: period === 'month' ? '#fff' : '#555',
                fontSize: '12px',
                cursor: 'pointer',
                borderLeft: '1px solid #c7d2fe'
              }}
            >
              This month
            </button>
            <button
              onClick={() => handlePeriodChange('custom')}
              style={{
                padding: '7px 14px',
                border: 'none',
                background: period === 'custom' ? '#6366f1' : '#fff',
                color: period === 'custom' ? '#fff' : '#555',
                fontSize: '12px',
                cursor: 'pointer',
                borderLeft: '1px solid #c7d2fe'
              }}
            >
              Custom
            </button>
          </div>
          <button style={{ padding: '7px 14px', border: '1px solid #c7d2fe', borderRadius: '8px', background: '#fff', fontSize: '12px', cursor: 'pointer', color: '#555' }}>
            Export CSV
          </button>
        </div>
      </div>
 
      {/* Custom date range */}
      {showCustomRange && (
        <div style={{ background: '#fff', borderRadius: '8px', border: '0.5px solid #c7d2fe', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>From:</span>
          <input type="text" value="01-09-2025" style={{ padding: '6px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', width: '110px' }} />
          <span style={{ fontSize: '12px', color: '#888' }}>To:</span>
          <input type="text" value="30-09-2025" style={{ padding: '6px 10px', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', width: '110px' }} />
          <button style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', background: '#6366f1', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
            Apply
          </button>
        </div>
      )}
 
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #c7d2fe', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uninvoiced revenue</p>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1', margin: 0 }}>$8,430</p>
          <p style={{ fontSize: '11px', color: '#888', margin: '6px 0 0' }}>Across 12 jobs</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #c7d2fe', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billable hours</p>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a', margin: 0 }}>62.5h</p>
          <p style={{ fontSize: '11px', color: '#888', margin: '6px 0 0' }}>This week logged</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #c7d2fe', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Over budget</p>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', margin: 0 }}>3 jobs</p>
          <p style={{ fontSize: '11px', color: '#888', margin: '6px 0 0' }}>Need attention</p>
        </div>
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #c7d2fe', padding: '16px' }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg utilisation</p>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#0f1f3d', margin: 0 }}>76%</p>
          <p style={{ fontSize: '11px', color: '#888', margin: '6px 0 0' }}>Across 8 staff</p>
        </div>
      </div>
 
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '16px', borderBottom: '2px solid #eef2ff' }}>
        <button
          onClick={() => setActiveTab('wip')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            cursor: 'pointer',
            color: activeTab === 'wip' ? '#6366f1' : '#888',
            fontWeight: activeTab === 'wip' ? 600 : 'normal',
            borderBottom: activeTab === 'wip' ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Unbilled WIP
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            cursor: 'pointer',
            color: activeTab === 'budget' ? '#6366f1' : '#888',
            fontWeight: activeTab === 'budget' ? 600 : 'normal',
            borderBottom: activeTab === 'budget' ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Budget vs Actual
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'transparent',
            fontSize: '13px',
            cursor: 'pointer',
            color: activeTab === 'staff' ? '#6366f1' : '#888',
            fontWeight: activeTab === 'staff' ? 600 : 'normal',
            borderBottom: activeTab === 'staff' ? '2px solid #6366f1' : '2px solid transparent',
            marginBottom: '-2px'
          }}
        >
          Staff Utilisation
        </button>
      </div>
 
      {/* WIP Tab */}
      {activeTab === 'wip' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c7d2fe', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f5f5ff', borderBottom: '1px solid #eef2ff' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client / Job</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hours</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unbilled value</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {wipData.map((item, index) => (
                <tr key={index} style={{ borderBottom: index < wipData.length - 1 ? '1px solid #f5f5ff' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#0f1f3d' }}>{item.client}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#888' }}>{item.job}</p>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ 
                        width: '22px', 
                        height: '22px', 
                        borderRadius: '50%', 
                        background: item.staff.color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        color: getStatusTextColor(item.status) 
                      }}>
                        {item.staff.initials}
                      </div>
                      <span style={{ fontSize: '12px', color: '#555' }}>{item.staff.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f1f3d' }}>{item.hours}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#6366f1' }}>${item.unbilledValue.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      background: item.statusColor, 
                      color: getStatusTextColor(item.status), 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      padding: '2px 8px', 
                      borderRadius: '20px' 
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ 
                      padding: '5px 12px', 
                      border: 'none', 
                      borderRadius: '6px', 
                      background: item.actionColor, 
                      color: '#fff', 
                      fontSize: '11px', 
                      cursor: 'pointer', 
                      fontWeight: 600 
                    }}>
                      {item.actionText}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Total row */}
          <div style={{ padding: '12px 20px', background: '#f5f5ff', borderTop: '1px solid #eef2ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#888' }}>5 of 12 jobs shown</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>Total uninvoiced: <strong style={{ color: '#6366f1', fontSize: '15px' }}>$8,430.00</strong></span>
              <button style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: '#0f1f3d', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                Invoice all completed
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Budget vs Actual Tab */}
      {activeTab === 'budget' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c7d2fe', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f5f5ff', borderBottom: '1px solid #eef2ff' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Budget</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Variance</th>
              </tr>
            </thead>
            <tbody>
              {budgetData.map((item, index) => (
                <tr key={index} style={{ borderBottom: index < budgetData.length - 1 ? '1px solid #f5f5ff' : 'none', background: item.isOverBudget ? '#fff5f5' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#0f1f3d' }}>{item.job}</p>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#555' }}>{item.budget}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: item.isOverBudget ? '#dc2626' : '#555', fontWeight: item.isOverBudget ? 600 : 'normal' }}>
                    {item.actual}h
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#c7d2fe', borderRadius: '4px', height: '6px', width: '100px', overflow: 'hidden' }}>
                        <div style={{ background: item.progressColor, width: `${Math.min(item.progress, 100)}%`, height: '100%' }}></div>
                      </div>
                      <span style={{ fontSize: '11px', color: item.progressColor, fontWeight: item.isOverBudget ? 600 : 'normal' }}>
                        {item.progress}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: item.varianceColor, fontWeight: 600 }}>
                    {item.variance > 0 ? '+' : ''}{item.variance}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* Staff Utilisation Tab */}
      {activeTab === 'staff' && (
        <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #c7d2fe', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f5f5ff', borderBottom: '1px solid #eef2ff' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staff</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billable</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Non-billable</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Utilisation</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((item, index) => (
                <tr key={index} style={{ borderBottom: index < staffData.length - 1 ? '1px solid #f5f5ff' : 'none', background: item.utilization < 60 ? '#fff5f5' : 'transparent' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        background: item.staff.color, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        color: item.utilization < 60 ? '#dc2626' : '#0369a1' 
                      }}>
                        {item.staff.initials}
                      </div>
                      <span style={{ fontWeight: 500, color: '#0f1f3d' }}>{item.staff.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>{item.billable}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#888' }}>{item.nonBillable}h</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f1f3d' }}>{item.total}h</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: '#c7d2fe', borderRadius: '4px', height: '6px', width: '80px', overflow: 'hidden' }}>
                        <div style={{ background: item.utilizationColor, width: `${item.utilization}%`, height: '100%' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: item.utilizationColor, fontWeight: 600 }}>
                        {item.utilization}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: item.revenueColor }}>
                    ${item.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
 
export default Reports;
 