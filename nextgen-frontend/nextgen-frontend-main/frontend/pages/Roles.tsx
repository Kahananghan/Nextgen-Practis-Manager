
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Edit, Trash2, Plus, UserCircle } from 'lucide-react';
import { rolesService } from '@/services';

const Roles: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await rolesService.getRoles();
        setRoles(response.data?.roles || []);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
      }
    };
    fetchRoles();
  }, []);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setLoading(true);
    try {
      const response = await rolesService.createRole({ name: newRoleName });
      // Refetch roles after creation
      const updated = await rolesService.getRoles();
      setRoles(updated.data?.roles || []);
      setNewRoleName('');
    } catch (error) {
      console.error('Failed to create role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    try {
      await rolesService.deleteRole(id);
      // Refetch roles after deletion
      const updated = await rolesService.getRoles();
      setRoles(updated.data?.roles || []);
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 p-10 space-y-8">
       <div>
          <h2 className="text-sm font-semibold mb-4">Add New Role</h2>

          <p className="text-xs font-semibold text-slate-400 mb-1">Role Name</p>

          <div className="flex gap-3"> 
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="E.g. Senior Accountant"
                className="w-full max-w-md h-10 px-4 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
              />

            <button
              onClick={handleCreateRole}
              disabled={loading || !newRoleName.trim()}
              className="h-10 px-6 bg-[#6366f1] text-white text-sm font-medium rounded-lg hover:bg-[#4f52d4] disabled:bg-indigo-300 transition"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        <div className="pt-10 border-t border-slate-100">
          <h2 className="text-sm font-bold mb-10">Role Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roles.map((role) => (
              <div key={role.id} className="bg-white border border-[#c7d2fe] rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all group relative">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800">{role.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400">
                    <UserCircle size={16} />
                    {Array.isArray(role.users) && role.users.length > 0 ? (
                      <span className="text-[11px] font-bold">
                        Users Assigned:
                        <span className="text-slate-700 font-black ml-1">
                          {role.users.map((user: any) => user.name || user.email).join(', ')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold">
                        Users Assigned: <span className="text-slate-700 font-black ml-1">{role.userCount || 0}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2.5 text-slate-300 hover:text-[#6366f1] hover:bg-indigo-50 rounded-xl transition-all"><Edit size={16} /></button>
                  <button 
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-2.5 text-slate-300 hover:text-[#e05252] hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roles;
