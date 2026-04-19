import React from 'react';

interface NoteModalProps {
	notesData: { note: string };
	setNotesData: (data: { note: string }) => void;
	fetchedNote: Array<{ id: string | number; note: string; created_at?: string }>;
	setActiveModal: (modal: string | null) => void;
	handleSaveNotes: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({
	notesData,
	setNotesData,
	fetchedNote,
	setActiveModal,
	handleSaveNotes,
}) => (
	<div className='fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300'>
		<div className='bg-white rounded-[24px] w-full max-w-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300'>
			<button
				onClick={() => setActiveModal(null)}
				className='absolute right-6 top-6 text-slate-300 hover:text-slate-600 transition-colors'
			>
				{/* @ts-ignore */}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
			</button>
			<div className='p-10'>
				<h2 className='text-xl font-black text-center mb-10 tracking-tight'>
					Add Notes
				</h2>
				<div className='space-y-6'>
					<div className='space-y-1.5'>
						<label className='text-xs font-bold text-[#6366f1]'>All Notes</label>
						<div className='w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-[13px] text-[#6366f1] min-h-[80px] font-semibold'>
							{Array.isArray(fetchedNote) && fetchedNote.length > 0 ? (
								<div className="max-h-[220px] overflow-y-auto">
									{fetchedNote.map(n => (
										<div key={n.id} className="mb-4 pb-2 border-b border-[#c7d2fe] border-indigo-200 last:border-b-0">
											<div className="text-[#6366f1] text-[13px] font-semibold">{n.note}</div>
											<div className="text-xs text-indigo-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
										</div>
									))}
								</div>
							) : (
								<span className='text-slate-400'>No note added yet.</span>
							)}
						</div>
					</div>
					<div className='space-y-1.5'>
						<label className='text-xs'>Notes</label>
						<textarea
							rows={4}
							value={notesData.note}
							onChange={e => setNotesData({ note: e.target.value })}
							placeholder='Write your notes here...'
							className='w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-[#6366f1] transition-all resize-none'
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
						className='px-8 py-2.5 bg-[#6366f1] text-white text-sm rounded-xl hover:bg-[#6366f1] transition-all shadow-xl shadow-indigo-500/20 '
						disabled={!notesData.note}
						onClick={handleSaveNotes}
					>
						Save Notes
					</button>
				</div>
			</div>
		</div>
	</div>
);

export default NoteModal;
