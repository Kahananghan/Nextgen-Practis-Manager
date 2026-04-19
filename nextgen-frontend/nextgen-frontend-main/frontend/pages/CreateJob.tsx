
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Plus
} from 'lucide-react';
import { jobsService } from '../services/jobsService';
import { clientsService } from '../services/clientsService';
import { staffService } from '../services';
import { templatesService } from '../services';

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    description: '',
    budget: '',
    state: 'Planned',
    category: '',
    startDate: '',
    dueDate: '',
    priority: 'Normal',
    assignedStaffId: '',
    managerId: ''
  });

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceData, setRecurrenceData] = useState({
    frequency: 'monthly',
    intervalDaysBeforeDue: 5,
    autoAssignToSameStaff: true,
    requireReviewBeforeCompletion: false,
    useSameTemplateTasks: true,
    notifyAssigneeOnCreation: true,
    notifyManagerOnCreation: false
  });
  const [recurrencePreview, setRecurrencePreview] = useState<string>('');

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Fetch contacts when clientId changes
  useEffect(() => {
    if (formData.clientId) {
      clientsService.getContacts(formData.clientId)
        .then(res => setContacts(res.data))
        .catch(() => setContacts([]));
    } else {
      setContacts([]);
    }
  }, [formData.clientId]);

  const fetchDropdownData = async () => {
    try {
      const [clientsRes, staffRes, templatesRes] = await Promise.all([
        clientsService.getClients(),
        staffService.getStaff(),
        templatesService.getTemplates(),
      ]);
      setClients(clientsRes.data.clients || []);
      setStaff(staffRes.data.staff || []);
      setTemplates(templatesRes.data?.templates || templatesRes.data || []); // Handle both response formats
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
      setTemplates([]); // Ensure templates is always an array
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      template: template.name,
    }));
    setShowTemplate(false);
  };

  const handleCreateJob = async () => {
    setError('');
    setLoading(true);
    
    try {
      const jobData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        recurrence: recurrenceEnabled ? {
          enabled: true,
          ...recurrenceData,
          createdBy: null // Will be set by backend from authenticated user
        } : undefined
      };
      
      await jobsService.createJob(jobData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  // Recurrence handlers
  const handleRecurrenceToggle = () => {
    setRecurrenceEnabled(!recurrenceEnabled);
    if (!recurrenceEnabled) {
      // Enable recurrence - update preview
      updateRecurrencePreview();
    }
  };

  const handleRecurrenceChange = (field: string, value: any) => {
    setRecurrenceData(prev => ({
      ...prev,
      [field]: value
    }));
    // Update preview immediately when any recurrence setting changes
    setTimeout(updateRecurrencePreview, 0);
  };

  const updateRecurrencePreview = () => {
    if (!formData.dueDate || !recurrenceEnabled) return;
    
    // Create manual preview since we can't call API without a real job
    const frequencyMap: {[key: string]: string} = { 
      weekly: 'weekly', 
      monthly: 'monthly', 
      quarterly: 'quarterly', 
      biannual: 'every 6 months', 
      yearly: 'yearly' 
    };
    
    const previewText = `Auto-creates ${frequencyMap[recurrenceData.frequency]}, ${recurrenceData.intervalDaysBeforeDue} days before due date — ${recurrenceData.autoAssignToSameStaff ? 'assigns to same staff' : 'creates unassigned for manual assignment'} — ${recurrenceData.notifyAssigneeOnCreation ? 'notifies by email' : 'no email notifications'}`;
    setRecurrencePreview(previewText);
  };

  // Update preview when recurrence is enabled or any recurrence data changes
  useEffect(() => {
    if (recurrenceEnabled) {
      updateRecurrencePreview();
    }
  }, [recurrenceEnabled, recurrenceData.frequency, recurrenceData.intervalDaysBeforeDue, recurrenceData.autoAssignToSameStaff, recurrenceData.notifyAssigneeOnCreation]);

  return (
    <div className="w-full  pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mt-2">
        {/* Job Information Section */}
        <div className="p-10 space-y-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Job Information</h2>
          </div>

          <div className="grid grid-cols-12 gap-x-8 gap-y-8">
            {/* Client */}
            <div className="col-span-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 ">Client</label>
                <button 
                  onClick={() => navigate('/add-client')}
                  className="text-[#6366f1] text-xs font-black flex items-center gap-1.5 hover:text-[#4f52d4] transition-colors "
                >
                  <Plus size={10} strokeWidth={4} /> Add Client
                </button>
              </div>
              <div className="relative group">
                <select 
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            {/* Contact */}
            <div className="col-span-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-slate-500 ">Contact</label>
                <button 
                  onClick={() => navigate('/add-contact')}
                  className="text-[#6366f1] text-xs font-black flex items-center gap-1.5 hover:text-[#4f52d4] transition-colors "
                >
                  <Plus size={10} strokeWidth={4} /> Add Contact
                </button>
              </div>
              <div className="relative group">
                <select 
                  name="contact"
                  value={formData.contact || ''}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                  disabled={!formData.clientId}
                >
                  <option value="">{formData.clientId ? (contacts.length ? 'Select contact' : 'No contacts found') : 'Select client first'}</option>
                  {contacts.map((contact: any) => (
                    <option key={contact.id} value={contact.name}>{contact.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

           {/* Template Dropdown */}
          <div className="col-span-4 space-y-3 relative">

            <label className="text-xs font-black text-slate-500">
              Template
            </label>

            {/* Click Field */}
            <div
              onClick={() => setShowTemplate(!showTemplate)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold flex justify-between items-center cursor-pointer hover:bg-white transition"
            >
              <span className={formData.template ? "text-slate-700" : "text-slate-400"}>
                {formData.template || "Select template"}
              </span>

              <ChevronDown
                size={16}
                className={`transition-transform ${showTemplate ? "rotate-180" : ""}`}
              />
            </div>

            {/* Radio Dropdown */}
            {showTemplate && (
              <div className="absolute z-20 mt-2 w-full bg-white border border-slate-100 rounded-3xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {loadingTemplates ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs text-slate-500 mt-2">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-500">No templates found</p>
                  </div>
                ) : (
                  templates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-center gap-4 cursor-pointer group p-2 rounded-xl transition-all hover:bg-white ${
                        formData.template === template.name ? "ring-2 ring-[#c7d2fe]" : ""
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Hidden Native Radio */}
                        <input
                          type="radio"
                          name="template"
                          value={template.name}
                          checked={formData.template === template.name}
                          onChange={() => handleTemplateSelect(template)}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full transition-all checked:border-[#6366f1]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className={`w-3 h-3 rounded-full border-2 border-slate-300 transition-all ${
                            formData.template === template.name 
                              ? 'border-[#6366f1] bg-[#6366f1] scale-100' 
                              : 'bg-white scale-0'
                          }`}></div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{template.name}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

            {/* Job Name and Order No */}
            <div className="col-span-8 grid grid-cols-2 gap-x-8 gap-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 ">Job Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter Job name" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-500 ">Client Order No.</label>
                <input 
                  type="text" 
                  name="orderNo"
                  value={formData.orderNo}
                  onChange={handleChange}
                  placeholder="Enter client order no." 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
              <div className="col-span-2 space-y-3">
                <label className="text-xs font-black text-slate-500 ">Description</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4} 
                  placeholder="Enter description" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none resize-none text-slate-700 leading-relaxed"
                ></textarea>
              </div>
            </div>


            {/* Budget, State, Category */}
            <div className="col-span-4 space-y-3">
              <label className="text-xs font-black text-slate-500 ">Budget</label>
              <input 
                type="text" 
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget (e.g. 500)" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none text-slate-700" 
              />
            </div>
            <div className="col-span-4 space-y-3">
              <label className="text-xs font-black text-slate-500 ">State</label>
              <div className="relative group">
                <select 
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option>Planned</option>
                  <option>In Progress</option>
                  <option>On Hold</option>
                  <option>Complete</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="col-span-4 space-y-3">
              <label className="text-xs font-black text-slate-500 ">Category</label>
              <div className="relative group">
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select category</option>
                  <option>Advisory</option>
                  <option>Compliance</option>
                  <option>Audit</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            <div className="col-span-4 space-y-3">
              <label className="text-xs font-black text-slate-500">Information Sent Via</label>
              <div className="relative group">
                <select 
                  name="sentVia"
                  value={formData.sentVia}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select value</option>
                  <option>Email</option>
                  <option>Portal</option>
                  <option>Phone</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="col-span-4"></div>
            <div className="col-span-4 flex items-center gap-4 pt-8">
              <input 
                type="checkbox" 
                id="exclude"
                name="excludeFromBillings"
                checked={formData.excludeFromBillings}
                onChange={handleChange}
                className="w-5 h-5 rounded-lg border-2 border-slate-200 text-[#6366f1] focus:ring-[#6366f1] transition-all cursor-pointer"
              />
              <label htmlFor="exclude" className="text-xs text-slate-600 font-bold cursor-pointer select-none">Exclude from estimated billings</label>
            </div>

            <div className="col-span-12 space-y-3">
              <label className="text-xs font-black text-slate-500 ">Job Notes</label>
              <textarea 
                name="jobNotes"
                value={formData.jobNotes}
                onChange={handleChange}
                rows={4} 
                placeholder="Enter any additional job notes or special instructions" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 px-6 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none resize-none text-slate-700 leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Schedule Information Section */}
        <div className="p-10 border-t border-slate-50 bg-slate-50/20">
          <h2 className="text-xl font-black text-slate-800 mb-10 tracking-tight">Schedule Information</h2>
          
          <div className="grid grid-cols-3 gap-x-8 gap-y-10">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Start Date</label>
              <div className="relative group">
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Due Date</label>
              <div className="relative group">
                <input 
                  type="date" 
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Priority</label>
              <div className="relative group">
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Partner</label>
              <div className="relative group">
                <select 
                  name="partner"
                  value={formData.partner}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select partner</option>
                  <option>John Carter</option>
                  <option>Sarah Miller</option>
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Manager</label>
              <div className="relative group">
                <select 
                  name="managerId"
                  value={formData.managerId}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select manager</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 ">Assigned Staff</label>
              <div className="relative group">
                <select 
                  name="assignedStaffId"
                  value={formData.assignedStaffId}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select staff</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Recurrence Section */}
        <div className="p-10 col-span-12 space-y-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xl font-black text-slate-800 mb-10 tracking-tight">Recurrence</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Enable recurring</span>
              <div 
                onClick={handleRecurrenceToggle}
                className={`w-[38px] h-[20px] rounded-[10px] cursor-pointer relative transition-colors duration-200 ${
                  recurrenceEnabled ? 'bg-[#6366f1]' : 'bg-[#ccc]'
                }`}
              >
                <div 
                  className={`w-[16px] h-[16px] bg-white rounded-full absolute top-[2px] transition-all duration-200 ${
                    recurrenceEnabled ? 'left-[20px]' : 'left-[2px]'
                  }`}
                />
              </div>
            </div>
          </div>

          <div 
            className={`transition-opacity duration-200 ${
              recurrenceEnabled ? 'opacity-100 pointer-events-auto' : 'opacity-35 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Repeat every</label>
                <select 
                  value={recurrenceData.frequency}
                  onChange={(e) => handleRecurrenceChange('frequency', e.target.value)}
                  className="w-full p-2 border border-[#c7d2fe] rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-[#6366f1] outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="biannual">Every 6 months</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Auto-create</label>
                <select 
                  value={recurrenceData.intervalDaysBeforeDue}
                  onChange={(e) => handleRecurrenceChange('intervalDaysBeforeDue', parseInt(e.target.value))}
                  className="w-full p-2 border border-[#c7d2fe] rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-[#6366f1] outline-none"
                >
                  <option value={3}>3 days before due date</option>
                  <option value={5}>5 days before due date</option>
                  <option value={7}>7 days before due date</option>
                  <option value={14}>14 days before due date</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1.5">Auto-assign to</label>
                <select 
                  value={recurrenceData.autoAssignToSameStaff ? 'same' : 'manual'}
                  onChange={(e) => handleRecurrenceChange('autoAssignToSameStaff', e.target.value === 'same')}
                  className="w-full p-2 border border-[#c7d2fe] rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-[#6366f1] outline-none"
                >
                  <option value="same">Same staff member</option>
                  <option value="manual">Re-assign manually</option>
                </select>
              </div>
            </div>

            <div className="flex gap-6 mb-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  checked={recurrenceData.notifyAssigneeOnCreation}
                  onChange={(e) => handleRecurrenceChange('notifyAssigneeOnCreation', e.target.checked)}
                  className="accent-[#6366f1]" 
                /> Notify assignee on creation
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  checked={recurrenceData.useSameTemplateTasks}
                  onChange={(e) => handleRecurrenceChange('useSameTemplateTasks', e.target.checked)}
                  className="accent-[#6366f1]" 
                /> Use same template tasks
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  checked={recurrenceData.requireReviewBeforeCompletion}
                  onChange={(e) => handleRecurrenceChange('requireReviewBeforeCompletion', e.target.checked)}
                  className="accent-[#6366f1]" 
                /> Require review before completion
              </label>
            </div>

            <div className="bg-[#f5f5ff] border border-[#c7d2fe] rounded-lg p-3 flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-xs text-slate-500">Next job:</span>
              <span className="text-xs text-slate-600 font-medium">
                {recurrencePreview || `Auto-creates ${recurrenceData.frequency}, ${recurrenceData.intervalDaysBeforeDue} days before due date — ${recurrenceData.autoAssignToSameStaff ? 'assigns to same staff' : 'creates unassigned for manual assignment'} — ${recurrenceData.notifyAssigneeOnCreation ? 'notifies by email' : 'no email notifications'}`}
              </span>
            </div>
          </div>
        </div>
                    
        <div className="flex justify-center items-center gap-6 mt-16 pb-6">
          <button 
            onClick={() => navigate(-1)}
            className="px-14 py-3 border-2 border-[#c7d2fe] text-[#6366f1] font-black rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 text-xs "
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateJob}
            className="px-14 py-3 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-95 text-xs "
          >
            Create Job
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateJob;
