import React, { useState } from "react";
import { Edit, Shield, Phone} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import ChangePasswordModal from "../components/Profile/ChangePasswordModal";
import EditProfileModal from "@/components/Profile/EditProfileModal";

const Profile: React.FC = () => {
  const { user } = useAuth();

  // State for change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // State for edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Handler for change password
  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordLoading(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPasswordSuccess("Password changed successfully.");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess("");
      }, 1200);
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handler for edit profile
  const handleEditProfile = async (data: { name?: string; email?: string; phone?: string; mobile?: string }) => {
    setEditError("");
    setEditSuccess("");
    setEditLoading(true);
    try {
      await authService.changeProfile(data);
      setEditSuccess("Profile updated successfully.");
      Object.assign(user, data);
      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccess("");
      }, 1200);
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setEditLoading(false);
    }
  };


  return (
    <div className="max-w-[1500px] mx-auto p-6 space-y-6">

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[#c7d2fe] shadow-sm">

        {/* Top Section */}
        <div className="flex items-center justify-between p-6">

          <div className="flex items-center gap-4">

            {/* Avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-[#6366f1]">
                {user?.name?.charAt(0) || "U"}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#1d9e75] border-2 border-white rounded-full"></span>
            </div>

            {/* Name + Email */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  {user?.name}
                </h2>
                {user?.roles && user.roles.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-[#6366f1] font-medium">
                    {user.roles[0]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs mt-2 text-slate-500">
                {user?.email}
              </div>
            </div>

            {/* Edit Button */}
          <button
            className="flex items-center gap-2 text-xs px-3 py-1.5 ml-2 border rounded-md hover:bg-slate-50"
            onClick={() => {
              setShowEditModal(true);
              setEditError("");
              setEditSuccess("");
            }}
          >
            <Edit size={14} />
            Edit
          </button>

          <EditProfileModal
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            initialData={{ name: user?.name, email: user?.email, phone: user?.phone, mobile: user?.mobile }}
            onSave={handleEditProfile}
            loading={editLoading}
            error={editError}
            success={editSuccess}
          />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#c7d2fe]"></div>

        {/* Account Security */}
        <div className="p-6 space-y-6">

          <h3 className="text-sm font-semibold text-slate-800">
            Account Security
          </h3>

          {/* Password */}
          <div className="flex flex-row gap-6 items-end w-full">
            <div className="flex-1 max-w-sm">
              <label className="text-xs text-slate-500">Password</label>
              <input
                type="password"
                value="********"
                readOnly
                className="mt-1 w-full bg-slate-100 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              />
            </div>
            <div className="flex-shrink-0">
              <button
                className="flex items-center gap-2 border rounded-md px-3 py-2 text-xs hover:bg-slate-50"
                onClick={() => {
                  setShowPasswordModal(true);
                  setPasswordError("");
                  setPasswordSuccess("");
                }}
              >
                <Shield size={14} />
                Change Password
              </button>
            </div>
          </div>
          <ChangePasswordModal
            open={showPasswordModal}
            onClose={() => setShowPasswordModal(false)}
            onChangePassword={handleChangePassword}
            loading={passwordLoading}
            error={passwordError}
            success={passwordSuccess}
          />

          {/* Mobile */}
          <div className="flex flex-row gap-6 items-end w-full">
            <div className="flex-1 max-w-sm">
              <label className="text-xs text-slate-500">Mobile Number</label>
              <input
                type="text"
                value={user?.mobile || "+61 471 322 971"}
                readOnly
                className="mt-1 w-full bg-slate-100 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              />
            </div>
            <div className="flex-shrink-0">
              <button
                className="flex items-center gap-2 border rounded-md px-3 py-2 text-xs hover:bg-slate-50"
                onClick={() => {
                  setShowEditModal(true);
                  setEditError("");
                  setEditSuccess("");
                }}
              >
                <Phone size={14} />
                Change Mobile Number
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;