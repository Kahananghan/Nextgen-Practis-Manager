
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { jobsService } from '../services/jobsService';

const JobDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const [jobRes, tasksRes] = await Promise.all([
        jobsService.getJobById(id!),
        jobsService.getTasks(id!),
      ]);
      setJob(jobRes.data);
      setTasks(Array.isArray(tasksRes.data.tasks) ? tasksRes.data.tasks : []);
    } catch (err) {
      console.error('Failed to fetch job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(i => i !== taskId) : [...prev, taskId]
    );
  };

  const toggleAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleCompleteTask = async () => {
    try {
      for (const taskId of selectedTasks) {
        await jobsService.completeTask(id!, taskId, true);
      }
      await fetchJobDetails();
      setSelectedTasks([]);
    } catch (err) {
      console.error('Failed to complete tasks:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Delete selected tasks?')) return;
    
    try {
      for (const taskId of selectedTasks) {
        await jobsService.deleteTask(id!, taskId);
      }
      await fetchJobDetails();
      setSelectedTasks([]);
    } catch (err) {
      console.error('Failed to delete tasks:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1]"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Job not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-200 rounded-lg transition-all">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">{job.name}</h1>
      </div>

      {/* Info Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
        <div className="space-y-1">
          <p>Client Name</p>
          <p className="text-xs text-slate-800 font-black tracking-normal capitalize">{job.client?.name || 'N/A'}</p>
        </div>
        <div className="space-y-1">
          <p>Job Name</p>
          <p className="text-xs text-slate-800 font-black tracking-normal capitalize">{job.name}</p>
        </div>
        <div className="space-y-1">
          <p>Job Type</p>
          <p className="text-xs text-slate-800 font-black tracking-normal capitalize">{job.jobType || job.category || 'N/A'}</p>
        </div>
        <div className="space-y-1">
          <p>Assigned To</p>
          <p className="text-xs text-slate-800 font-black tracking-normal capitalize">{job.assignedStaff?.name || 'Unassigned'}</p>
        </div>
        <div className="space-y-1">
          <p>Priority</p>
          <p className="text-xs text-[#6366f1] font-black tracking-normal capitalize">{job.priority}</p>
        </div>
        <div className="space-y-1">
          <p>Due Date</p>
          <p className="text-xs text-slate-800 font-black tracking-normal capitalize">
            {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div className="space-y-1">
          <p>Status</p>
          <p className="text-xs text-[#6366f1] font-black tracking-normal capitalize">{job.state}</p>
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative min-h-[450px]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedTasks.length === tasks.length && tasks.length > 0} 
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]"
                />
              </th>
              <th className="px-6 py-4 w-1/4">Task Name</th>
              <th className="px-6 py-4">Task Details</th>
              <th className="px-6 py-4 w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                  No tasks found for this job
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-5 align-top">
                    <input 
                      type="checkbox" 
                      checked={selectedTasks.includes(task.id)} 
                      onChange={() => toggleTask(task.id)}
                      disabled={task.isCompleted}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1] cursor-pointer disabled:opacity-50"
                    />
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className={`text-xs font-black ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.name}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs text-slate-600 font-bold leading-relaxed whitespace-pre-line">
                      {task.description || 'No description'}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    {task.isCompleted ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">
                        Done
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Action Bar */}
        {selectedTasks.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 animate-in slide-in-from-bottom-5 duration-300">
            <button 
              onClick={handleDeleteTask}
              className="px-10 py-2.5 border border-[#6366f1] text-[#6366f1] rounded-lg text-[11px] font-black uppercase tracking-widest bg-white hover:bg-[#4f52d4] shadow-xl transition-all active:scale-95">
              Delete Task
            </button>
            <button 
              onClick={handleCompleteTask}
              className="px-10 py-2.5 bg-[#6366f1] text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-[#4f52d4] shadow-xl shadow-indigo-500/20 transition-all active:scale-95">
              Complete Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
