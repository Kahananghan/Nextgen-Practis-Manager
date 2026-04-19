
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ChevronDown, 
  Plus, 
  ArrowLeft
} from 'lucide-react';
import { jobsService } from '../services/jobsService';
import { clientsService } from '../services/clientsService';
import { staffService } from '../services';

const EditJob: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
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
    managerId: '',
    template: '',
    contact: '',
    orderNo: '',
    sentVia: '',
    excludeFromBillings: false,
    jobNotes: '',
    partner: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

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

  const fetchData = async () => {
    try {
      const [jobRes, clientsRes, staffRes] = await Promise.all([
        jobsService.getJobById(id!),
        clientsService.getClients(),
        staffService.getStaff(),
      ]);
      
      const job = jobRes.data;
      setFormData({
        clientId: job.client?.id || job.clientId || '',
        name: job.name || '',
        description: job.description || '',
        budget: job.budget ? job.budget.toString() : '',
        state: job.state || 'Planned',
        category: job.category || '',
        startDate: job.startDate ? job.startDate.split('T')[0] : (job.start_date ? job.start_date.split('T')[0] : ''),
        dueDate: job.dueDate ? job.dueDate.split('T')[0] : (job.due_date ? job.due_date.split('T')[0] : ''),
        priority: job.priority || 'Normal',
        assignedStaffId: job.assignedStaff?.id || job.assignedStaffId || '',
        managerId: job.manager?.id || job.managerId || '',
        template: job.template || '',
        contact: job.contact || '',
        orderNo: job.orderNo || job.order_no || '',
        sentVia: job.sentVia || job.sent_via || '',
        excludeFromBillings: typeof job.excludeFromBillings !== 'undefined' ? job.excludeFromBillings : (typeof job.exclude_from_billings !== 'undefined' ? job.exclude_from_billings : false),
        jobNotes: job.jobNotes || job.job_notes || '',
        partner: job.partner || '',
      });
      
      setClients(clientsRes.data.clients || []);
      setStaff(staffRes.data.staff || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load job data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateJob = async () => {
    setError('');
    setSaving(true);
    
    try {
      const jobData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      };
      
      await jobsService.updateJob(id!, jobData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1]"></div>
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-4 mt-2">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-all">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Edit Job: {formData.name}</h1>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        {/* Job Information Section */}
        <div className="p-10 space-y-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Job Information</h2>
          </div>

          <div className="grid grid-cols-12 gap-x-8 gap-y-8">
            {/* Client */}
            <div className="col-span-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client</label>
                <button 
                  onClick={() => navigate('/add-client')}
                  className="text-[#6366f1] text-[10px] font-black flex items-center gap-1.5 hover:text-[#6366f1] transition-colors uppercase tracking-widest"
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
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            {/* Contact */}
            <div className="col-span-4 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</label>
                <button 
                  onClick={() => navigate('/add-contact')}
                  className="text-[#6366f1] text-[10px] font-black flex items-center gap-1.5 hover:text-[#6366f1] transition-colors uppercase tracking-widest"
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
  
                  {[
                    "Monthly Bookkeeping",
                    "Quarterly BAS",
                    "Annual Company Tax Return",
                    "Annual Audit",
                  ].map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-4 cursor-pointer group p-2 rounded-xl transition-all hover:bg-white ${
                        formData.template === option ? "ring-2 ring-indigo-200" : ""
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Hidden Native Radio */}
                        <input
                          type="radio"
                          name="template"
                          value={option}
                          checked={formData.template === option}
                          onChange={(e) => {
                            handleChange(e);
                            setShowTemplate(false);
                          }}
                          className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full transition-all checked:border-[#6366f1]"
                        />
  
                        {/* Inner Dot */}
                        <div className="absolute w-2.5 h-2.5 bg-[#6366f1] rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200"></div>
                      </div>
  
                      <span
                        className={`text-xs font-black transition-colors ${
                          formData.template === option
                            ? "text-[#6366f1]"
                            : "text-slate-600 group-hover:text-slate-900"
                        }`}
                      >
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Job Name and Order No */}
            <div className="col-span-8 grid grid-cols-2 gap-x-8 gap-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Name</label>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Order No.</label>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Budget</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">State</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Information Sent Via</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job Notes</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Partner</label>
              <div className="relative group">
                <input
                  type="text"
                  name="partner"
                  value={formData.partner}
                  onChange={handleChange}
                  placeholder="Enter partner name"
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                />
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manager</label>
              <div className="relative group">
                <select 
                  name="managerId"
                  value={formData.managerId}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select manager</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Staff</label>
              <div className="relative group">
                <select 
                  name="assignedStaffId"
                  value={formData.assignedStaffId}
                  onChange={handleChange}
                  className="w-full bg-white border border-slate-100 rounded-2xl py-3 px-5 text-xs font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select staff</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-6 mt-16 pb-6">
            <button 
              onClick={() => navigate(-1)}
              className="px-14 py-3 border-2 border-[#c7d2fe] text-[#6366f1] font-black rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateJob}
              className="px-14 py-3 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-95 text-xs uppercase tracking-widest"
            >
              Update Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditJob;
