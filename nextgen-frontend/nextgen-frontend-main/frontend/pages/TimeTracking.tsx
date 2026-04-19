import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw, Clock, Users, TrendingUp, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { timeTrackingService } from '../services/timeTrackingService';
import { jobsService } from '../services/jobsService';
import Toast from '../components/Toast';
import { InvoiceGeneration } from './index';

interface TimeEntry {
  id: string;
  job: string;
  task: string;
  staff: {
    initials: string;
    name: string;
    avatar: string;
  };
  date: string;
  duration: string;
  type: 'Billable' | 'Non-billable';
  budget?: {
    current: number;
    total: number;
  };
}

const TimeTracking: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'job' | 'staff'>('job');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showBatchEntry, setShowBatchEntry] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({ show: false, message: '', type: 'success' });
  const [batchRows, setBatchRows] = useState([{
    task: '',
    staff: '',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    type: 'Billable'
  }]);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedType, setSelectedType] = useState<'Billable' | 'Non-billable'>('Billable');
  const [manualDuration, setManualDuration] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Real data states
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobTasks, setJobTasks] = useState<{[key: string]: any[]}>({});
  const [loading, setLoading] = useState(true);
  
  // Checkbox selection state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all time entries across all jobs
  const fetchAllTimeEntries = async () => {
    try {
      setLoading(true);
      
      // Fetch all time entries first (most important)
      const entriesResponse = await timeTrackingService.getAllTimeEntries();
      const allEntries = entriesResponse.data?.entries || [];

      // Apply role-based filtering
      const filteredEntries = allEntries.filter((entry: any) => {
        if (user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') {
          return true;
        }
        return entry.user_id === user?.id || entry.staff_id === user?.id;
      });

      setTimeEntries(filteredEntries);

      // Fetch all jobs for the batch entry dropdown
      const jobsResponse = await jobsService.getJobs();      
      const allJobs = jobsResponse.data?.jobs || [];
      setJobs(allJobs);

      // Don't fetch tasks upfront - fetch them when needed (lazy loading)
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks for all jobs when batch entry is opened
  const fetchTasksForAllJobs = async () => {
    const taskPromises = jobs.map(async (job: any) => {
      if (jobTasks[job.id]) {
        return { jobId: job.id, tasks: jobTasks[job.id] }; // Already fetched
      }
      
      try {
        const tasksResponse = await jobsService.getTasks(job.id);
        return { jobId: job.id, tasks: tasksResponse.data?.tasks || [] };
      } catch (error) {
        console.error(`Failed to fetch tasks for job ${job.id}:`, error);
        return { jobId: job.id, tasks: [] };
      }
    });

    const taskResults = await Promise.all(taskPromises);
    const tasksData: {[key: string]: any[]} = {};
    taskResults.forEach(result => {
      tasksData[result.jobId] = result.tasks;
    });
    setJobTasks(tasksData);
  };

  // Handle opening batch entry
  const handleOpenBatchEntry = async () => {
    setShowBatchEntry(true);
    // Fetch tasks for all jobs if not already fetched
    const hasUnfetchedTasks = jobs.some(job => !jobTasks[job.id]);
    if (hasUnfetchedTasks) {
      await fetchTasksForAllJobs();
    }
  };

  useEffect(() => {
    fetchAllTimeEntries();
  }, []);

  // Format duration helper functions
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Parse duration string (e.g. "1h 30m" -> 90 minutes)
  const parseDuration = (duration: string): number => {
    let minutes = 0;
    const parts = duration.split(' ');
    parts.forEach(part => {
      if (part.includes('h')) {
        minutes += parseInt(part) * 60;
      } else if (part.includes('m')) {
        minutes += parseInt(part);
      }
    });
    return minutes;
  };

  // Transform time entries for display
  const transformedTimeEntries = timeEntries.map((entry: any) => {
    // Find job name from jobs array using job_id with safety checks
    let jobName = 'Unknown Job';
    
    if (Array.isArray(jobs) && entry.job_id) {
      // Try to find job by ID
      const job = jobs.find(j => j.id === entry.job_id);
      //console.log('Found job:', job);
      jobName = job?.name || 'Unknown Job';
    }
    
    return {
      id: entry.id,
      job: jobName,
      task: entry.task_name,
      staff: {
        initials: entry.staff_name ? entry.staff_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?',
        name: entry.staff_name || 'Unknown',
        avatar: '#6366f1'
      },
      date: new Date(entry.entry_date).toLocaleDateString(),
      duration: entry.duration_formatted,
      type: entry.type,
      budget: entry.budget ? { current: entry.budget.current, total: entry.budget.total } : undefined,
      durationMinutes: entry.duration_minutes
    };
  });

  // Helper function to get this week's entries
  const getThisWeekEntries = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);
    
    return transformedTimeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });
  };

  // Get all entries for calculations
  const thisWeekEntries = getThisWeekEntries();

  // Helper functions for checkbox selection
  const handleSelectEntry = (entryId: string) => {
    const entry = transformedTimeEntries.find(e => e.id === entryId);
    if (entry && entry.type !== 'Billable') {
      // Show toast for non-billable entries
      setToast({
        show: true,
        message: 'Please select billable entries',
        type: 'error'
      });
      return;
    }
    
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEntries.size === transformedTimeEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(transformedTimeEntries.map(entry => entry.id)));
    }
  };

  const isAllSelected = transformedTimeEntries.length > 0 && selectedEntries.size === transformedTimeEntries.length;
  const isIndeterminate = selectedEntries.size > 0 && selectedEntries.size < transformedTimeEntries.length;
  
  // Count only billable selected entries for button display
  const billableSelectedCount = Array.from(selectedEntries).filter(entryId => {
    const entry = transformedTimeEntries.find(e => e.id === entryId);
    return entry && entry.type === 'Billable';
  }).length;

  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Calculate staff summary from time entries
  const staffData = React.useMemo(() => {
    const staffMap = new Map();
    
    transformedTimeEntries.forEach(entry => {
      const staffId = entry.staff.name;
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          name: entry.staff.name,
          initials: entry.staff.initials,
          avatar: entry.staff.avatar,
          totalMinutes: 0,
          billableMinutes: 0,
          nonBillableMinutes: 0
        });
      }
      
      const staff = staffMap.get(staffId);
      staff.totalMinutes += entry.durationMinutes || 0;
      
      if (entry.type === 'Billable') {
        staff.billableMinutes += entry.durationMinutes || 0;
      } else {
        staff.nonBillableMinutes += entry.durationMinutes || 0;
      }
    });
    
    return Array.from(staffMap.values()).map(staff => ({
      name: staff.name,
      initials: staff.initials,
      avatar: staff.avatar,
      total: formatDuration(staff.totalMinutes),
      billable: formatDuration(staff.billableMinutes),
      nonBillable: formatDuration(staff.nonBillableMinutes),
      utilization: staff.totalMinutes > 0 ? Math.round((staff.billableMinutes / staff.totalMinutes) * 100) : 0
    }));
  }, [transformedTimeEntries]);

  // Handle batch save
  const handleBatchSave = async () => {
    try {
      const validRows = batchRows.filter(row => 
        row.task && 
        row.staff && 
        row.duration && 
        row.date
      );

      if (validRows.length === 0) {
        // Show validation error toast
        setToast({
          show: true,
          message: 'Please fill in at least one complete row',
          type: 'error'
        });
        return;
      }

      for (const row of validRows) {
        // Parse job and task from the combined string
        const [jobName, ...taskParts] = row.task.split(' — ');
        const taskName = taskParts.join(' — ');
        
        // Find the job
        const job = jobs.find(j => j.name === jobName);
        if (!job) {
          console.error(`Job not found: ${jobName}`);
          continue;
        }

        // Find staff ID from staff name
        const staffEntry = timeEntries.find(entry => entry.staff_name === row.staff);
        const staffId = staffEntry?.user_id || staffEntry?.staff_id;

        const durationMinutes = parseDuration(row.duration);
        if (durationMinutes < 1) {
          // Show validation error toast
          setToast({
            show: true,
            message: `Duration must be at least 1 minute for ${taskName}`,
            type: 'error'
          });
          continue;
        }

        await timeTrackingService.logTime(job.id, {
          taskName,
          durationMinutes,
          entryDate: row.date,
          type: row.type,
          isTimerEntry: false,
          userId: staffId,
          staffName: row.staff
        });
      }

      // Refresh data and close batch entry
      await fetchAllTimeEntries();
      setShowBatchEntry(false);
      setBatchRows([{
        task: '',
        staff: '',
        date: new Date().toISOString().split('T')[0],
        duration: '',
        type: 'Billable'
      }]);
      
      // Show success toast
      setToast({
        show: true,
        message: `Successfully saved ${validRows.length} time entries`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to save batch entries:', error);
    }
  };

  return (
    <div className="space-y-6 font-['Segoe_UI']">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('job')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'job'
                ? 'bg-indigo-500 text-white border border-indigo-500'
                : 'bg-white text-gray-600 border border-indigo-200'
            }`}
          >
            Job View
          </button>
          <button
            onClick={() => setActiveView('staff')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'staff'
                ? 'bg-indigo-500 text-white border border-indigo-500'
                : 'bg-white text-gray-600 border border-indigo-200'
            }`}
          >
            Staff Summary
          </button>
        </div>
      </div>

      {activeView === 'job' ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-indigo-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">This week</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {formatDuration(thisWeekEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-indigo-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Billable</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatDuration(thisWeekEntries
                  .filter(entry => entry.type === 'Billable')
                  .reduce((total, entry) => total + (entry.durationMinutes || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-indigo-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Non-billable</p>
              </div>
              <p className="text-2xl font-bold text-gray-500">
                {formatDuration(thisWeekEntries
                  .filter(entry => entry.type === 'Non-billable')
                  .reduce((total, entry) => total + (entry.durationMinutes || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-indigo-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wide">Utilisation</p>
              </div>
              <p className="text-2xl font-bold text-indigo-500">
                {(() => {
                  const totalMinutes = thisWeekEntries.reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
                  const billableMinutes = thisWeekEntries
                    .filter(entry => entry.type === 'Billable')
                    .reduce((total, entry) => total + (entry.durationMinutes || 0), 0);
                  const utilization = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;
                  return `${utilization}%`;
                })()}
              </p>
            </div>
          </div>

          {/* Active Timer Bar */}
          {/* {isTimerRunning && (
            <div className="bg-white rounded-lg border border-indigo-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Monthly Bookkeeping — Big Kahuna Burger Ltd.</p>
                  <p className="text-xs text-gray-500">Bank Feed Reconciliation</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-indigo-500 font-mono">{formatTime(seconds)}</span>
                <button
                  onClick={() => setIsTimerRunning(false)}
                  className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Pause className="w-3 h-3" />
                  Stop
                </button>
                <button
                  onClick={() => setIsTimerRunning(true)}
                  className="px-3 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <Play className="w-3 h-3" />
                  Start
                </button>
                <button
                  onClick={() => setSeconds(0)}
                  className="px-3 py-1.5 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>
          )} */}

          {/* Time Entries Table */}
          <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Time Entries</p>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenBatchEntry}
                  className="px-3 py-1.5 border border-indigo-500 text-indigo-500 text-sm font-medium rounded-lg bg-white hover:bg-indigo-50 transition-colors"
                >
                  + Log Time
                </button>
                {/* <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-3 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isTimerRunning ? 'Pause Timer' : 'Start Timer'}
                </button> */}
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span>Job / Task</span>
                  </div>
                </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Budget</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-sm text-gray-500">Loading time entries...</p>
                      </div>
                    </td>
                  </tr>
                ) : transformedTimeEntries.length > 0 ? (
                  transformedTimeEntries.map((entry, index) => (
                    <tr key={entry.id} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => handleSelectEntry(entry.id)}
                            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{entry.job}</p>
                            <p className="text-xs text-gray-500">{entry.task}</p>
                            {entry.budget && entry.budget.current > entry.budget.total && (
                              <p className="text-xs text-red-600 font-medium">Over budget</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{
                              background: entry.staff.avatar,
                              color: entry.staff.avatar === '#fef3c7' ? '#92400e' : entry.staff.avatar === '#e0f2fe' ? '#0369a1' : '#9d174d'
                            }}
                          >
                            {entry.staff.initials}
                          </div>
                          <span className="text-sm text-gray-600">{entry.staff.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{entry.date}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{entry.duration}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          entry.type === 'Billable'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {entry.budget ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${entry.budget.current > entry.budget.total ? 'bg-red-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min((entry.budget.current / entry.budget.total) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs ${entry.budget.current > entry.budget.total ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {entry.budget.current}h / {entry.budget.total}h
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-gray-500">No time entries found</p>
                        <p className="text-xs text-gray-400 mt-1">Start logging time to see entries here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Batch Entry Panel */}
            {showBatchEntry && (
              <div className="border-t-2 border-dashed border-indigo-500 bg-indigo-50 p-4 w-full">
                <div id="batchRows">
                  {batchRows.map((row, index) => (
                    <div key={index} className="flex gap-2 items-center mb-2">
                      <select 
                        value={row.task}
                        onChange={(e) => {
                          const newRows = [...batchRows];
                          newRows[index].task = e.target.value;
                          setBatchRows(newRows);
                        }}
                        className="p-2 border border-indigo-200 rounded-md text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[550px]"
                      >
                        <option value="">Select Job / Task</option>
                        {jobs.filter(job => jobTasks[job.id]?.length > 0).map(job => (
                          <optgroup key={job.id} label={job.name}>
                            {jobTasks[job.id].map((task: any) => (
                              <option key={task.id} value={`${job.name} — ${task.name}`}>
                                {task.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <select 
                        value={row.staff}
                        onChange={(e) => {
                          const newRows = [...batchRows];
                          newRows[index].staff = e.target.value;
                          setBatchRows(newRows);
                        }}
                        className="p-2 border border-indigo-200 rounded-md text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[400px]"
                      >
                        <option value="">Select Staff</option>
                        {Array.from(new Set(timeEntries.map(entry => entry.staff_name).filter(Boolean))).map(staffName => (
                          <option key={staffName} value={staffName}>
                            {staffName}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="date" 
                        value={row.date}
                        onChange={(e) => {
                          const newRows = [...batchRows];
                          newRows[index].date = e.target.value;
                          setBatchRows(newRows);
                        }}
                        className="p-2 border border-indigo-200 rounded-md text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[300px]" 
                      />
                      <input 
                        type="text" 
                        placeholder="1h 30m" 
                        value={row.duration}
                        onChange={(e) => {
                          const newRows = [...batchRows];
                          newRows[index].duration = e.target.value;
                          setBatchRows(newRows);
                        }}
                        className="p-2 border border-indigo-200 rounded-md text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[120px]" 
                      />
                      <select 
                        value={row.type}
                        onChange={(e) => {
                          const newRows = [...batchRows];
                          newRows[index].type = e.target.value as 'Billable' | 'Non-billable';
                          setBatchRows(newRows);
                        }}
                        className="p-2 border border-indigo-200 rounded-md text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[150px]"
                      >
                        <option value="Billable">Billable</option>
                        <option value="Non-billable">Non-billable</option>
                      </select>
                      <button 
                        onClick={() => {
                          if (batchRows.length > 1) {
                            const newRows = batchRows.filter((_, i) => i !== index);
                            setBatchRows(newRows);
                          }
                        }}
                        className="w-7 h-7 border border-red-300 rounded-md bg-red-50 text-red-600 text-xs cursor-pointer hover:bg-red-100 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-0  pb-4 flex items-center justify-between">
                  <button 
                    onClick={() => setBatchRows([...batchRows, {
                      task: '',
                      staff: '',
                      date: new Date().toISOString().split('T')[0],
                      duration: '',
                      type: 'Billable'
                    }])}
                    className="p-2 border border-dashed border-indigo-500 rounded-md bg-transparent text-indigo-500 text-xs cursor-pointer font-medium hover:bg-indigo-50 transition-colors"
                  >
                    + Add another row
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      className="p-2 border border-indigo-200 bg-white text-xs cursor-pointer hover:bg-indigo-50 transition-colors rounded-lg"
                      onClick={() => setShowBatchEntry(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      onClick={handleBatchSave}
                      className="p-2 bg-indigo-500 text-white text-xs cursor-pointer font-medium hover:bg-indigo-600 transition-colors rounded-lg"
                    >
                      Save all entries
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              {(user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') && (
                <button 
                  onClick={() => setShowInvoiceModal(true)}
                  disabled={billableSelectedCount === 0}
                  className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Generate Invoice {billableSelectedCount > 0 && `(${billableSelectedCount})`}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Staff Summary View */
        <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-slate-900">Staff Time Summary — This Week</p>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Billable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Non-billable</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map((staff, index) => (
                <tr key={staff.name} className={`border-b border-gray-100 ${index === 2 ? '' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: staff.avatar,
                          color: staff.avatar === '#fef3c7' ? '#92400e' : staff.avatar === '#e0f2fe' ? '#0369a1' : '#9d174d'
                        }}
                      >
                        {staff.initials}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{staff.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{staff.total}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{staff.billable}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{staff.nonBillable}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${staff.utilization >= 80 ? 'bg-green-500' : staff.utilization >= 60 ? 'bg-indigo-500' : 'bg-red-500'}`}
                          style={{ width: `${staff.utilization}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${
                        staff.utilization >= 80 ? 'text-green-600' : staff.utilization >= 60 ? 'text-indigo-600' : 'text-red-600'
                      }`}>
                        {staff.utilization}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Generation Modal */}
      {showInvoiceModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Content */}
            <div className="p-0">
              <InvoiceGeneration 
                onClose={() => setShowInvoiceModal(false)} 
                selectedEntryIds={Array.from(selectedEntries)}
                allEntries={transformedTimeEntries}
                originalTimeEntries={timeEntries}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TimeTracking;
