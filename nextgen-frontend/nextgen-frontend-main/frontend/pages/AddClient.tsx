
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { clientsService } from '../services/clientsService';

const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    
    try {
      await clientsService.createClient({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address ? { street: formData.address } : undefined,
      });
      navigate('/clients');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-all">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-lg font-black text-slate-800 tracking-tight">Add New Client</h1>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-10 space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-[#6366f1] rounded-xl flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Organization Details</h2>
              <p className="text-xs text-slate-400 font-medium">Register a new client entity in the system.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {error && (
              <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Client Name *</label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Acme Corp Industries" 
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="client@example.com" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+61 400 000 000" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Address</label>
              <input 
                type="text" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Business St, Sydney NSW 2000" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700" 
              />
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
              disabled={loading || !formData.name}
              className="px-10 py-3 bg-[#6366f1] text-white font-black rounded-xl hover:bg-[#4f52d4] disabled:bg-indigo-300 transition-all shadow-xl shadow-indigo-500/30 active:scale-95 text-[11px] uppercase tracking-widest flex items-center gap-2"
            >
              <Save size={14} />
              {loading ? 'Saving...' : 'Save Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddClient;
