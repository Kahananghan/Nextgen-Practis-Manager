import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  Search, 
  Star, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Users,
  Edit,
  Trash2,
  FilePlus
} from 'lucide-react';
import { clientsService } from '../services/clientsService';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [favouriteClients, setFavouriteClients] = useState<any[]>([]);

  useEffect(() => {
    fetchClients();
    fetchFavouriteClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientJobs(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const response = await clientsService.getClients();
      setClients(response.data.clients || []);
      if (response.data.clients && response.data.clients.length > 0) {
        setSelectedClient(response.data.clients[0]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavouriteClients = async () => {
    try {
      const response = await clientsService.getFavouriteClients();
      setFavouriteClients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch favourite clients:', error);
    }
  };

  const fetchClientJobs = async (clientId: string) => {
    try {
      const response = await clientsService.getClientJobs(clientId);
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch client jobs:', error);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditJob = (id: number) => {
    navigate(`/edit-job/${id}`);
    setOpenActionMenu(null);
  };

  // Handler to toggle favourite status
  const handleToggleFavouriteClient = async (clientId: string) => {
    try {
      const isFav = favouriteClients.some((fav: any) => fav.id === clientId);
      if (isFav) {
        await clientsService.removeFavouriteClient(clientId);
      } else {
        await clientsService.addFavouriteClient(clientId);
      }
      fetchClients();
      fetchFavouriteClients();
    } catch (err) {
      console.error('Failed to toggle favourite client:', err);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "text-[#e05252] font-semibold";
      case "medium":
        return "text-[#6366f1] font-semibold";
      case "low":
        return "text-[#1d9e75] font-semibold";
      case "normal":
        return "text-slate-500 font-semibold";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in progress":
        return "bg-indigo-100 text-[#6366f1]";
      case "not started":
        return "bg-gray-100 text-gray-500";
      case "overdue":
        return "bg-red-100 text-red-600";
      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-500">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto"></div>
        </div>
      ) : (
        <>
          {/* CLIENT DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="bg-white border border-slate-100 rounded-lg px-3.5 py-2 flex items-center gap-2.5 text-xs font-black text-slate-700 shadow-sm hover:border-slate-300 transition-all uppercase tracking-wider"
            >
              {selectedClient ? selectedClient.name : 'SELECT CLIENTS'}
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="p-3 border-b border-slate-50 flex items-center gap-2 bg-[#f5f5ff]">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Client"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-xs font-black focus:ring-0 outline-none text-slate-600 uppercase tracking-wider"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto py-1.5">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                          {client.name.charAt(0)}
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {client.name}
                        </span>
                      </div>

                      <Star
                        size={14}
                        className={
                          favouriteClients.some((fav: any) => fav.id === client.id)
                            ? 'text-indigo-400 fill-indigo-400'
                            : 'text-slate-200'
                        }
                        style={{ cursor: 'pointer' }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleToggleFavouriteClient(client.id);
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* JOB TABLE */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl min-h-[500px] flex flex-col overflow-hidden">
            {selectedClient ? (
              <>
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-black text-slate-400 uppercase border-b border-[#c7d2fe]">
                      <tr>
                        <th className="px-8 py-5">Job Name</th>
                        <th className="px-8 py-5">Job Type</th>
                        <th className="px-8 py-5">Assigned To</th>
                        <th className="px-8 py-5">Priority</th>
                        <th className="px-8 py-5">Due Date</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5">Progress</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-50">
                      {jobs.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-8 py-12 text-center text-sm text-slate-400"
                          >
                            No jobs found for this client
                          </td>
                        </tr>
                      ) : (
                        jobs.map((job, idx) => (
                          <tr key={job.id} className="hover:bg-slate-50 transition">

                            {/* JOB NAME */}
                            <td className="px-8 py-5 text-sm font-semibold text-slate-700">
                              {job.name}
                            </td>

                            {/* JOB TYPE */}
                            <td className="px-8 py-5 text-sm text-slate-500">
                              {job.jobType || job.category || "N/A"}
                            </td>

                            {/* ASSIGNED USER */}
                            <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={`https://i.pravatar.cc/40?img=${idx + 10}`}
                                    className="w-8 h-8 rounded-full"
                                  />
                                  <span className="text-sm text-slate-700">
                                    {job.assignedStaffName || "Unassigned"}
                                  </span>
                                </div>
                              </td>

                              {/* PRIORITY */}
                              <td className={`px-8 py-5 text-sm ${getPriorityStyle(job.priority)}`}>
                                {job.priority}
                              </td>

                              {/* DUE DATE */}
                              <td className="px-8 py-5 text-sm text-slate-500">
                                {job.dueDate
                                  ? new Date(job.dueDate).toLocaleDateString()
                                  : "N/A"}
                              </td>

                              {/* STATUS BADGE */}
                              <td className="px-8 py-5">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                                    job.state
                                  )}`}
                                >
                                  {job.state}
                                </span>
                              </td>

                              {/* PROGRESS BAR */}
                              <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full ${
                                        job.progress === 100
                                          ? "bg-[#1d9e75]"
                                          : job.progress > 60
                                          ? "bg-[#6366f1]"
                                          : "bg-indigo-400"
                                      }`}
                                      style={{ width: `${job.progress || 0}%` }}
                                    />
                                  </div>

                                  <span className="text-sm text-slate-500">
                                    {job.progress || 0}%
                                  </span>
                                </div>
                              </td>

                              {/* ACTION MENU */}
                              <td className="px-8 py-5 text-right relative">
                                <button
                                  onClick={() =>
                                    setOpenActionMenu(openActionMenu === idx ? null : idx)
                                  }
                                  className="p-1 hover:bg-slate-100 rounded"
                                >
                                  <MoreVertical size={16} />
                                </button>

                                {openActionMenu === idx && (
                                  <div className="absolute right-0 top-8 w-40 bg-white border rounded-lg shadow-lg z-20">
                                    <button
                                      onClick={() => handleEditJob(job.id)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm w-full hover:bg-slate-50"
                                    >
                                      <Edit size={14} />
                                      Edit Job
                                    </button>

                                    <button
                                      onClick={() => {
                                        navigate(`/document-requests/${job.id}`);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center gap-2 px-4 py-2 text-sm w-full hover:bg-slate-50"
                                    >
                                      <FilePlus size={14} />
                                      Make Requests
                                    </button>

                                    <button className="flex items-center gap-2 px-4 py-2 text-sm w-full text-[#e05252] hover:bg-red-50">
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION */}
                <div className="p-6 border-t border-[#c7d2fe] flex items-center justify-center gap-2">
                  <button>
                    <ChevronLeft size={18} />
                  </button>
                  <button className="w-7 h-7 bg-indigo-100 text-[#6366f1] text-[10px] rounded-lg">
                    1
                  </button>
                  <button className="w-7 h-7 text-[10px]">2</button>
                  <button className="w-7 h-7 text-[10px]">3</button>
                  <button>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                <Users size={100} className="text-slate-200 mb-6" />
                <h2 className="text-3xl font-black text-slate-800 uppercase">
                  Search and Select Client
                </h2>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Clients;