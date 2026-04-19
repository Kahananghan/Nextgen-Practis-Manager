
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, ChevronDown } from 'lucide-react';
import { clientsService } from '../services/clientsService';

const AddContact: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    clientId: '',
    contactName: '',
    email: '',
    phone: '', 
    position: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsService.getClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      setFormData({ ...formData, phone: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (!formData.clientId || !formData.contactName) {
        setError('Client and contact name are required.');
        setLoading(false);
        return;
      }
      await clientsService.createContact(formData.clientId, {
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
      });
      navigate(-1);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-all">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Add New Contact</h1>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-[#6366f1] rounded-xl flex items-center justify-center">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Contact Details</h2>
              <p className="text-xs text-slate-400 font-medium">Link a new person to an existing client account.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Organization *</label>
              <div className="relative">
                <select 
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold appearance-none focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select client organization</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contact Name *</label>
                <input 
                  type="text" 
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  placeholder="Full name" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Position / Title</label>
                <input 
                  type="text" 
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g. Finance Manager" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@organization.com" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mobile / Phone</label>
                <input 
                  type="tel" 
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="+1 234 567 890" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6">
            <button 
              onClick={() => navigate(-1)}
              className="px-10 py-3 border-2 border-slate-100 text-slate-400 font-black rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95 text-[11px] uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-10 py-3 bg-[#6366f1] text-white font-black rounded-xl hover:bg-[#4f52d4] transition-all shadow-xl shadow-indigo-500/30 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={14} />
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddContact;
