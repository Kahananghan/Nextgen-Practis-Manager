import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import DocumentRequestModal from './DocumentRequestModal';
import TimeTrackingJob from './TimeTrackingJob';
import { jobsService } from '../../services/jobsService';
import { clientsService } from '../../services/clientsService';
import documentRequestsService from '../../services/documentRequestsService';
import { timeTrackingService } from '../../services/timeTrackingService';
import { useTimer } from '../../context/TimerContext';
import { useAuth } from '../../context/AuthContext';

interface DocumentRequest {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'uploaded' | 'pending' | 'overdue';
  reminderSent?: string;
  reminderCount?: number;
  fileName?: string;
  fileUrl?: string;
}

interface DocumentRequestsPanelProps {
  jobId?: string;
}

const DocumentRequestsPanel: React.FC<DocumentRequestsPanelProps> = () => {
  const { id: routeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'tasks' | 'docs' | 'notes' | 'time'>('docs');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);
  const [showReminderConfirmModal, setShowReminderConfirmModal] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<{count: number} | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [sentReminderId, setSentReminderId] = useState<string | null>(null);
  const [sendingResendId, setSendingResendId] = useState<string | null>(null);
  const [sentResendId, setSentResendId] = useState<string | null>(null);
  const [job, setJob] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);

  // Use timer context
  const { isTimerRunning, timerSeconds, setIsTimerRunning, setTimerSeconds } = useTimer();

  // Fetch time entries
  const fetchTimeEntries = async () => {
    const targetJobId = routeId;
    if (!targetJobId) return;
    
    try {
      const response = await timeTrackingService.getTimeEntries(targetJobId);
      const entries = response.data?.entries || [];
      setTimeEntries(entries);
    } catch (error) {
      console.error('Failed to fetch time entries:', error);
    }
  };

  // Calculate total logged hours and format as hours and minutes with role-based filtering
  const getTotalLogged = (): string => {
    // Apply role-based filtering to time entries
    const filteredEntries = timeEntries.filter((entry: any) => {
      // If user is admin or manager, show all entries
      if (user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') {
        return true;
      }
      // Otherwise, only show entries created by the current user
      return entry.user_id === user?.id;
    });
    
    const totalMinutes = filteredEntries.reduce((total, entry) => {
      return total + (entry.duration_minutes || 0);
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Fetch job and client data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (routeId) {
        const jobResponse = await jobsService.getJobById(routeId);
        setJob(jobResponse.data);
        
        // Use client data from job response
        if (jobResponse.data.client) {
          setClient(jobResponse.data.client);
        } else {
          console.log('No client data found in job response');
        }
      }
      
      // Fetch document requests
      const documentsResponse = await documentRequestsService.getDocumentRequests({
        jobId: routeId
      });
      setDocuments(documentsResponse.data.map(doc => 
        documentRequestsService.formatDocumentRequestForDisplay(doc)
      ));

      // Fetch notes
      try {
        const notesResponse = await jobsService.getNotes(routeId);
        const notesData = notesResponse.data?.notes || notesResponse.data || [];
        setNotes(notesData);
      } catch (notesError) {
        console.error('Failed to fetch notes:', notesError);
        setNotes([]);
      }

      // Fetch time entries
      fetchTimeEntries();
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [routeId]);

  const stats = {
    total: documents.length,
    uploaded: documents.filter(doc => doc.status === 'uploaded').length,
    pending: documents.filter(doc => doc.status === 'pending').length,
    overdue: documents.filter(doc => doc.status === 'overdue').length
  };

  const sendReminder = async (docId: string) => {
    setSendingReminderId(docId);
    try {
      await documentRequestsService.sendReminder(docId);
      
      // Update UI to show reminder sent
      setDocuments(prev => prev.map(doc => 
        doc.id === docId 
          ? { ...doc, reminderSent: new Date().toLocaleDateString(), reminderCount: (doc.reminderCount || 0) + 1 }
          : doc
      ));
      
      // Show "Sent" feedback
      setSendingReminderId(null);
      setSentReminderId(docId);
      setTimeout(() => {
        setSentReminderId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to send reminder:', error);
      setSendingReminderId(null);
    }
  };

  const sendRemindersToAll = async () => {
    try {
      setSendingReminders(true);
      
      // Get all documents that are not uploaded (pending or overdue)
      const nonUploadedDocs = documents.filter(doc => doc.status !== 'uploaded');
      
      if (nonUploadedDocs.length === 0) {
        setReminderSuccess({count: 0});
        setSendingReminders(false);
        return;
      }
      
      // Send reminders for all non-uploaded documents
      const reminderPromises = nonUploadedDocs.map(doc => 
        documentRequestsService.sendReminder(doc.id)
      );
      
      await Promise.all(reminderPromises);
      
      // Update UI to show reminders sent
      setDocuments(prev => prev.map(doc => 
        nonUploadedDocs.some(nonDoc => nonDoc.id === doc.id)
          ? { ...doc, reminderSent: new Date().toLocaleDateString(), reminderCount: (doc.reminderCount || 0) + 1 }
          : doc
      ));
      
      // Show success state in modal
      setReminderSuccess({count: nonUploadedDocs.length});
      
    } catch (error) {
      console.error('Failed to send reminders:', error);
      setShowReminderConfirmModal(false);
    } finally {
      setSendingReminders(false);
    }
  };

  const getStatusBadge = (status: DocumentRequest['status']) => {
    switch (status) {
      case 'uploaded':
        return <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Uploaded</span>;
      case 'pending':
        return <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">Pending</span>;
      case 'overdue':
        return <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">Overdue</span>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-amber-600';
      default:
        return 'text-green-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-indigo-100 text-indigo-600';
      case 'Complete':
        return 'bg-green-100 text-green-600';
      case 'On Hold':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleDownloadFile = async (docId: string, fileName?: string) => {
    try {
      await documentRequestsService.downloadFile(docId, fileName);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <div className="bg-indigo-50 font-['Segoe_UI'] flex min-h-screen">

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Breadcrumb + header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Clients</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-slate-500 text-sm">{job?.client?.name || 'Loading...'}</span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-slate-900 text-sm font-medium">{job?.name || 'Document Requests'}</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${job?.state ? getStatusColor(job.state) : 'bg-gray-100 text-gray-600'}`}>
            {job?.state || 'Loading'}
          </span>
        </div>

        {/* Job meta row */}
        {job && (
          <div className="bg-white rounded-xl border border-indigo-200 p-4 mb-4 flex gap-8 items-center">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">ASSIGNED TO</span>
              <span className="text-sm text-slate-900 font-medium">{job.assignedStaff?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">DUE DATE</span>
              <span className="text-sm text-slate-900 font-medium">{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">PRIORITY</span>
              <span className={`text-sm font-medium ${getPriorityColor(job.priority)}`}>{job.priority || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 mb-4 border-b-2 border-indigo-100">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-5 py-2.5 border-none bg-transparent text-sm cursor-pointer transition-colors ${
              activeTab === 'tasks' ? 'text-slate-900 font-semibold' : 'text-slate-500'
            } border-b-2 border-transparent -mb-0.5`}
          >
            Tasks
          </button>
           <button
            onClick={() => setActiveTab('time')}
            className={`px-5 py-2.5 border-none bg-transparent text-sm cursor-pointer transition-colors ${
              activeTab === 'time' ? 'text-slate-900 font-semibold' : 'text-slate-500'
            } border-b-2 border-transparent -mb-0.5`}
          >
            Time <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">{getTotalLogged()}</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-5 py-2.5 border-none bg-transparent text-sm cursor-pointer transition-colors ${
              activeTab === 'docs' ? 'text-slate-900 font-semibold' : 'text-slate-500'
            } border-b-2 border-transparent -mb-0.5`}
          >
            Document Requests{' '}
            <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
              {stats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-5 py-2.5 border-none bg-transparent text-sm cursor-pointer transition-colors ${
              activeTab === 'notes' ? 'text-slate-900 font-semibold' : 'text-slate-500'
            } border-b-2 border-transparent -mb-0.5`}
          >
            Notes
          </button>
        </div>

        {/* Tasks Panel */}
        {activeTab === 'tasks' && (
          <div>
            <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-indigo-50 border-b border-indigo-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Task Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {job?.tasks && job.tasks.length > 0 ? (
                    job.tasks.map((task: any) => (
                      <tr
                        key={task.id}
                        className="border-b border-indigo-50 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="m-0 font-medium text-slate-900">{task.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="m-0 text-sm text-slate-600">{task.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          {task.isCompleted ? (
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              Completed
                            </span>
                          ) : (
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              In Progress
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => {navigate(`/job/${routeId}`);}}
                            className="text-indigo-500 text-xs cursor-pointer hover:text-indigo-600"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-400">
                        No tasks found for this job
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Time Tracking Panel */}
        {activeTab === 'time' && (
          <TimeTrackingJob 
            jobId={routeId} 
            tasks={job?.tasks || []}
            timeEntries={timeEntries}
            isTimerRunning={isTimerRunning}
            timerSeconds={timerSeconds}
            setIsTimerRunning={setIsTimerRunning}
            setTimerSeconds={setTimerSeconds}
            onTimeEntryLogged={fetchTimeEntries}
            clientName={client?.name}
            clientEmail={client?.email}
          />
        )}

        {/* Notes Panel */}
        {activeTab === 'notes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Job Notes</h3>      
            </div>
            
            <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
              {notes && notes.length > 0 ? (
                <div className="divide-y divide-indigo-50">
                  {notes.map((note: any) => (
                    <div key={note.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="text-sm font-medium text-slate-700 leading-relaxed">
                        {note.note || 'No content'}
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            {note.created_at ? new Date(note.created_at).toLocaleString() : 'No date'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">No notes found for this job</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg border border-indigo-200 p-3">
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="text-xl font-semibold text-slate-900 m-0">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-200 p-3">
                <p className="text-xs text-slate-500 mb-1">Uploaded</p>
                <p className="text-xl font-semibold text-emerald-600 m-0">{stats.uploaded}</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-200 p-3">
                <p className="text-xs text-slate-500 mb-1">Pending</p>
                <p className="text-xl font-semibold text-indigo-500 m-0">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-lg border border-indigo-200 p-3">
                <p className="text-xs text-slate-500 mb-1">Overdue</p>
                <p className="text-xl font-semibold text-red-500 m-0">{stats.overdue}</p>
              </div>
            </div>

            {/* Action row */}
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-slate-600 m-0">
                Documents requested from <strong>{job?.client?.name || 'Client'}</strong>
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowReminderConfirmModal(true)}
                  disabled={sendingReminders}
                  className={`px-3.5 py-1.5 border rounded-lg text-sm cursor-pointer transition-colors ${
                    sendingReminders 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                      : 'bg-white text-indigo-500 border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  Send Reminder
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-1.5 border-0 rounded-lg bg-indigo-500 text-white text-sm cursor-pointer font-semibold hover:bg-indigo-600 transition-colors"
                >
                  + Add Request
                </button>
              </div>
            </div>

            {/* Document list */}
            <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
              <table className="w-full border-collapse text-sm table-fixed">
                <thead>
                  <tr className="bg-indigo-50 border-b border-indigo-100">
                    <th className="w-2/5 px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Due
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Reminder
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Resend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`border-b border-indigo-50 ${
                        doc.status === 'overdue' ? 'bg-red-50' : doc.status === 'pending' ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="w-2/5 px-4 py-3">
                        <p className="m-0 font-medium text-slate-900">{doc.name}</p>
                        <p className="m-0.5 mt-0 text-xs text-slate-500">{doc.description}</p>
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${doc.status === 'overdue' ? 'text-red-600 font-medium' : ''}`}>
                        {doc.dueDate}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {doc.reminderSent ? `Sent ${doc.reminderSent}` : doc.reminderCount ? `Sent ×${doc.reminderCount}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {doc.status === 'uploaded' && doc.fileUrl ? (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={async () => {
                                try {
                                  const response = await documentRequestsService.getFileViewUrl(doc.id);
                                  if (response.data?.fileUrl) {
                                    window.open(response.data.fileUrl, '_blank', 'noopener,noreferrer');
                                  }
                                } catch (error) {
                                  console.error('Failed to get file URL:', error);
                                  alert('Failed to open file. Please try again.');
                                }
                              }}
                              className="text-indigo-500 text-xs cursor-pointer hover:text-indigo-600"
                            >
                              View file
                            </button>
                            <button
                              onClick={() => handleDownloadFile(doc.id, doc.fileName)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Download file"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        ) : doc.status === 'uploaded' ? (
                          <span className="text-slate-400 text-xs">File unavailable</span>
                        ) : (
                          <button
                            onClick={() => sendReminder(doc.id)}
                            disabled={sendingReminderId === doc.id}
                            className={`text-xs cursor-pointer hover:underline disabled:cursor-not-allowed ${
                              sendingReminderId === doc.id 
                                ? 'text-slate-400' 
                                : sentReminderId === doc.id 
                                  ? 'text-green-600 font-semibold' 
                                  : doc.status === 'overdue' 
                                    ? 'text-red-500 font-semibold' 
                                    : 'text-indigo-500'
                            }`}
                          >
                            {sendingReminderId === doc.id 
                              ? 'Sending...' 
                              : sentReminderId === doc.id 
                                ? 'Sent!' 
                                : 'Remind'
                            }
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {doc.status !== 'uploaded' ? (
                          <button
                            onClick={async () => {
                              setSendingResendId(doc.id);
                              try {
                                await documentRequestsService.regeneratePortalLink(doc.id);
                                setSendingResendId(null);
                                setSentResendId(doc.id);
                                setTimeout(() => setSentResendId(null), 2000);
                              } catch (error) {
                                console.error('Failed to regenerate portal link:', error);
                                alert('Failed to send new portal link. Please try again.');
                                setSendingResendId(null);
                              }
                            }}
                            disabled={sendingResendId === doc.id}
                            className={`text-xs cursor-pointer hover:underline disabled:cursor-not-allowed ${
                              sendingResendId === doc.id 
                                ? 'text-slate-400' 
                                : sentResendId === doc.id 
                                  ? 'text-green-600 font-semibold' 
                                  : 'text-indigo-500'
                            }`}
                          >
                            {sendingResendId === doc.id 
                              ? 'Sending...' 
                              : sentResendId === doc.id 
                                ? 'Sent!' 
                                : 'Resend'
                            }
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

         {/* Portal link row - Show if documents have portal links and activeTab is docs */}
          {activeTab === 'docs' && (() => {
            const latestDoc = documents
              .filter(d => d.portalUrl)
              .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0];
            
            return latestDoc ? (
            <div className="mt-3 bg-white rounded-xl border border-indigo-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Client Portal Access</p>
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/portal/${latestDoc.portalUrl?.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                      >
                        {latestDoc.portalUrl}
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const portalToken = latestDoc.portalUrl?.split('/').pop();
                      const clientPortalBase = import.meta.env.VITE_CLIENT_PORTAL_URL;
                      const fullPortalUrl = `${clientPortalBase}/#/portal/${portalToken}`;
                      navigator.clipboard.writeText(fullPortalUrl);
                      
                      // Show copied feedback
                      setCopiedPortalUrl(true);
                      setTimeout(() => setCopiedPortalUrl(false), 2000);
                    }}
                    className={`px-3 py-2 border rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 flex items-center gap-1 ${
                      copiedPortalUrl 
                        ? 'bg-green-500 text-white border-green-500' 
                        : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                    }`}
                  >
                    {copiedPortalUrl ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button 
                     onClick={() => {
                      const portalToken = latestDoc.portalUrl?.split('/').pop();
                      const clientPortalBase = import.meta.env.VITE_CLIENT_PORTAL_URL;
                      const fullPortalUrl = `${clientPortalBase}/#/portal/${portalToken}`;

                      const clientEmail = latestDoc.clientEmail; // client's email

                      const subject = 'Document Portal Access';
                      const body = `Hello,

                      You can access your document portal using the link below:

                      ${fullPortalUrl}

                      Thank you.`;

                      const mailtoLink = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

                      window.open(mailtoLink, '_blank'); // opens email client in new tab
                    }}
                    className="px-3 py-2 border-0 rounded-lg bg-indigo-500 text-white text-xs font-medium cursor-pointer hover:bg-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    Email
                  </button>
                </div>
              </div>
            </div>
            ) : null;
          })()}

        {/* Reminder Confirmation Modal */}
        {showReminderConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              {!sendingReminders && !reminderSuccess ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Send Reminder Confirmation</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Are you sure you want to send reminder notifications to the client for all pending and overdue documents?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowReminderConfirmModal(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendRemindersToAll}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                    >
                      Confirm Send
                    </button>
                  </div>
                </>
              ) : sendingReminders ? (
                <>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Sending Reminders</h3>
                    <p className="text-sm text-slate-600 text-center">
                      Please wait while we send reminder notifications to the client...
                    </p>
                  </div>
                </>
              ) : reminderSuccess ? (
                <>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                      reminderSuccess.count === 0 ? 'bg-gray-100' : 'bg-green-100'
                    }`}>
                      {reminderSuccess.count === 0 ? (
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <h3 className={`text-lg font-semibold text-slate-900 mb-2`}>
                      {reminderSuccess.count === 0 ? 'No Documents to Remind' : 'Reminders Sent Successfully!'}
                    </h3>
                    <p className="text-sm text-slate-600 text-center mb-6">
                      {reminderSuccess.count === 0 
                        ? 'All documents have already been uploaded.' 
                        : `Reminders have been sent for ${reminderSuccess.count} document(s).`
                      }
                    </p>
                    <button
                      onClick={() => {
                        setShowReminderConfirmModal(false);
                        setReminderSuccess(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Document Request Modal */}
        <DocumentRequestModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={fetchData}
          jobName={job?.name || 'Document Request'}
          clientName={job?.client?.name || 'Client'}
          jobId={job?.id}
          clientId={job?.clientId}
        />
      </div>
    </div>
  );
};

export default DocumentRequestsPanel;
