import React from 'react';
import { X, ChevronDown } from 'lucide-react';

interface DelegateModalProps {
  delegateData: any;
  setDelegateData: (data: any) => void;
  jobs: any[];
  selectedJobId: string | number | null;
  delegateLoading: boolean;
  setActiveModal: (modal: any) => void;
  handleDelegateJob: () => void;
}

const DelegateModal: React.FC<DelegateModalProps> = ({
  delegateData,
  setDelegateData,
  jobs,
  selectedJobId,
  delegateLoading,
  setActiveModal,
  handleDelegateJob
}) => {
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
          <h2 className='text-xl font-black text-center mb-10 tracking-tight'>
            Job Delegate
          </h2>
          <div className='grid grid-cols-2 gap-x-6 gap-y-6'>
            <div className='space-y-1.5'>
              <label className='text-xs'>Job Name</label>
              <input
                type='text'
                value={delegateData.jobName}
                onChange={(e) => setDelegateData({ ...delegateData, jobName: e.target.value })}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#6366f1] outline-none transition-all'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs '>Job Type</label>
              <input
                type='text'
                value={delegateData.jobType}
                onChange={(e) => setDelegateData({ ...delegateData, jobType: e.target.value })}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:ring-1 focus:ring-[#6366f1] outline-none transition-all'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs  '>Current Assignee</label>
              <div className='flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5'>
                {(() => {
                  const job = jobs.find(j => String(j.id) === String(selectedJobId));
                  return (
                    <>
                      <img
                        src={job?.assignedStaff?.avatarUrl || 'https://picsum.photos/seed/alice/24/24'}
                        className='w-5 h-5 rounded-full'
                      />
                      <span className='text-[11px] text-slate-700'>
                        {job?.assignedStaff?.name || 'Unassigned'}
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs  '>Delegate To</label>
              <div className='relative'>
                <select
                  value={delegateData.delegateTo}
                  onChange={(e) => setDelegateData({ ...delegateData, delegateTo: e.target.value })}
                  className='w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold appearance-none outline-none focus:ring-1 focus:ring-[#6366f1] transition-all text-slate-700'
                >
                  <option value=''>Select assignee</option>
                  {Array.from(new Set(jobs.map(j => j.assignedStaff?.id && j.assignedStaff?.name ? JSON.stringify({id: j.assignedStaff.id, name: j.assignedStaff.name}) : null).filter(Boolean))).map((staffStr) => {
                    const staff = JSON.parse(staffStr);
                    return (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    );
                  })}
                </select>
                <ChevronDown
                  size={14}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs  '>Due Date</label>
              <input
                type='date'
                value={delegateData.dueDate}
                onChange={(e) => setDelegateData({ ...delegateData, dueDate: e.target.value })}
                className='w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-[#6366f1] transition-all'
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs  '>Priority</label>
              <div className='relative'>
                <select
                  value={delegateData.priority}
                  onChange={(e) => setDelegateData({ ...delegateData, priority: e.target.value })}
                  className='w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-bold appearance-none outline-none focus:ring-1 focus:ring-[#6366f1] transition-all text-slate-700'
                >
                  <option>Medium</option>
                  <option>High</option>
                  <option>Low</option>
                </select>
                <ChevronDown
                  size={14}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
                />
              </div>
            </div>
            <div className='col-span-2 space-y-1.5'>
              <label className='text-xs  '>Comments / Notes</label>
              <textarea
                rows={3}
                value={delegateData.comments}
                onChange={(e) => setDelegateData({ ...delegateData, comments: e.target.value })}
                placeholder='Add any special instructions'
                className='w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#6366f1] transition-all resize-none'
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
              className='px-8 py-2.5 bg-[#6366f1] text-white text-sm rounded-xl hover:bg-[#4f52d4] transition-all shadow-xl shadow-indigo-500/20 '
              disabled={!delegateData.delegateTo || delegateLoading}
              onClick={handleDelegateJob}
            >
              {delegateLoading ? 'Delegating...' : 'Delegate Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DelegateModal;
