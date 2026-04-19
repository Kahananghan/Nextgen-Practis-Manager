import React, { useState } from "react";
import { X } from "lucide-react";

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  initialData: { name?: string; email?: string; phone?: string; mobile?: string };
  onSave: (data: { name?: string; email?: string; phone?: string; mobile?: string }) => Promise<void>;
  loading: boolean;
  error: string;
  success: string;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onClose,
  initialData,
  onSave,
  loading,
  error,
  success,
}) => {
  const [form, setForm] = useState(initialData);
  const [localError, setLocalError] = useState("");

  React.useEffect(() => {
    setForm(initialData);
  }, [initialData, open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!form.name || !form.email) {
      setLocalError("Name and email are required.");
      return;
    }
    await onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors"
        >
         <X size={24} strokeWidth={3} />
        </button>
        <div className="p-16">
          <h2 className="text-3xl font-black text-slate-800 text-center mb-12 tracking-tight">Edit Profile</h2>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm">Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800"
                value={form.name || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800"
                value={form.email || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm">Mobile Number</label>
              <input
                type="text"
                name="mobile"
                placeholder="Enter your mobile number"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800"
                value={form.mobile || ""}
                onChange={handleChange}
              />
            </div>
            {localError && <div className="text-[#e05252] text-xs mb-2">{localError}</div>}
            {error && <div className="text-[#e05252] text-xs mb-2">{error}</div>}
            {success && <div className="text-green-600 text-xs mb-2">{success}</div>}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full py-4 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
