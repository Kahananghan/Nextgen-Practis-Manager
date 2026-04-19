
import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, Edit, Trash2, User } from 'lucide-react';
import { staffService } from '../services';

const Permissions: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [fullAccess, setFullAccess] = useState(false);
  const [permissions, setPermissions] = useState({
    jobsCreate: false,
    jobsView: false,
    jobsEdit: false,
    reportsCreate: false,
    reportsView: false,
    reportsEdit: false,
  });

  // Helper to map backend permission object to local state
  const mapBackendPermissions = (backendPerms: any) => {
    if (!backendPerms || typeof backendPerms !== 'object') return {
      jobsCreate: false,
      jobsView: false,
      jobsEdit: false,
      reportsCreate: false,
      reportsView: false,
      reportsEdit: false,
    };
    return {
      jobsCreate: backendPerms['jobs.create'] || false,
      jobsView: backendPerms['jobs.view'] || false,
      jobsEdit: backendPerms['jobs.edit'] || false,
      reportsCreate: backendPerms['reports.create'] || false,
      reportsView: backendPerms['reports.view'] || false,
      reportsEdit: backendPerms['reports.edit'] || false,
    };
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const handleTogglePermission = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    // Map local state to backend format
    const backendPermissions = {
      'jobs.create': permissions.jobsCreate,
      'jobs.view': permissions.jobsView,
      'jobs.edit': permissions.jobsEdit,
      'reports.create': permissions.reportsCreate,
      'reports.view': permissions.reportsView,
      'reports.edit': permissions.reportsEdit,
    };
    try {
      await staffService.updateStaff(selectedUserId, { permissions: backendPermissions });
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update permissions:', error);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-10 space-y-12">
        <div className="space-y-8">
          <h2 className="text-sm font-black text-slate-800">Add User Permission</h2>
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-4 space-y-2">
              <label className="text-xs ml-1">User</label>
              <div className="relative group">
                <select 
                  value={selectedUserId}
                  onChange={e => {
                    const userId = e.target.value;
                    setSelectedUserId(userId);
                    const user = users.find(u => u.id === userId);
                    if (user && user.permissions && typeof user.permissions === 'object') {
                      setPermissions(mapBackendPermissions(user.permissions));
                    } else {
                      setPermissions({
                        jobsCreate: false,
                        jobsView: false,
                        jobsEdit: false,
                        reportsCreate: false,
                        reportsView: false,
                        reportsEdit: false,
                      });
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold appearance-none focus:ring-2 focus:ring-[#6366f1] transition-all outline-none text-slate-700"
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="col-span-4 space-y-2">
              <label className="text-xs ml-1">Role</label>
              <input 
                type="text" 
                value={users.find(u => u.id === selectedUserId)?.role || ''}
                readOnly 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-400 outline-none" 
              />
            </div>
            
            <div className="col-span-12 space-y-8 mt-2">
              <h3 className="text-sm font-black ">User Permission</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-xs">Full Access</span>
                  {(() => {
                    const allChecked = Object.values(permissions).every(Boolean);
                    return (
                      <button
                        type="button"
                        className={`w-12 h-6 rounded-full relative transition-colors p-1 ${allChecked ? 'bg-[#6366f1]' : 'bg-slate-200'}`}
                        onClick={() => {
                          const newValue = !allChecked;
                          setPermissions(Object.fromEntries(
                            Object.keys(permissions).map(key => [key, newValue])
                          ));
                        }}
                        aria-label="Toggle full access"
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${allChecked ? 'bg-white right-1' : 'bg-white left-1'}`}
                          style={{ left: allChecked ? '30px' : '4px' }}
                        ></div>
                      </button>
                    );
                  })()}
                </div>

                {/* Jobs Permissions */}
                <div className="grid grid-cols-12 gap-8 items-center max-w-3xl">
                  <div className="col-span-2 text-xs ">Jobs</div>
                  <div className="col-span-10 flex gap-10">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.jobsCreate}
                        onChange={() => handleTogglePermission('jobsCreate')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs ">Create</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.jobsView}
                        onChange={() => handleTogglePermission('jobsView')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs ">View</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.jobsEdit}
                        onChange={() => handleTogglePermission('jobsEdit')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs ">Edit</span>
                    </label>
                  </div>
                </div>

                {/* Reports Permissions */}
                <div className="grid grid-cols-12 gap-8 items-center max-w-3xl">
                  <div className="col-span-2 text-xs">Reports</div>
                  <div className="col-span-10 flex gap-10">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.reportsCreate}
                        onChange={() => handleTogglePermission('reportsCreate')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs">Create</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.reportsView}
                        onChange={() => handleTogglePermission('reportsView')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs">View</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={permissions.reportsEdit}
                        onChange={() => handleTogglePermission('reportsEdit')}
                        className="w-5 h-5 border-2 border-slate-200 rounded-lg"
                      />
                      <span className="text-xs">Edit</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-span-12">
              <button
                className="px-12 py-3.5 bg-[#6366f1] text-white font-black rounded-2xl hover:bg-[#4f52d4] transition-all shadow-xl shadow-indigo-500/30 active:scale-[0.98]"
                onClick={handleSavePermissions}
                disabled={!selectedUserId}
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-50">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[11px] font-black text-slate-400 border-b border-slate-50">
                <tr>
                  <th className="px-8 py-6">Name</th>
                  <th className="px-8 py-6">Roles</th>
                  <th className="px-8 py-6">Permission</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar && user.avatar.trim() !== '' ? user.avatar : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name || 'User') + '&background=orange&color=fff'}
                          className="w-10 h-10 rounded-full border border-slate-200" 
                          alt={user.name || 'User'}
                        />
                        <span className="text-sm font-black text-slate-700">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-500">{user.role}</td>
                    <td className="px-8 py-5">
                      {user.permissions === 'Full Access' ? (
                        <div className="flex items-center gap-2 text-xs font-black text-[#6366f1]">
                          <Check size={14} /> Full Access
                        </div>
                      ) : Array.isArray(user.permissions) ? (
                        <div className="flex flex-col gap-1.5">
                          {user.permissions.map((perm: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                              <Check size={12} className="text-[#6366f1]" /> {perm}
                            </div>
                          ))}
                        </div>
                      ) : typeof user.permissions === 'object' && user.permissions !== null ? (
                        (() => {
                          const perms = user.permissions;
                          const jobs = [];
                          const reports = [];
                          if (perms['jobs.create']) jobs.push('Create');
                          if (perms['jobs.view']) jobs.push('View');
                          if (perms['jobs.edit']) jobs.push('Edit');
                          if (perms['reports.create']) reports.push('Create');
                          if (perms['reports.view']) reports.push('View');
                          if (perms['reports.edit']) reports.push('Edit');
                          return (
                            <div className="flex flex-col gap-1.5">
                              {jobs.length > 0 && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                  <span className="text-[#6366f1]">Jobs:</span> {jobs.map(j => (
                                    <span key={j} className="flex items-center gap-1"><Check size={12} className="text-[#6366f1]" /> {j}</span>
                                  ))}
                                </div>
                              )}
                              {reports.length > 0 && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                                  <span className="text-[#6366f1]">Reports:</span> {reports.map(r => (
                                    <span key={r} className="flex items-center gap-1"><Check size={12} className="text-[#6366f1]" /> {r}</span>
                                  ))}
                                </div>
                              )}
                              {jobs.length === 0 && reports.length === 0 && (
                                <span className="text-slate-400">No permissions</span>
                              )}
                            </div>
                          );
                        })()
                      ) : typeof user.permissions === 'string' ? (
                        <div className="flex flex-col gap-1.5">
                          {user.permissions.split(',').map((perm: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                              <Check size={12} className="text-[#6366f1]" /> {perm.trim()}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-4 py-1.5 rounded-full text-xs  ${
                        user.isActive === true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#e05252]'
                      }`}>
                        {user.isActive === true ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-2 text-slate-300 hover:text-[#6366f1] rounded-xl hover:bg-white transition-all"><Edit size={16} /></button>
                         <button className="p-2 text-slate-300 hover:text-[#e05252] rounded-xl hover:bg-white transition-all"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-8 border-t border-slate-50 flex items-center justify-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-100 text-[#6366f1] font-black text-xs">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 font-bold text-xs">2</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Permissions;
