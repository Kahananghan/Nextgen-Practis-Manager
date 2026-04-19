import React, { useState, useEffect } from 'react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Calendar,
  Filter,
  Download,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Eye,
  CheckSquare,
  FileText,
  Edit,
  FilePlus,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { dashboardService, alertsService } from '../services'
import { clientsService } from '../services/clientsService';
import { jobsService } from '../services/jobsService'
import { DelegateModal, NoteModal, TaskModal } from '../components/Dashboard'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [activeModal, setActiveModal] = useState<'delegate' | 'task' | null>(null)
  const [actionsMenuOpen, setActionsMenuOpen] = useState<number | null>(null)

  // API State
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<any[]>([])

  // Chart Data
  const [statusData, setStatusData] = useState<any[]>([])
  const [completionTrendData, setCompletionTrendData] = useState<any[]>([]);
  const [creationTrendData, setCreationTrendData] = useState<any[]>([]);

  // selected job task creation
  const [selectedJobId, setSelectedJobId] = useState<string | number | null>(null)
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null)
   
  // Delegate loading and error state
  const [delegateLoading, setDelegateLoading] = useState(false);
  const [delegateError, setDelegateError] = useState<string | null>(null);
  const [delegateSuccess, setDelegateSuccess] = useState<string | null>(null);

  // Add Notes State
  const [notesData, setNotesData] = useState({ note: '' })
  const [fetchedNote, setFetchedNote] = useState([])

  // Alerts State
  const [alerts, setAlerts] = useState<any[]>([]);


  // Clients State
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 days');
  
  // Map dropdown value to days
  const getDaysForRange = (range) => {
    if (range === 'Last 30 days') return 30;
    if (range === 'Last 7 days') return 7;
    if (range === 'Last 6 months') return 180;
    return 30;
  };

  const filteredJobs = jobs.filter((job) => {
    // Client filter
    const matchesClient = selectedClientId
      ? String(job.client?.id) === String(selectedClientId)
      : true;

    // Date filter (only createdAt)
    const jobDate = job.createdAt;
    if (!jobDate) return matchesClient;

    const days = getDaysForRange(selectedDateRange);
    const now = new Date();
    const jobTime = new Date(jobDate);
    if (isNaN(jobTime.getTime())) {
      console.log('Invalid job createdAt:', jobDate, job);
      return false;
    }
    const diffInDays = (now - jobTime) / (1000 * 60 * 60 * 24);
    //console.log('Job:', job.name, 'createdAt:', jobDate, 'diffInDays:', diffInDays);
    const matchesDate = diffInDays <= days;

    return matchesClient && matchesDate;
  });


  const hasFetched = useRef(false)
  // Modal State
  const [delegateData, setDelegateData] = useState({
    jobName: 'Monthly Bookkeeping',
    jobType: 'Bookkeeping',
    delegateTo: '',
    dueDate: '2025-09-30',
    priority: 'Medium',
    comments: ''
  })

  const [taskData, setTaskData] = useState({
    taskName: '',
    taskDetails: ''
  })

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    fetchDashboardData()
      fetchClients();
  }, [])

   // Fetch all clients for filter dropdown
    const fetchClients = async () => {
      try {
        const response = await clientsService.getClients();
        setClients(response.data.clients || []);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [overviewRes, jobsByStateRes, chartsRes, upcomingRes] =
        await Promise.all([
          dashboardService.getOverview(),
          dashboardService.getJobsByState(),
          dashboardService.getCharts(),
          dashboardService.getUpcomingJobs()
        ])

      setOverview(overviewRes.data)

      // Transform jobs by state for pie chart
      if (jobsByStateRes.data) {
        const colorMap: any = {
          Complete: '#22c55e',
          'In Progress': '#6366f1',
          'On Hold': '#e05252',
          Planned: '#94a3b8'
        }

        setStatusData(
          jobsByStateRes.data.map((item: any) => ({
            name: item.state,
            value: item.count,
            color: colorMap[item.state] || '#94a3b8'
          }))
        )
      }

      // Transform completionTrend and creationTrend for new charts
      const completionTrendData = chartsRes.data.completionTrend
        ? chartsRes.data.completionTrend.map((item: any) => ({
            name: new Date(item.date).toLocaleDateString(),
            value: item.completed
          }))
        : [];
      const creationTrendData = chartsRes.data.creationTrend
        ? chartsRes.data.creationTrend.map((item: any) => ({
            name: new Date(item.date).toLocaleDateString(),
            value: item.created
          }))
        : [];
      setCompletionTrendData(completionTrendData);
      setCreationTrendData(creationTrendData);

      setUpcomingJobs(upcomingRes.data.jobs || [])

      // Fetch all jobs for the table
      const jobsRes = await jobsService.getJobs({ limit: 20 })
      setJobs(jobsRes.data.jobs || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Merge completionTrendData and creationTrendData by date for combined chart
  const mergedTrendData = (() => {
    const map: { [date: string]: { name: string; completed?: number; created?: number } } = {};
    completionTrendData.forEach(item => {
      map[item.name] = { name: item.name, completed: item.value };
    });
    creationTrendData.forEach(item => {
      if (map[item.name]) {
        map[item.name].created = item.value;
      } else {
        map[item.name] = { name: item.name, created: item.value };
      }
    });
    return Object.values(map).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  })();

  const sidebarJobs = upcomingJobs.slice(0, 3)

   // Handle create task for selected job
  const handleCreateTask = async () => {
    if (!selectedJobId || !taskData.taskName) return;
    setTaskLoading(true);
    setTaskError(null);
    setTaskSuccess(null);
    try {
      await jobsService.addTask(selectedJobId, {
        name: taskData.taskName,
        description: taskData.taskDetails
      });
      setTaskSuccess('Task created successfully!');
      setTaskData({ taskName: '', taskDetails: '' });
    } catch (err: any) {
      setTaskError(err?.response?.data?.message || 'Failed to create task');
    } finally {
      setTaskLoading(false);
    }
  };

   // Handle delegate job
  const handleDelegateJob = async () => {
    if (!selectedJobId || !delegateData.delegateTo) return;
    setDelegateLoading(true);
    setDelegateError(null);
    setDelegateSuccess(null);
    try {
      await jobsService.assignJob(selectedJobId, delegateData.delegateTo);
      setDelegateSuccess('Job delegated successfully!');
      setActiveModal(null);
      fetchDashboardData();
    } catch (err) {
      setDelegateError('Failed to delegate job');
    } finally {
      setDelegateLoading(false);
    }
  };

    // Handle save notes for selected job
    const handleSaveNotes = async () => {
      if (!selectedJobId || !notesData.note) return;
      try {
        await jobsService.createNotes(selectedJobId, notesData.note);
        // Fetch the latest notes after saving
        const res = await jobsService.getNotes(selectedJobId);
        setFetchedNote(res.data.notes || []);
        setNotesData({ note: '' }); // Clear input after success
      } catch (err) {
        console.error('Failed to save notes:', err);
      }
    };

    // Fetch note for selected job when opening notes modal
    useEffect(() => {
      if (activeModal === 'notes' && selectedJobId) {
        jobsService.getNotes(selectedJobId)
          .then(res => {
            setFetchedNote(res.data.notes || []);
            setNotesData({ note: '' }); // Clear editing state
          })
          .catch(() => {
            setFetchedNote([]);
            setNotesData({ note: '' });
          });
      }
    }, [activeModal, selectedJobId]);


  // Fetch alerts 
  const fetchAlerts = async () => {
    try {
      const res = await alertsService.getAlerts();
      setAlerts(res.data?.alerts || []);
    } catch (err) {
      setAlerts([]);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading dashboard...</p>
        </div>
      </div>
    )
  }


  return (
    <div className='max-w-[1600px] mx-auto space-y-5 pb-16 relative'>
      {/* Filters Bar */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <select
              className='appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6366f1] text-slate-700'
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
            >
              <option value=''>All clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
          </div>
          <div className='relative'>
            <select
              className='appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#6366f1] text-slate-700'
              value={selectedDateRange}
              onChange={e => setSelectedDateRange(e.target.value)}
            >
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 6 months</option>
            </select>
            <ChevronDown
              size={12}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none'
            />
          </div>
        </div>
        {/* <button className='flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors'>
          Export <Download size={12} />
        </button> */}
      </div>

      <div className='grid grid-cols-12 gap-5 items-start'>
        {/* Main Content */}
        <div className='col-span-9 space-y-5'>
         {/* All Client Summary */}
        <div className="bg-white rounded-xl border border-[#c7d2fe] p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800 mb-4">All Client Summary</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-[#6366f1] p-3 rounded-full">
                <Users size={20} className="text-white" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Aggregated Client Summary
                </h3>
                <p className="text-xs text-slate-400">
                  Showing combined metrics for all clients.
                </p>
              </div>
            </div>

            <div className="flex gap-10 items-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Briefcase className="text-blue-500" size={18} />
                  <span className="text-xs font-medium">Total Jobs</span>
                </div>
                <span className="text-lg font-bold mt-1">{overview?.jobs?.total || 0}</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <Clock className="text-[#6366f1]" size={18} />
                  <span className="text-xs font-medium">Active</span>
                </div>
                <span className="text-lg font-bold mt-1">{overview?.jobs?.active || 0}</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-[#1d9e75]" size={18} />
                  <span className="text-xs font-medium">Completed</span>
                </div>
                <span className="text-lg font-bold mt-1">{overview?.jobs?.completed || 0}</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-[#e05252]" size={18} />
                  <span className="text-xs font-medium">Overdue</span>
                </div>
                <span className="text-lg font-bold mt-1">{overview?.jobs?.overdue || 0}</span>
              </div>
            </div>
          </div>
        </div>

          {/* Table - LONGER & SCROLLABLE */}
          <div className='bg-white rounded-xl border border-[#c7d2fe] overflow-hidden shadow-sm flex flex-col'>
            <div className='px-5 py-3 border-b border-[#c7d2fe] bg-slate-50/50 flex justify-between items-center'>
              <h3 className='text-lg font-black text-slate-800'>
                Job List
              </h3>
              <span className='text-[10px] font-bold text-slate-400'>
                {filteredJobs.length} total entries
              </span>
            </div>
            <div className='overflow-y-auto max-h-[500px] scrollbar-hide'>
              <table className='w-full text-left table-fixed'>
               <thead className="sticky top-0 z-10 text-xs text-slate-400  uppercase">
                <tr>
                <th className="px-6 py-3 w-48">Client Name</th>
                <th className="px-6 py-3 w-44">Job Name</th>
                <th className="px-6 py-3">Job Type</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3 w-32">Status</th>
                <th className="px-6 py-3">Assigned</th>
                <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
                <tbody className='divide-y divide-slate-50'>
                  {filteredJobs.map((job) => (
                    <React.Fragment key={job.id}>
                     <tr className="text-xs hover:bg-slate-50 transition-colors cursor-pointer" >

                      <td className="px-6 py-3 flex items-center gap-2 w-48">

                      <span className="font-bold text-slate-800">
                      {job.client?.name || "N/A"}
                      </span>
                      </td>

                      <td className="px-6 py-3 font-semibold text-slate-600 w-44">
                      {job.name}
                      </td>

                      <td className="px-6 py-3 ">
                      {job.jobType || job.category || "N/A"}
                      </td>

                      <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                      job.priority === "High"
                      ? "bg-red-100 text-[#e05252]"
                      : job.priority === "Medium"
                      ? "bg-orange-100 text-[#d97706]"
                      : "bg-slate-100 text-slate-600"
                      }`}>
                      {job.priority}
                      </span>
                      </td>

                      <td className="px-6 py-3 text-slate-500">
                      {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : "N/A"}
                      </td>

                      <td className="px-6 py-3">
                      <span
                      className={`px-2 py-1 rounded-full text-[10px] w-32 font-bold ${
                      job.state === "Complete"
                      ? "bg-green-100 text-green-700"
                      : job.state === "In Progress"
                      ? "bg-[#eef2ff] text-[#6366f1]"
                      : job.state === "On Hold"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600"
                      }`}
                      >
                      {job.state}
                      </span>
                      </td>

                      <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600">
                      {job.assignedStaff?.name || "Unassigned"}
                      </span>
                      </div>
                      </td>

                      <td className="px-6 py-3 text-center">
                          <div className="relative inline-block">
                            {/* Three Dot Button */}
                            <button
                              className="p-1 hover:bg-slate-200 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsMenuOpen(actionsMenuOpen === job.id ? null : job.id);
                              }}
                            >
                              <MoreVertical size={16} className="text-slate-500" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionsMenuOpen === job.id && (
                              <div className="absolute right-0 top-full mt-2 bg-white border border-[#c7d2fe] shadow-xl rounded-xl py-2 z-20 w-44">
                                <button
                                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  onClick={() => {
                                    navigate(`/job/${job.id}`);
                                    setActionsMenuOpen(null);
                                  }}
                                >
                                  <Eye size={14} className="text-slate-400" />
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setTaskData({
                                      taskName: '',
                                      taskDetails: ''
                                    });
                                    setSelectedJobId(job.id);
                                    setTaskError(null);
                                    setTaskSuccess(null);
                                    setActiveModal('task');
                                  }}
                                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <CheckSquare size={14} className="text-slate-400" />
                                  Create Task
                                </button>
                                  <button
                                    onClick={() => {
                                      navigate(`/edit-job/${job.id}`);
                                      setActionsMenuOpen(null);
                                    }}
                                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Edit size={14} className="text-slate-400" />
                                    Edit Job
                                  </button>
                                <button
                                  onClick={() => {
                                    setDelegateData({
                                      jobName: job.name,
                                      jobType: job.jobType,
                                      delegateTo: '',
                                      dueDate: job.dueDate,
                                      priority: job.priority,
                                      comments: ''
                                    });
                                    setSelectedJobId(job.id);
                                    setActiveModal('delegate');
                                  }}
                                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Users size={14} className="text-slate-400" />
                                  Delegate
                                </button>
                               <button
                                onClick={() => {
                                  setSelectedJobId(job.id);
                                  setNotesData({
                                    note: ''
                                  });
                                  setActiveModal('notes');
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <FileText size={14} className="text-slate-400" />
                                Add Notes
                              </button>
                              <button
                                onClick={() => {
                                  navigate(`/document-requests/${job.id}`);
                                  setActionsMenuOpen(null);
                                }}
                                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <FilePlus size={14} className="text-slate-400" />
                                Make Requests
                              </button>
                              </div>
                            )}
                          </div>
                        </td>

                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Charts - ACCESSIBLE BY SCROLLING */}
          <div className='grid grid-cols-2 gap-5 pt-4'>
            <div className="bg-white p-6 rounded-xl border border-[#c7d2fe] shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">
            Jobs by Status
            </h3>

            <div className="flex items-center justify-between p-8">


            <div className="w-[160px] h-[160px] flex items-center justify-center">
              {statusData && statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      innerRadius={40}
                      outerRadius={75}
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400">No data available</span>
              )}
            </div>


            {/* Legend - show raw value, not percent */}
            <div className="space-y-3">
              {statusData.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-slate-800 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>

            </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-[#c7d2fe] shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
              Jobs Completion & Creation Per Day
              </h3>

            <div className="h-56 ">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mergedTrendData} >
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={tick => Math.round(tick)}
                    domain={[0, 'dataMax']}
                    allowDecimals={false}
                  />
                  <Bar
                    dataKey="completed"
                    fill="#22c55e"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                    name="Completed"
                    stroke="none"
                  />
                  <Bar
                    dataKey="created"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    barSize={20}
                    name="Created"
                    stroke="none"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend for Completed and Created */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-xs text-slate-700 font-semibold">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6366f1' }}></div>
                <span className="text-xs text-slate-700 font-semibold">Created</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className='col-span-3 space-y-5 sticky top-0'>
          <div className='bg-white rounded-xl border border-[#c7d2fe] shadow-sm p-4'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-lg font-black text-slate-800'>
                Job List
              </h3>
            </div>
            <div className='space-y-3'>
              {sidebarJobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Briefcase size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium mb-1">No jobs available</p>
                  <p className="text-xs text-slate-400">Create your first job to get started</p>
                  <button
                    onClick={() => navigate('/create-job')}
                    className="mt-3 px-4 py-2 bg-indigo-500 text-white text-xs font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Create Job
                  </button>
                </div>
              ) : (
                sidebarJobs.map((j) => (
                  <div
                    key={j.id}
                    className='bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h4 className='text-[11px] font-black text-slate-800 w-3/4 leading-tight group-hover:text-indigo-600 transition-colors'>
                        {j.name}
                      </h4>
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${j.state === 'In Progress' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {j.state}
                      </span>
                    </div>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest'>
                        <Calendar size={9} className='text-slate-300' /> Due:{' '}
                        <span className='text-slate-700'>
                          {j.dueDate
                            ? new Date(j.dueDate).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest'>
                        <User size={9} className='text-slate-300' /> By:{' '}
                        <span className='text-slate-700'>
                          {j.assignedStaff || 'Unassigned'}
                        </span>
                      </div>
                      <div className='flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest'>
                        <Briefcase size={9} className='text-slate-300' /> Priority:{' '}
                        <span className={`text-slate-700 ${j.priority === 'High' ? 'text-[#e05252]' : j.priority === 'Medium' ? 'text-[#6366f1]' : 'text-slate-500'}`}>{j.priority}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#c7d2fe] shadow-sm overflow-hidden">
  
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">
                Alerts & Reminders
              </h3>
            </div>

            {/* Alerts List */}
            <div className="p-4 space-y-4">
              {alerts.length === 0 ? (
                <div className="text-xs text-slate-400">No alerts or reminders</div>
              ) : (
                alerts.map((alert, idx) => {
                  let Icon = AlertCircle;
                  let bgColor = "bg-red-50";
                  let textColor = "text-[#e05252]";
                  if (alert.type === "due_soon") {
                    Icon = Clock;
                    bgColor = "bg-yellow-50";
                    textColor = "text-yellow-600";
                  } else if (alert.type === "completed") {
                    Icon = CheckCircle;
                    bgColor = "bg-green-50";
                    textColor = "text-green-600";
                  }
                  return (
                    <div className="flex gap-3 items-center" key={idx}>
                      <div className={`w-8 h-8 ${bgColor} ${textColor} rounded-lg flex items-center justify-center shrink-0`}>
                        <Icon size={18}/>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{alert.job_name || "General Alert"}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${bgColor} ${textColor}`}>
                            {alert.type.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {alert.formatted_due_date && (
                            <span className=" text-[10px] text-slate-400">(Due: {alert.formatted_due_date})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delegate Modal */}
      {activeModal === 'delegate' && (
        <DelegateModal
          delegateData={delegateData}
          setDelegateData={setDelegateData}
          jobs={jobs}
          selectedJobId={selectedJobId}
          delegateLoading={delegateLoading}
          setActiveModal={setActiveModal}
          handleDelegateJob={handleDelegateJob}
        />
      )}

      {/* Task Modal */}
      {activeModal === 'task' && (
        <TaskModal
          jobs={jobs}
          selectedJobId={selectedJobId}
          taskData={taskData}
          setTaskData={setTaskData}
          taskLoading={taskLoading}
          setActiveModal={setActiveModal}
          handleCreateTask={handleCreateTask}
        />
      )}

      {activeModal === 'notes' && (
        <NoteModal
          notesData={notesData}
          setNotesData={setNotesData}
          fetchedNote={fetchedNote}
          setActiveModal={setActiveModal}
          handleSaveNotes={handleSaveNotes}
        />
      )}
    </div>
  )
}

export default Dashboard
