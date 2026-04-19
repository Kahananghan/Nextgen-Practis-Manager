import React from 'react';
import { X } from 'lucide-react';

interface TaskModalProps {
  jobs: any[];
  selectedJobId: string | number | null;
  taskData: { taskName: string; taskDetails: string };
  setTaskData: (data: { taskName: string; taskDetails: string }) => void;
  taskLoading: boolean;
  setActiveModal: (modal: any) => void;
  handleCreateTask: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  jobs,
  selectedJobId,
  taskData,
  setTaskData,
  taskLoading,
  setActiveModal,
  handleCreateTask
}) => {
  const job = jobs.find(j => j.id === selectedJobId);
  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300'>
      <div className='bg-white rounded-[24px] w-full max-w-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300'>
        <button
          onClick={() => setActiveModal(null)}
          className='absolute right-6 top-6 text-slate-300 hover:text-slate-600 transition-colors'
        >
          <X size={20} strokeWidth={2.5} />
        </button>
        <div className='p-10'>
          <h2 className='text-xl font-black text-slate-800 text-center mb-10 tracking-tight '>
            Create New Task
          </h2>
          <div className='grid grid-cols-2 gap-x-6 gap-y-6'>
            {/* Dynamic Job Info Fields */}
            <>
              <div className='space-y-1.5'>
                <label className='text-xs'>Client Name</label>
                <input
                  type='text'
                  readOnly
                  value={job?.client?.name || ''}
                  className='w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] text-slate-400 outline-none'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-xs'>Job Name</label>
                <input
                  type='text'
                  readOnly
                  value={job?.name || ''}
                  className='w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] text-slate-400 outline-none'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-xs'>Job Type</label>
                <input
                  type='text'
                  readOnly
                  value={job?.jobType || job?.category || ''}
                  className='w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] text-slate-400 outline-none'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-xs'>Assigned To</label>
                <div className='flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5'>
                  <img
                    src={job?.assignedStaff?.avatarUrl || 'https://picsum.photos/seed/alice/24/24'}
                    className='w-5 h-5 rounded-full'
                  />
                  <span className='text-[11px] text-slate-700'>
                    {job?.assignedStaff?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </>
            <div className='col-span-2 space-y-1.5'>
              <label className='text-xs   '>
                Task Name
              </label>
              <input
                type='text'
                value={taskData.taskName}
                onChange={(e) =>
                  setTaskData({ ...taskData, taskName: e.target.value })
                }
                placeholder='Enter task name'
                className='w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] outline-none focus:ring-1 focus:ring-[#6366f1] transition-all'
              />
            </div>
            <div className='col-span-2 space-y-1.5'>
              <label className='text-xs   '>
                Task Details
              </label>
              <textarea
                rows={3}
                value={taskData.taskDetails}
                onChange={(e) =>
                  setTaskData({ ...taskData, taskDetails: e.target.value })
                }
                placeholder='Write about task'
                className='w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] outline-none focus:ring-1 focus:ring-[#6366f1] transition-all resize-none'
              ></textarea>
            </div>
          </div>
          <div className='flex justify-center gap-4 mt-8'>
            <button
              onClick={() => setActiveModal(null)}
              className='px-8 py-2.5 border border-[#6366f1] text-[#6366f1] text-sm rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all '
            >
              Cancel
            </button>
            <button
              className='px-8 py-2.5 bg-[#6366f1] text-white  text-sm rounded-xl hover:bg-[#6366f1] transition-all shadow-xl shadow-indigo-500/20 '
              disabled={taskLoading || !taskData.taskName || !selectedJobId}
              onClick={handleCreateTask}
            >
              {taskLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
