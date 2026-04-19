
import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2, X, ChevronDown, GripVertical } from 'lucide-react';
import { templatesService } from '../services';
import { clientsService } from '../services/clientsService';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';

const Templates: React.FC = () => {
  const outletContext = useOutletContext<{ setActiveModal?: (modal: 'create' | 'edit' | 'useTemplate' | null) => void; activeModal?: 'create' | 'edit' | 'useTemplate' | null }>();
  const setActiveModalFromContext = outletContext?.setActiveModal;
  const activeModalFromContext = outletContext?.activeModal;
  const [activeModalLocal, setActiveModalLocal] = useState<'create' | 'edit' | 'useTemplate' | null>(null);
  const activeModal = activeModalFromContext !== undefined ? activeModalFromContext : activeModalLocal;
  const setActiveModal = (modal: 'create' | 'edit' | 'useTemplate' | null) => {
    if (setActiveModalFromContext) {
      setActiveModalFromContext(modal);
    } else {
      setActiveModalLocal(modal);
    }
  };
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Form State
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [tasks, setTasks] = useState<Array<{ name: string; description: string }>>([]);
  const [currentTaskName, setCurrentTaskName] = useState('');
  const [currentTaskDescription, setCurrentTaskDescription] = useState('');

  // Use Template State
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [jobDueDate, setJobDueDate] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchClients();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await templatesService.getTemplates();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await clientsService.getClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const addTask = () => {
    if (currentTaskName.trim()) {
      setTasks([...tasks, { name: currentTaskName, description: currentTaskDescription }]);
      setCurrentTaskName('');
      setCurrentTaskDescription('');
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = async () => {
    try {
      await templatesService.createTemplate({
        name: templateName,
        category: templateCategory,
        description: templateDescription,
        tasks: tasks.map((task, i) => ({
          ...task,
          sortOrder: i + 1,
        })),
      });
      await fetchTemplates();
      setActiveModal(null);
      resetForm();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await templatesService.updateTemplate(selectedTemplate.id, {
        name: templateName,
        category: templateCategory,
        description: templateDescription,
        tasks: tasks.map((task, i) => ({
          ...task,
          sortOrder: i + 1,
        })),
      });
      await fetchTemplates();
      setActiveModal(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    
    try {
      await templatesService.deleteTemplate(id);
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleUseTemplate = async () => {
    if (!selectedTemplate || !selectedClientId || !jobDueDate) return;
    
    try {
      await templatesService.createJobFromTemplate(selectedTemplate.id, {
        clientId: selectedClientId,
        dueDate: jobDueDate,
      });
      setActiveModal(null);
      alert('Job created successfully from template!');
    } catch (error) {
      console.error('Failed to create job from template:', error);
    }
  };

  const handleOpenEdit = (template: any) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateCategory(template.category || '');
    setTemplateDescription(template.description || '');
    setTasks(template.tasks || []);
    setActiveModal('edit');
  };

  const handleOpenUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setSelectedClientId('');
    setJobDueDate('');
    setActiveModal('useTemplate');
  };

  const resetForm = () => {
    setTemplateName('');
    setTemplateCategory('');
    setTemplateDescription('');
    setTasks([]);
    setSelectedTemplate(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 pb-16 animate-in fade-in duration-500">

      <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs text-slate-400 uppercase border-b border-slate-100">
            <tr>
              <th className="px-8 py-5">Template Name</th>
              {/* <th className="px-8 py-5">Job Name</th> */}
              <th className="px-8 py-5">Job Type</th>
              <th className="px-8 py-5">Task Count</th>
              <th className="px-8 py-5">Task List</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1] mx-auto"></div>
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-sm text-slate-400">
                  No templates found. Create your first template!
                </td>
              </tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="text-xs group hover:bg-slate-50 transition-all">
                  <td className="px-8 py-5 font-black text-slate-800">{t.name}</td>
                  <td className="px-8 py-5 text-slate-600 font-bold">{t.category || 'N/A'}</td>
                  <td className="px-8 py-5 text-slate-400 font-black uppercase tracking-wider">
                    {t.tasks?.length || 0} tasks
                  </td>
                  <td className="px-8 py-5 text-slate-400 font-bold truncate max-w-[280px]">
                    {t.tasks && t.tasks.length > 0 ? (
                      <ul className="mt-2">
                        {t.tasks.map(task => (
                          <li key={task.id} className="text-xs text-slate-700 mb-1">
                            <span className="font-bold"> - {task.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-500">No tasks added</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(t)}
                        className="p-2 text-slate-300 hover:text-[#6366f1] hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit size={16} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="p-2 text-slate-300 hover:text-[#e05252] hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
              </tr>
            ))
          )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(activeModal === 'create' || activeModal === 'edit') && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setActiveModal(null)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} strokeWidth={3} />
            </button>
            <div className="p-12 max-h-[85vh] overflow-y-auto scrollbar-hide">
              <h2 className="text-2xl font-black text-slate-800 text-center mb-12 tracking-tight">
                {activeModal === 'create' ? 'Create Template' : 'Edit Template'}
              </h2>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                <div className="space-y-1.5">
                  <label className="text-xs">Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter template name" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs focus:bg-white focus:ring-1 focus:ring-[#6366f1] outline-none transition-all text-slate-800" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs">Type</label>
                  <input 
                    type="text" 
                    placeholder="Enter template type" 
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs focus:bg-white focus:ring-1 focus:ring-[#6366f1] outline-none transition-all text-slate-800" 
                  />
                </div>

                {/* Added Tasks List */}
                {tasks.length > 0 && (
                  <div className="col-span-2 space-y-3">
                    <label className="text-xs">Added Tasks</label>
                    <div className="space-y-2">
                      {tasks.map((task, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 px-5 group hover:bg-white hover:shadow-md transition-all">
                          <GripVertical size={32} className="text-gray-600" />
                          <span className="text-xs font-black text-slate-700" style={{ minWidth: '150px', display: 'inline-block' }}>{task.name}</span>
                          {task.description && (
                            <span className="text-xs text-slate-500 ml-2">{task.description}</span>
                          )}
                          <button onClick={() => removeTask(i)} className="text-slate-300 hover:text-[#e05252] transition-colors">
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-span-2 space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <label className="text-xs">Add New Task</label>
                    <button 
                      onClick={addTask}
                      className=" text-[#6366f1] px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} strokeWidth={4} /> Add Task
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={currentTaskName}
                    onChange={(e) => setCurrentTaskName(e.target.value)}
                    placeholder="Enter task name" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs focus:ring-1 focus:ring-[#6366f1] outline-none text-slate-800 transition-all" 
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs">Task Details</label>
                  <textarea 
                    rows={3} 
                    value={currentTaskDescription}
                    onChange={(e) => setCurrentTaskDescription(e.target.value)}
                    placeholder="Write requirements for this task..." 
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-xs focus:ring-1 focus:ring-[#6366f1] outline-none resize-none text-slate-800 leading-relaxed transition-all"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-center gap-5 mt-12">
                <button onClick={() => setActiveModal(null)} className="px-12 py-3.5 border border-[#6366f1] text-[#6366f1] font-medium text-sm rounded-xl hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button
                  onClick={activeModal === 'create' ? handleCreateTemplate : handleUpdateTemplate}
                  className="px-12 py-3.5 bg-[#6366f1] text-white text-sm rounded-xl hover:bg-indigo-600 font-medium transition-all shadow-xl shadow-indigo-500/30 active:scale-95"
                >
                  {activeModal === 'create' ? 'Create Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Templates;
