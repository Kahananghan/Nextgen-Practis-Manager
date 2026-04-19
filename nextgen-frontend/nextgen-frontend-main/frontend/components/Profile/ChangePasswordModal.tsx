import React, { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
  onChangePassword,
  loading,
  error,
  success,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    if (!oldPassword || !newPassword || !confirmPassword) {
      setLocalError("All fields are required.");
      return;
    }
    if (oldPassword === newPassword) {
      setLocalError("New password must be different from the current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("New passwords do not match.");
      return;
    }
    await onChangePassword(oldPassword, newPassword);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] w-full max-w-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
        <button
          onClick={() => {
            onClose();
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setLocalError("");
          }}
          className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors"
        >
          <X size={24} strokeWidth={3} />
        </button>
        <div className="p-16">
          <h2 className="text-3xl font-black text-slate-800 text-center mb-12 tracking-tight">Change Password</h2>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm">Current Password</label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  onClick={() => setShowOld(v => !v)}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  onClick={() => setShowNew(v => !v)}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {localError && <div className="text-[#e05252] text-xs mb-2">{localError}</div>}
            {error && <div className="text-[#e05252] text-xs mb-2">{error}</div>}
            {success && <div className="text-green-600 text-xs mb-2">{success}</div>}
            <div className="pt-6">
              <button
                type="submit"
                onClick={handleSubmit}
                className="w-full py-4 bg-[#6366f1]  text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
