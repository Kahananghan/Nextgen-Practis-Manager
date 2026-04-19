
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X,
  Calendar as CalendarIcon
} from 'lucide-react';
import { jobsService } from '../services/jobsService';

const CalendarView: React.FC = () => {
  const [activeJob, setActiveJob] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobsService.getJobs({ limit: 100 });
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group jobs by day
  const getJobsForDay = (day: number) => {
    return jobs.filter(job => {
      if (!job.dueDate) return false;
      const dueDate = new Date(job.dueDate);
      return dueDate.getDate() === day && 
             dueDate.getMonth() === currentMonth.getMonth() &&
             dueDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const getJobColor = (state: string) => {
    switch (state) {
      case 'Complete': return 'green';
      case 'In Progress': return 'indigo';
      case 'On Hold': return 'red';
      default: return 'slate';
    }
  };

  const days = Array.from({ length: 35 }, (_, i) => {
    const day = (i - 1 + 1) % 31 || 31;
    return day;
  });

  return (
    <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <button
                className="p-2.5 hover:bg-slate-50 text-slate-400 border-r border-slate-100"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="p-2.5 hover:bg-slate-50 text-slate-400"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="px-5 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </button>
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>

          <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-100 shadow-inner">
            <button
              className={`px-5 py-2 rounded-lg text-xs font-black shadow-sm ${calendarView === 'month' ? 'bg-white text-[#6366f1]' : 'text-slate-400 font-bold hover:text-slate-600 transition-colors'}`}
              onClick={() => setCalendarView('month')}
            >
              Month
            </button>
            <button
              className={`px-5 py-2 rounded-lg text-xs font-bold shadow-sm ${calendarView === 'week' ? 'bg-white text-[#6366f1]' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}
              onClick={() => setCalendarView('week')}
            >
              Week
            </button>
            <button
              className={`px-5 py-2 rounded-lg text-xs font-bold shadow-sm ${calendarView === 'day' ? 'bg-white text-[#6366f1]' : 'text-slate-400 hover:text-slate-600 transition-colors'}`}
              onClick={() => setCalendarView('day')}
            >
              Day
            </button>
          </div>
        </div>

            {/* Calendar Views */}
            {calendarView === 'month' && (
              <div className="grid grid-cols-7 border-t border-l border-slate-50">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <div key={day} className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-b border-slate-50 bg-slate-50/30">
                    {day}
                  </div>
                ))}
                {days.map((day, idx) => {
                  const isOtherMonth = idx === 0 || idx > 30;
                  const isToday = day === new Date().getDate();
                  const dayJobs = getJobsForDay(day);
                  return (
                    <div key={idx} className={`min-h-[160px] p-2 border-r border-b border-slate-50 transition-colors relative ${isToday ? 'bg-indigo-50/20' : ''}`}>
                      <span className={`text-[11px] font-black absolute top-2 right-3 ${isOtherMonth ? 'text-slate-300' : 'text-slate-500'}`}>{day}</span>
                      <div className="mt-8 space-y-1.5">
                        {dayJobs.map((job: any) => {
                          const color = getJobColor(job.state);
                          return (
                            <button
                              key={job.id}
                              onClick={() => setActiveJob(job)}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all truncate ${
                                color === 'indigo' ? 'bg-[#6366f1] shadow-indigo-500/10' :
                                color === 'red' ? 'bg-[#e05252] shadow-red-500/10' :
                                color === 'green' ? 'bg-[#1d9e75] shadow-green-500/10' :
                                'bg-slate-500 shadow-slate-500/10'
                              }`}
                            >
                              {job.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {calendarView === 'week' && (
              <div className="grid grid-cols-7 border-t border-l border-slate-50">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <div key={day} className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-b border-slate-50 bg-slate-50/30">
                    {day}
                  </div>
                ))}
                {/* Show jobs for current week */}
                {(() => {
                  const weekStart = new Date(currentMonth);
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  return Array.from({ length: 7 }).map((_, i) => {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + i);
                    const dayJobs = jobs.filter(job => {
                      if (!job.dueDate) return false;
                      const dueDate = new Date(job.dueDate);
                      return dueDate.getDate() === dayDate.getDate() &&
                        dueDate.getMonth() === dayDate.getMonth() &&
                        dueDate.getFullYear() === dayDate.getFullYear();
                    });
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} className={`min-h-[160px] p-2 border-r border-b border-slate-50 transition-colors relative ${isToday ? 'bg-indigo-50/20' : ''}`}>
                        <span className={`text-[11px] font-black absolute top-2 right-3 text-slate-500`}>{dayDate.getDate()}</span>
                        <div className="mt-8 space-y-1.5">
                          {dayJobs.map((job: any) => {
                            const color = getJobColor(job.state);
                            return (
                              <button
                                key={job.id}
                                onClick={() => setActiveJob(job)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all truncate ${
                                  color === 'indigo' ? 'bg-[#6366f1] shadow-indigo-500/10' :
                                  color === 'red' ? 'bg-[#e05252] shadow-red-500/10' :
                                  color === 'green' ? 'bg-[#1d9e75] shadow-green-500/10' :
                                  'bg-slate-500 shadow-slate-500/10'
                                }`}
                              >
                                {job.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
            {calendarView === 'day' && (
              <div className="border-t border-l border-slate-50">
                <div className="px-4 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-b border-slate-50 bg-slate-50/30">
                  {currentMonth.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="min-h-[160px] p-2 border-r border-b border-slate-50 transition-colors relative">
                  <div className="mt-8 space-y-1.5">
                    {jobs.filter(job => {
                      if (!job.dueDate) return false;
                      const dueDate = new Date(job.dueDate);
                      return dueDate.getDate() === currentMonth.getDate() &&
                        dueDate.getMonth() === currentMonth.getMonth() &&
                        dueDate.getFullYear() === currentMonth.getFullYear();
                    }).map((job: any) => {
                      const color = getJobColor(job.state);
                      return (
                        <button
                          key={job.id}
                          onClick={() => setActiveJob(job)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all truncate ${
                            color === 'indigo' ? 'bg-[#6366f1] shadow-indigo-500/10' :
                            color === 'red' ? 'bg-[#e05252] shadow-red-500/10' :
                            color === 'green' ? 'bg-[#1d9e75] shadow-green-500/10' :
                            'bg-slate-500 shadow-slate-500/10'
                          }`}
                        >
                          {job.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
      </div>

      {/* Job Details Modal (Screen 4) */}
      {activeJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setActiveJob(null)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} strokeWidth={3} />
            </button>
            <div className="p-12">
              <h2 className="text-3xl font-black text-slate-800 text-center mb-10 tracking-tight">Job Details</h2>
              
              <div className="flex flex-col space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-[#6366f1] underline decoration-indigo-500/30 decoration-4 underline-offset-8 cursor-pointer">{activeJob.name}</h3>
                  <span className="px-4 py-1.5 bg-indigo-100 text-[#6366f1] rounded-full text-[10px] font-black uppercase tracking-wider">{activeJob.state}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><CalendarIcon size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Created Date:</p>
                      <p className="text-sm font-bold text-slate-800">{activeJob.createdAt ? new Date(activeJob.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right justify-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Due Date:</p>
                      <p className="text-sm font-bold text-slate-800">{activeJob.dueDate ? new Date(activeJob.dueDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><CalendarIcon size={18} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Assigned To:</p>
                      <p className="text-sm font-bold text-slate-800">{activeJob.assignedStaff?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right justify-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Priority:</p>
                      <p className="text-sm font-bold text-[#6366f1]">{activeJob.priority}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Bar:</p>
                     <p className="text-xs font-black text-slate-700">{activeJob.progress || 0}%</p>
                   </div>
                   <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-[#1d9e75] rounded-full transition-all duration-1000"
                        style={{ width: `${activeJob.progress}%` }}
                     />
                   </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => setActiveJob(null)}
                    className="w-full py-4 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f46e5] transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
