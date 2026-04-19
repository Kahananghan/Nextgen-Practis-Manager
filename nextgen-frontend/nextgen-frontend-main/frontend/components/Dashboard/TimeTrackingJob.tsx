import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { timeTrackingService } from '../../services/timeTrackingService';
import { useAuth } from '../../context/AuthContext';
import InvoiceGeneration from '@/pages/InvoiceGeneration';
import Toast from '../Toast';

interface TimeTrackingJobProps {
  jobId?: string;
  tasks?: any[];
  timeEntries?: any[];
  isTimerRunning?: boolean;
  timerSeconds?: number;
  setIsTimerRunning?: (running: boolean) => void;
  setTimerSeconds?: (seconds: number) => void;
  onTimeEntryLogged?: () => void;
  clientName?: string;
  clientEmail?: string;
}

const TimeTrackingJob: React.FC<TimeTrackingJobProps> = ({ 
  jobId, 
  tasks: propTasks, 
  timeEntries: propTimeEntries,
  isTimerRunning = false,
  timerSeconds = 0,
  setIsTimerRunning,
  setTimerSeconds,
  onTimeEntryLogged,
  clientName,
  clientEmail
}) => {
  // Get current user and role
  const { user } = useAuth();
  
  // Time tracking state
  const [seconds, setSeconds] = useState(timerSeconds);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedType, setSelectedType] = useState<'Billable' | 'Non-billable'>('Billable');
  const [manualDuration, setManualDuration] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({ show: false, message: '', type: 'success' });
  
  
  // Checkbox selection state
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Transform time entries from props for display with role-based filtering
  const transformedTimeEntries = propTimeEntries?.filter((entry: any) => {
    // If user is admin or manager, show all entries
    if (user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') {
      return true;
    }
    // Otherwise, only show entries created by the current user
    return entry.user_id === user?.id;
  }).map((entry: any) => ({
    id: entry.id,
    job_id: jobId,
    task: entry.task_name,
    date: new Date(entry.entry_date).toLocaleDateString(),
    duration: entry.duration_formatted,
    durationMinutes: entry.duration_minutes,
    type: entry.type,
    staff: {
      name: entry.staff_name,
      initials: entry.staff_name ? entry.staff_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?',
      avatar: '#6366f1' // Default avatar color
    }
  })) || [];

  // Sync with parent timer state
  useEffect(() => {
    setSeconds(timerSeconds);
  }, [timerSeconds]);

  // Set tasks from props on component mount
  useEffect(() => {
    if (jobId) {
      // Use tasks from props if available
      if (propTasks && propTasks.length > 0) {
        setTasks(propTasks);
        // Always set first task as default when tasks are available
        setSelectedTask(propTasks[0].name);
      }
    }
  }, [jobId, propTasks]);

  const toggleTimer = () => {
    if (setIsTimerRunning) {
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const resetTimer = () => {
    if (setTimerSeconds) {
      setTimerSeconds(0);
    }
    setSeconds(0);
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const logTimerEntry = async () => {
    if (seconds === 0 || !jobId) return;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const durationMinutes = hours * 60 + minutes;

    if (durationMinutes < 1) {
      alert('Timer must run for at least 1 minute before logging');
      return;
    }

    try {
      setLoading(true);
      await timeTrackingService.logTime(jobId, {
        taskName: selectedTask,
        durationMinutes,
        type: selectedType,
        isTimerEntry: true
      });
      // Stop timer after logging
      if (setIsTimerRunning) {
        setIsTimerRunning(false);
      }
      if (setTimerSeconds) {
        setTimerSeconds(0);
      }
      setSeconds(0);
      if (onTimeEntryLogged) {
        onTimeEntryLogged(); // Notify parent to refresh time entries
      }
    } catch (error) {
      console.error('Failed to log timer entry:', error);
      alert('Failed to log timer entry: ' + (error as any)?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const logManualTime = async () => {
    if (!manualDuration || !jobId) {
      alert('Please enter a duration (e.g. 1h 30m)');
      return;
    }

    // Parse duration (e.g. "1h 30m" -> 90 minutes)
    let durationMinutes = 0;
    const parts = manualDuration.split(' ');
    parts.forEach(part => {
      if (part.includes('h')) {
        durationMinutes += parseInt(part) * 60;
      } else if (part.includes('m')) {
        durationMinutes += parseInt(part);
      }
    });

    try {
      setLoading(true);
      await timeTrackingService.logTime(jobId, {
        taskName: selectedTask,
        durationMinutes,
        entryDate: selectedDate,
        type: selectedType,
        isTimerEntry: false
      });
      setManualDuration('');
      if (onTimeEntryLogged) {
        onTimeEntryLogged(); // Notify parent to refresh time entries
      }
    } catch (error) {
      console.error('Failed to log manual time:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBillableHours = (): number => {
    return transformedTimeEntries
      .filter(entry => entry.type === 'Billable')
      .reduce((total, entry) => {
        return total + (entry.durationMinutes || 0) / 60;
      }, 0);
  };

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

  return (
    <div>
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
      {/* Budget progress */}
      {/* <div className="bg-white rounded-xl border border-indigo-200 p-4 mb-4">
        <div className="flex justify-between items-center mb-2.5">
          <p className="text-sm font-semibold text-slate-900 m-0">Budget progress</p>
          <span className="text-xs text-slate-500">6h logged of 10h estimated</span>
        </div>
        <div className="bg-indigo-50 rounded-md h-2 overflow-hidden mb-2">
          <div 
            className="bg-indigo-500 h-full rounded-md transition-all duration-300"
            style={{ width: `${(6 / 10) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between">
          <div className="flex gap-4">
            <span className="text-xs text-slate-500">Billable: <strong className="text-emerald-600">4h</strong></span>
            <span className="text-xs text-slate-500">Non-billable: <strong className="text-slate-600">2h</strong></span>
          </div>
          <span className="text-xs text-indigo-600 font-semibold">4h remaining</span>
        </div>
      </div> */}

      {/* Timer widget */}
      <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-4">
        <p className="text-xs font-semibold text-slate-500 m-0 mb-3.5 uppercase tracking-wide">
          Log time for this job
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Task</label>
            <select 
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full p-2 border border-indigo-200 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <option key={task.id} value={task.name}>{task.name}</option>
                ))
              ) : (
                <option value="">No tasks available</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Type</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'Billable' | 'Non-billable')}
              className="w-full p-2 border border-indigo-200 rounded-md text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="Billable">Billable</option>
              <option value="Non-billable">Non-billable</option>
            </select>
          </div>
        </div>

        {/* Two equal action areas */}
        <div className="grid grid-cols-2 gap-3">
          {/* Log Time (manual) */}
          <div className="bg-indigo-50 rounded-lg p-3.5 border border-indigo-300">
            <p className="text-xs font-semibold text-indigo-600 m-0 mb-2 uppercase tracking-wide">
              Log manually
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input 
                type="text" 
                placeholder="e.g. 1h 30m" 
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="flex-1 p-2 border border-indigo-200 rounded-md text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 border border-indigo-200 rounded-md text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button 
              onClick={logManualTime}
              className="w-full p-2 border-none rounded-md bg-indigo-500 text-white text-xs cursor-pointer font-semibold hover:bg-indigo-600 transition-colors"
            >
              + Log Time
            </button>
          </div>

          {/* Start Timer */}
          <div className="bg-indigo-50 rounded-lg p-3.5 border border-indigo-300">
            <p className="text-xs font-semibold text-slate-500 m-0 mb-2 uppercase tracking-wide">
              Use timer
            </p>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500 m-0">
                  {isTimerRunning ? 'Timer running...' : seconds > 0 ? 'Timer paused' : 'Ready to start'}
                </p>
                <p className="text-lg font-bold text-slate-900 m-0 mt-1" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '2px' }}>
                  {formatTime(seconds)}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button 
                  onClick={toggleTimer}
                  className="w-10 h-10 border-none rounded-full bg-red-600 cursor-pointer flex items-center justify-center hover:bg-red-700 transition-colors"
                  style={{ backgroundColor: isTimerRunning ? '#dc2626' : '#6366f1' }}
                >
                  {isTimerRunning ? (
                    <Pause width={14} height={14} color="#fff" />
                  ) : (
                    <Play width={14} height={14} color="#fff" />
                  )}
                </button>
                <button 
                  onClick={resetTimer}
                  className="w-8 h-8 border border-indigo-200 rounded-full bg-white cursor-pointer flex items-center justify-center hover:bg-indigo-50 transition-colors"
                >
                  <RotateCcw width={10} height={10} color="#6b7280" />
                </button>
              </div>
            </div>
            <button 
              onClick={logTimerEntry}
              disabled={seconds === 0}
              className={`w-full p-2 border-none rounded-md text-xs font-semibold transition-colors ${
                seconds > 0 
                  ? 'bg-slate-800 text-white cursor-pointer hover:bg-slate-900' 
                  : 'bg-indigo-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              Log timer entry
            </button>
          </div>
        </div>
      </div>

      {/* Time entries */}
      <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
        <div className="p-3.5 border-b border-indigo-100 flex justify-between items-center">
          <p className="text-sm font-semibold text-slate-900 m-0">Time entries</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-50 border-b border-indigo-100">
                <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-wide">
                {(user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') ? (
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
                    <span>Task</span>
                  </div>
                ) : (
                  <span>Task</span>
                )}
              </th>
                <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Staff</th>
                <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="p-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody>
              {transformedTimeEntries.length > 0 ? (
                transformedTimeEntries.map((entry, index) => (
                  <tr key={entry.id} className={'border-b border-indigo-50'}>
                    <td className="p-2.5 text-slate-900 font-semibold">
                      <div className="flex items-center gap-2">
                        { (user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') ? (
                        <input
                          type="checkbox"
                          checked={selectedEntries.has(entry.id)}
                          onChange={() => handleSelectEntry(entry.id)}
                          className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-0.5"
                        />) : null}
                        <span>{entry.task}</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {entry.staff ? (
                          <>
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                              style={{ 
                                background: entry.staff.avatar || '#6366f1', 
                                color: entry.staff.avatar === '#fef3c7' ? '#92400e' : '#ffffff' 
                              }}
                            >
                              {entry.staff.initials || '?'}
                            </div>
                            <span className="text-xs text-slate-600">{entry.staff.name || 'Unknown'}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-600">Unknown staff</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2.5 text-slate-500 text-xs">{entry.date}</td>
                    <td className="p-2.5 font-semibold text-slate-900">{entry.duration}</td>
                    <td className="p-2.5">
                      <span 
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          entry.type === 'Billable' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-slate-500 text-sm m-0">No time entries found</p>
                      <p className="text-slate-400 text-xs m-0 mt-1">Start logging time to see entries here</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-indigo-50 border-t border-indigo-100 flex justify-end">
          {(user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') && (
            <button 
            onClick={() => setShowInvoiceModal(true)}
            disabled={billableSelectedCount === 0}
            className="p-1.5 border-none rounded-md bg-indigo-500 text-white text-xs cursor-pointer font-semibold hover:bg-indigo-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
              Generate Invoice {billableSelectedCount > 0 && `(${billableSelectedCount})`}
            </button>
          )}
        </div>
      </div>
      
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-0">
              <InvoiceGeneration 
                onClose={() => setShowInvoiceModal(false)} 
                selectedEntryIds={Array.from(selectedEntries)}
                allEntries={transformedTimeEntries}
                originalTimeEntries={propTimeEntries}
                clientName={clientName}
                clientEmail={clientEmail}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingJob;