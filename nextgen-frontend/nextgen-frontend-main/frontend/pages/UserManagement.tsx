
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  X, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { staffService, rolesService } from '../services';

const UserManagement: React.FC = () => {
  // Get setActiveModal from Outlet context if available
  const outletContext = useOutletContext<{ setActiveModal?: (modal: 'add' | 'edit' | null) => void; activeModal?: 'add' | 'edit' | null }>();
  const setActiveModalFromContext = outletContext?.setActiveModal;
  const activeModalFromContext = outletContext?.activeModal;

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    permissions: {
      'jobs.create': false,
      'jobs.view': false,
      'jobs.edit': false,
      'reports.create': false,
      'reports.view': false,
      'reports.edit': false,
    },
  });

  const [roles, setRoles] = useState<any[]>([]);
  // Local modal state, but use context value if present
  const [activeModalLocal, setActiveModalLocal] = useState<'add' | 'edit' | null>(null);
  const activeModal = activeModalFromContext !== undefined ? activeModalFromContext : activeModalLocal;

  // If setActiveModal is provided from context, use it, otherwise use local
  const setActiveModal = (modal: 'add' | 'edit' | null) => {
    if (setActiveModalFromContext) {
      setActiveModalFromContext(modal);
    } else {
      setActiveModalLocal(modal);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await rolesService.getRoles();
      setRoles(response.data?.roles || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await staffService.getStaff();
      setUsers(response.data.staff || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role || 'Staff',
      permissions: {
        'jobs.create': user.permissions?.['jobs.create'] || false,
        'jobs.view': user.permissions?.['jobs.view'] || false,
        'jobs.edit': user.permissions?.['jobs.edit'] || false,
        'reports.create': user.permissions?.['reports.create'] || false,
        'reports.view': user.permissions?.['reports.view'] || false,
        'reports.edit': user.permissions?.['reports.edit'] || false,
      },
    });
    setActiveModal('edit');
    setIsActionsMenuOpen(null);
  };

  const handleAddUser = async () => {
    try {
      // Ensure permissions is always defined
      const payload = {
        ...formData,
        permissions: formData.permissions || {},
      };
      await staffService.createStaff(payload);
      await fetchUsers();
      setActiveModal(null);
      resetForm();
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  };

  const handleUpdateUser = async () => {
    try {
      await staffService.updateStaff(editingUser.id, formData);
      await fetchUsers();
      setActiveModal(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    
    try {
      await staffService.deleteStaff(id);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      if (user.isActive) {
        await staffService.deactivateStaff(user.id);
      } else {
        await staffService.activateStaff(user.id);
      }
      await fetchUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Staff',
      permissions: {
        'jobs.create': false,
        'jobs.view': false,
        'jobs.edit': false,
        'reports.create': false,
        'reports.view': false,
        'reports.edit': false,
      },
    });
    setEditingUser(null);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500 pb-20">

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
              <tr>
                <th className="px-8 py-6">Name</th>
                <th className="px-8 py-6">Email</th>
                <th className="px-8 py-6">Roles</th>
                <th className="px-8 py-6">Active Jobs</th>
                <th className="px-8 py-6">Overdue Jobs</th>
                <th className="px-8 py-6">Assigned Jobs</th>
                <th className="px-8 py-6">Last Login</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1] mx-auto"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-8 py-12 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-200 bg-indigo-100 flex items-center justify-center text-sm font-black text-[#6366f1]">
                          {user.name?.charAt(0) || 'U'}
                        </div>
                        <span className="text-sm font-black text-slate-700">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm font-medium text-slate-500">{user.email}</td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-500">{user.role || 'Staff'}</td>
                    <td className="px-8 py-4 text-sm font-black text-slate-700">{user?.workload?.activeJobs || 0}</td>
                    <td className="px-8 py-4 text-sm font-black text-slate-700">{user?.workload?.overdueJobs || 0}</td>
                    <td className="px-8 py-4 text-sm font-black text-slate-700">{user?.workload?.totalJobs || 0}</td>
                    <td className="px-8 py-4 text-[11px] font-bold text-slate-400">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-8 py-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                          user.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-[#e05252] hover:bg-red-200'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="relative inline-block">
                        <button 
                          onClick={() => setIsActionsMenuOpen(isActionsMenuOpen === user.id ? null : user.id)}
                          className="p-2 text-slate-300 hover:text-slate-600 rounded-lg hover:bg-white transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {isActionsMenuOpen === user.id && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button 
                              onClick={() => handleEditClick(user)}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit size={14} className="text-slate-400" />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="w-full text-left px-4 py-2 text-xs font-bold text-[#e05252] hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-slate-50 flex items-center justify-center gap-2">
          <button className="p-2 text-slate-300 hover:text-slate-600"><ChevronLeft size={20} /></button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-100 text-[#6366f1] font-black text-xs">1</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 font-bold text-xs">2</button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 font-bold text-xs">3</button>
          <button className="p-2 text-slate-300 hover:text-slate-600"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Add User Modal (Screen 6) */}
      {activeModal === 'add' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setActiveModal(null)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} strokeWidth={3} />
            </button>
            <div className="p-16">
              <h2 className="text-3xl font-black text-slate-800 text-center mb-12 tracking-tight">Add User</h2>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm">User name</label>
                  <input
                    type="text"
                    placeholder="Enter user name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm  focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm">User email</label>
                  <input
                    type="email"
                    placeholder="Enter user email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm  focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-800"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm">Role</label>
                  <div className="relative group">
                    <div className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-800 cursor-pointer" onClick={() => setShowRoleDropdown(true)}>
                      {formData.role ? formData.role : 'Select role'}
                      <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {showRoleDropdown && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-40 overflow-y-auto z-50">
                        <div className="px-6 py-2 text-sm text-slate-400 cursor-pointer" 
                        onClick={() => { setFormData({ ...formData, role: '' }); 
                        setShowRoleDropdown(false); 
                        }}>
                          Select role
                        </div>
                        {roles.map(role => (
                          <div key={role.id} 
                          className="px-6 py-2 text-sm text-slate-800 hover:bg-indigo-50 cursor-pointer" 
                          onClick={async () => {
                            setFormData({ ...formData, role: role.name });
                            setShowRoleDropdown(false);
                          }}
                          >
                          {role.name}
                        </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="pt-6">
                  <button 
                    onClick={handleAddUser}
                    className="w-full py-4 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-[0.98]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit User Modal (Screen 7) */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300 !mt-0">
          <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden relative border border-slate-100 animate-in zoom-in-95 duration-300">
            <button onClick={() => setActiveModal(null)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors">
              <X size={24} strokeWidth={3} />
            </button>
            <div className="p-16">
              <h2 className="text-3xl font-black text-slate-800 text-center mb-12 tracking-tight">Edit User</h2>
              
              <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 ">User name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-700"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 ">User email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-[#6366f1] outline-none transition-all text-slate-700"
                  />
                </div>
                <div className="space-y-3 col-span-1">
                  <label className="text-xs font-black text-slate-500 ">Role</label>
                  <div className="relative group">
                    <div className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700 cursor-pointer" onClick={() => setShowRoleDropdown(true)}>
                      {formData.role ? formData.role : 'Select role'}
                      <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {showRoleDropdown && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg max-h-40 overflow-y-auto z-50">
                        <div className="px-6 py-2 text-sm text-slate-400 cursor-pointer" 
                        onClick={() => { setFormData({ ...formData, role: '' }); 
                        setShowRoleDropdown(false); 
                        }}>
                          Select role
                        </div>
                        {roles.map(role => (
                          <div key={role.id} 
                          className="px-6 py-2 text-sm text-slate-800 hover:bg-indigo-50 cursor-pointer" 
                          onClick={async () => {
                            setFormData({ ...formData, role: role.name });
                            setShowRoleDropdown(false);
                          }}
                          >
                          {role.name}
                        </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-span-2 space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 ">User Permission</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Full Access Toggle */}
                    {(() => {
                      const allChecked = Object.values(formData.permissions).every(Boolean);
                      return (
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-slate-600">Full Access</span>
                          <button
                            type="button"
                            className={`w-10 h-5 rounded-full relative transition-colors p-1 ${allChecked ? 'bg-[#6366f1]' : 'bg-slate-200'}`}
                            onClick={() => {
                              const newValue = !allChecked;
                              setFormData({
                                ...formData,
                                permissions: Object.fromEntries(
                                  Object.keys(formData.permissions).map(key => [key, newValue])
                                ),
                              });
                            }}
                            aria-label="Toggle full access"
                          >
                            <div
                              className={`absolute top-1 w-3 h-3 rounded-full transition-transform ${allChecked ? 'bg-white left-6' : 'bg-white left-1'}`}
                              style={{ left: allChecked ? '22px' : '4px' }}
                            ></div>
                          </button>
                        </div>
                      );
                    })()}

                    {/* Jobs Permissions */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 text-xs font-bold text-slate-600">Jobs</div>
                      <div className="col-span-9 flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['jobs.create']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'jobs.create': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">Create</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['jobs.view']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'jobs.view': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['jobs.edit']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'jobs.edit': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">Edit</span>
                        </label>
                      </div>
                    </div>

                    {/* Reports Permissions */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3 text-xs font-bold text-slate-600">Reports</div>
                      <div className="col-span-9 flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['reports.create']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'reports.create': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">Create</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['reports.view']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'reports.view': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions['reports.edit']}
                            onChange={e => setFormData({
                              ...formData,
                              permissions: {
                                ...formData.permissions,
                                'reports.edit': e.target.checked,
                              },
                            })}
                          />
                          <span className="text-xs font-bold text-slate-500">Edit</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-6 mt-16">
                <button onClick={() => setActiveModal(null)} className="px-14 py-4 border-2 border-[#c7d2fe] text-[#6366f1] font-black rounded-2xl hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                <button 
                  onClick={handleUpdateUser} 
                  className="px-14 py-4 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-2xl shadow-indigo-500/30 active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
