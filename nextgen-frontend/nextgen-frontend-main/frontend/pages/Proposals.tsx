import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Mail,
  Bell,
  Edit,
  Trash2,
  Copy,
  AlertTriangle,
  Send,
  Loader2
} from 'lucide-react';
import ProposalBuilder from '../components/proposal/ProposalBuilder';
import Toast from '../components/Toast';
import ConfirmationModal from '../components/proposal/ConfirmationModal';
import ProposalViewModal from '../components/proposal/ProposalViewModal';
import ProposalPDFModal from '../components/proposal/ProposalPDFModal';
import { proposalService } from '../services/proposalService';
import { clientsService } from '../services/clientsService';

interface Proposal {
  id: string;
  title: string;
  description: string;
  client: string;
  clientEmail: string;
  value: string;
  billingType: string;
  sentDate: string;
  expiryDate: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'withdrawn';
  signedDate?: string;
  acceptedDate?: string;
  openCount?: number;
  isExpiringSoon?: boolean;
}

const Proposals: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedBillingType, setSelectedBillingType] = useState('all');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [proposalToWithdraw, setProposalToWithdraw] = useState<any | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [proposalToExtend, setProposalToExtend] = useState<any | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extending, setExtending] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [proposalToDuplicate, setProposalToDuplicate] = useState<any | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [proposalToView, setProposalToView] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [proposalToPDF, setProposalToPDF] = useState<any | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [isReminding, setIsReminding] = useState(false);

  // Fetch proposals on component mount and when filters change
  useEffect(() => {
    fetchProposals();
  }, [searchQuery, selectedClient, selectedBillingType]);

  // Fetch statistics on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const response = await clientsService.getClients();
      const clientsData = response?.data?.clients || [];
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await proposalService.getProposalStats();
      setStats(response.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await proposalService.getProposals({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined,
        limit: 50
      });
      
      // Transform API data to match interface
      const transformedProposals = response.data?.map((proposal: any) => {
        return {
          id: proposal.id,
          title: proposal.title,
          description: proposal.description || '',
          client: proposal.client_name || 'No client assigned',
          client_id: proposal.client_id,
          clientEmail: proposal.client_email || '',
          value: `$${parseFloat(proposal.total_value || '0').toFixed(2)}`,
          billingType: proposal.service_lines?.some((line: any) => line.type === 'Recurring') ? 'Recurring' : 'Fixed fee',
          sentDate: proposal.sent_date ? new Date(proposal.sent_date).toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : '---',
          expiryDate: proposal.expiry_date ? new Date(proposal.expiry_date).toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }) : '---',
          status: proposal.status || 'draft',
          signedDate: proposal.signed_date ? new Date(proposal.signed_date).toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric' 
          }) : undefined,
          acceptedDate: proposal.accepted_date ? new Date(proposal.accepted_date).toLocaleDateString('en-AU', { 
            month: 'short', 
            day: 'numeric' 
          }) : undefined,
          openCount: proposal.open_count || 0,
          isExpiringSoon: proposal.expiry_date ? 
            new Date(proposal.expiry_date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : false,
          // Fields needed for editing and actions
          service_lines: proposal.service_lines,
          documents: proposal.documents,
          start_date: proposal.start_date,
          expiry_date_raw: proposal.expiry_date,
          reminder_days: proposal.reminder_days,
          billing_type: proposal.billing_type,
          client_email: proposal.client_email,
          contact_name: proposal.contact_name,
          view_token: proposal.view_token
        };
      }) || [];
      
      setProposals(transformedProposals);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.response?.data?.message || 'Failed to fetch proposals');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dynamic tab counts using API stats data
  const getTabCounts = () => {
    return {
      all: stats?.total_proposals ? parseInt(stats.total_proposals) : 0,
      draft: stats?.draft_count ? parseInt(stats.draft_count) : 0,
      sent: stats?.sent_count ? parseInt(stats.sent_count) : 0,
      viewed: stats?.viewed_count ? parseInt(stats.viewed_count) : 0,
      accepted: stats?.accepted_count ? parseInt(stats.accepted_count) : 0,
      declined: stats?.declined_count ? parseInt(stats.declined_count) : 0,
      expired: stats?.expired_count ? parseInt(stats.expired_count) : 0
    };
  };

  const tabCounts = getTabCounts();

  const tabs = [
    { id: 'all', label: 'All', count: tabCounts.all },
    { id: 'draft', label: 'Draft', count: tabCounts.draft },
    { id: 'sent', label: 'Sent', count: tabCounts.sent },
    { id: 'viewed', label: 'Viewed', count: tabCounts.viewed },
    { id: 'accepted', label: 'Accepted', count: tabCounts.accepted },
    { id: 'declined', label: 'Declined', count: tabCounts.declined },
    { id: 'expired', label: 'Expired', count: tabCounts.expired }
  ];

  const getStatusPill = (status: Proposal['status']) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-indigo-100 text-indigo-600',
      viewed: 'bg-amber-100 text-amber-600',
      accepted: 'bg-green-100 text-green-600',
      declined: 'bg-red-100 text-red-600',
      expired: 'bg-gray-100 text-gray-500'
    };

    const icons = {
      draft: '',
      sent: '✉',
      viewed: '👁',
      accepted: '✓',
      declined: '✕',
      expired: ''
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getBadgeColor = (tabId: string) => {
    if (tabId === 'draft' || tabId === 'expired') return 'bg-gray-200 text-gray-600';
    if (tabId === 'sent' || tabId === 'all') return 'bg-indigo-100 text-indigo-600';
    if (tabId === 'viewed') return 'bg-amber-100 text-amber-600';
    if (tabId === 'accepted') return 'bg-green-100 text-green-600';
    if (tabId === 'declined') return 'bg-red-100 text-red-600';
    return 'bg-gray-100 text-gray-600';
  };

  const filteredProposals = proposals.filter(proposal => {
    if (activeTab !== 'all' && proposal.status !== activeTab) return false;
    if (searchQuery && !proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !proposal.client.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedClient !== 'all' && proposal.client !== selectedClient) return false;
    if (selectedBillingType !== 'all' && proposal.billingType !== selectedBillingType) return false;
    return true;
  });

  const openBuilder = (proposal: any = null) => {
    setSelectedProposal(proposal);
    setIsBuilderOpen(true);
  };

  const closeBuilder = () => {
    setIsBuilderOpen(false);
    setSelectedProposal(null);
  };

  const openDeleteModal = (proposal: any) => {
    setProposalToDelete(proposal);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setProposalToDelete(null);
    setShowDeleteModal(false);
  };

  const openWithdrawModal = (proposal: any) => {
    setProposalToWithdraw(proposal);
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = () => {
    setProposalToWithdraw(null);
    setShowWithdrawModal(false);
  };

  const openExtendModal = (proposal: any) => {
    setProposalToExtend(proposal);
    // Set default expiry date to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setNewExpiryDate(defaultDate.toISOString().split('T')[0]);
    setShowExtendModal(true);
  };

  const closeExtendModal = () => {
    setProposalToExtend(null);
    setShowExtendModal(false);
    setNewExpiryDate('');
  };

  const openDuplicateModal = (proposal: any) => {
    setProposalToDuplicate(proposal);
    setShowDuplicateModal(true);
  };

  const closeDuplicateModal = () => {
    setProposalToDuplicate(null);
    setShowDuplicateModal(false);
  };

  const openViewModal = (proposal: any) => {
    setProposalToView(proposal);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setProposalToView(null);
    setShowViewModal(false);
  };

  const openPDFModal = async (proposal: any) => {
    setProposalToPDF(proposal);

    // Fetch signature base64 if proposal is accepted and has signature
    if (proposal.status === 'accepted' && proposal.view_token) {
      try {
        const response = await proposalService.getSignatureImage(proposal.view_token);
        if (response.success) {
          setSignatureBase64(response.data.base64);
        }
      } catch (error) {
        console.error('Error fetching signature image:', error);
        setSignatureBase64(null);
      }
    } else {
      setSignatureBase64(null);
    }

    setShowPDFModal(true);
  };

  const closePDFModal = () => {
    setProposalToPDF(null);
    setShowPDFModal(false);
  };

  const handleExtendExpiry = async () => {
    if (!proposalToExtend || !newExpiryDate) return;
    
    setExtending(true);
    try {
      // Convert date to ISO format (date-time)
      const expiryDateTime = new Date(newExpiryDate).toISOString();
      await proposalService.extendExpiry(proposalToExtend.id, expiryDateTime);
      await fetchProposals();
      await fetchStats();
      closeExtendModal();
      setToast({ message: 'Proposal expiry extended successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error extending expiry:', err);
      setToast({ message: err.response?.data?.message || 'Failed to extend expiry', type: 'error' });
    } finally {
      setExtending(false);
    }
  };

  const handleDelete = async () => {
    if (!proposalToDelete) return;
    
    setDeleting(true);
    try {
      await proposalService.deleteProposal(proposalToDelete.id);
      // Refresh proposals list
      await fetchProposals();
      // Refresh stats
      await fetchStats();
      closeDeleteModal();
      setToast({ message: 'Proposal deleted successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error deleting proposal:', err);
      setToast({ message: err.response?.data?.message || 'Failed to delete proposal', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRemind = async (proposalId: string) => {
    setIsReminding(true);
    try {
      await proposalService.sendReminder(proposalId);
      setTimeout(() => {
        setToast({ message: 'Reminder sent successfully!', type: 'success' });
      }, 1000);
    } catch (err: any) {
      console.error('Error sending reminder:', err);
      setToast({ message: err.response?.data?.message || 'Failed to send reminder', type: 'error' });
    } finally {
      setIsReminding(false);
    }
  };

  const handleWithdraw = async () => {
    if (!proposalToWithdraw) return;
    
    setWithdrawing(true);
    try {
      await proposalService.updateProposalStatus(proposalToWithdraw.id, 'withdrawn');
      // Refresh proposals list
      await fetchProposals();
      // Refresh stats
      await fetchStats();
      closeWithdrawModal();
      setToast({ message: 'Proposal withdrawn successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error withdrawing proposal:', err);
      setToast({ message: err.response?.data?.message || 'Failed to withdraw proposal', type: 'error' });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!proposalToDuplicate) return;
    
    setDuplicating(true);
    try {
      await proposalService.duplicateProposal(proposalToDuplicate.id);
      await fetchProposals();
      await fetchStats();
      closeDuplicateModal();
      setToast({ message: 'Proposal duplicated successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error duplicating proposal:', err);
      setToast({ message: err.response?.data?.message || 'Failed to duplicate proposal', type: 'error' });
    } finally {
      setDuplicating(false);
    }
  };

  // Calculate dynamic summary statistics using API data
  const getSummaryStats = () => {
    const acceptanceRate = stats?.total_proposals > 0 ? Math.round((stats?.accepted_count / stats?.total_proposals) * 100) : 0;
    return [
      { label: 'Total proposals', value: stats?.total_proposals?.toString() || '0', subtext: 'All proposals', color: 'text-indigo-600' },
      { label: 'Awaiting response', value: stats?.awaiting_response?.toString() || '0', subtext: 'Sent to clients', color: 'text-amber-600' },
      { label: 'Accepted', value: stats?.accepted_count?.toString() || '0', subtext: `${acceptanceRate}% acceptance rate`, color: 'text-green-600' },
      { label: 'Expiring soon', value: stats?.expiring_soon?.toString() || '0', subtext: 'Within 3 days', color: 'text-red-600' },
      { label: 'Pipeline value', value: `$${parseFloat(stats?.total_pipeline_value || '0').toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`, subtext: 'Total value', color: 'text-slate-800' }
    ];
  };

  const summaryCards = getSummaryStats();

  return (
    <div className="space-y-6 px-2 font-['Segoe_UI']">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Proposals</h2>
          <p className="text-sm text-slate-500 ">Create, send and manage client proposals and engagement letters</p>
        </div>
        <button 
          onClick={() => openBuilder()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          New Proposal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {summaryCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg border border-indigo-100 p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-500 mt-1">{card.subtext}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-indigo-100">
        <div className="flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 transition-colors flex items-center text-sm gap-2 ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600 font-semibold bg-indigo-50' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(tab.id)}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between p-4 border-b border-indigo-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
              />
            </div>
            <select 
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All clients</option>
              {loadingClients ? (
                <option disabled>Loading clients...</option>
              ) : (
                clients.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))
              )}
            </select>
            <select 
              value={selectedBillingType}
              onChange={(e) => setSelectedBillingType(e.target.value)}
              className="px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All billing types</option>
              <option>Fixed fee</option>
              <option>Hourly</option>
              <option>Recurring monthly</option>
              <option>Recurring annual</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-indigo-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Proposal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {filteredProposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FileText size={20} className="text-slate-400" />
                    <span className="text-sm text-slate-500">No proposals found</span>
                    <span className="text-xs text-slate-400">
                      {searchQuery || selectedClient !== 'all' || selectedBillingType !== 'all' 
                        ? 'Try adjusting your filters' 
                        : 'Create your first proposal to get started'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProposals.map((proposal) => (
                <tr key={proposal.id} className={proposal.isExpiringSoon && proposal.status !== 'accepted' ? 'bg-amber-50' : ''}>
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-sm text-slate-800">{proposal.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{proposal.description}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className={`font-medium text-sm ${proposal.client === 'No client assigned' ? 'text-slate-400' : 'text-slate-800'}`}>
                        {proposal.client}
                      </p>
                      {proposal.clientEmail && (
                        <p className="text-xs text-slate-500 mt-1">{proposal.clientEmail}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-sm text-slate-800">{proposal.value}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs ${proposal.billingType === 'Recurring' ? 'text-indigo-600' : 'text-slate-600'}`}>
                      {proposal.billingType}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">{proposal.sentDate}</td>
                  <td className="px-4 py-4">
                    {proposal.status !== 'accepted' ? (
                      <>
                        {proposal.isExpiringSoon ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            <Clock size={12} />
                            {proposal.expiryDate}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">{proposal.expiryDate}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {getStatusPill(proposal.status)}
                      {proposal.status === 'accepted' && proposal.acceptedDate && (
                        <p className="text-xs text-slate-500">Signed {proposal.acceptedDate}</p>
                      )}
                      {proposal.status !== 'accepted' && proposal.openCount > 0 ? (
                        <p className="text-xs text-slate-500">Opened {proposal.openCount} time{proposal.openCount > 1 ? 's' : ''}</p>
                      ) : (
                        proposal.status === 'sent' && (
                          <p className="text-xs text-slate-500">Not yet opened</p>
                        )
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {proposal.status === 'accepted' ? (
                        <>
                          <button 
                            onClick={() => openViewModal(proposal)}
                            className="px-3 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 transition-colors"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => openPDFModal(proposal)}
                            className="px-3 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 transition-colors"
                          >
                            PDF
                          </button>
                        </>
                      ) : proposal.status === 'draft' ? (
                        <>
                          <button 
                            onClick={() => openBuilder(proposal)}
                            className="px-3 py-1 text-xs border border-indigo-100 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => openDeleteModal(proposal)}
                            className="px-3 py-1 text-xs border border-red-100 rounded text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleRemind(proposal.id)}
                            disabled={isReminding}
                            className="px-3 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isReminding ? 'Sending...' : 'Remind'}
                          </button>
                          <div className="relative">
                            <button 
                              onClick={() => setActionMenuOpen(actionMenuOpen === proposal.id ? null : proposal.id)}
                              className="px-3 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 transition-colors"
                            >
                              <MoreVertical size={14} />
                            </button>
                            {actionMenuOpen === proposal.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg border border-indigo-100 shadow-lg z-10">
                                <button 
                                  onClick={() => {
                                    if (proposal.view_token) {
                                      window.open(`/#/proposal/${proposal.view_token}`, '_blank');
                                    } else {
                                      alert('No view token available for this proposal');
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                >
                                  <Eye size={12} /> View proposal
                                </button>
                                {proposal.isExpiringSoon && (
                                  <button 
                                    onClick={() => {
                                      setActionMenuOpen(null);
                                      openExtendModal(proposal);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                  >
                                    <Calendar size={12} /> Extend expiry
                                  </button>
                                )}
                                <button 
                                  onClick={() => {
                                    if (proposal.view_token) {
                                      navigator.clipboard.writeText(`${import.meta.env.VITE_CLIENT_PORTAL_URL}#/proposal/${proposal.view_token}`);
                                      setToast({ message: 'Link copied to clipboard!', type: 'success' });
                                    } else {
                                      setToast({ message: 'No view token available for this proposal', type: 'error' });
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                >
                                  <Copy size={12} /> Copy link
                                </button>
                                <button 
                                  onClick={() => {
                                    setActionMenuOpen(null);
                                    openDuplicateModal(proposal);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 transition-colors flex items-center gap-2"
                                >
                                  <Copy size={12} /> Duplicate
                                </button>
                                <button 
                                  onClick={() => {
                                    setActionMenuOpen(null);
                                    openWithdrawModal(proposal);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 text-red-600 transition-colors flex items-center gap-2"
                                >
                                  <XCircle size={12} /> Withdraw
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proposal Builder Modal */}
      <ProposalBuilder 
        isOpen={isBuilderOpen}
        onClose={closeBuilder}
        proposalToEdit={selectedProposal}
        onProposalCreated={async () => {
          await fetchProposals();
          await fetchStats();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Proposal?"
        message={`Are you sure you want to delete "${proposalToDelete?.title}"?`}
        confirmText="Delete"
        iconType="alert"
        isLoading={deleting}
      />

      {/* Withdraw Confirmation Modal */}
      <ConfirmationModal
        isOpen={showWithdrawModal}
        onClose={closeWithdrawModal}
        onConfirm={handleWithdraw}
        title="Withdraw Proposal?"
        message={`Are you sure you want to withdraw "${proposalToWithdraw?.title}"? This will change the proposal status to withdrawn and the client will no longer be able to view or accept it.`}
        confirmText="Withdraw"
        iconType="warning"
        isLoading={withdrawing}
      />

      {/* Extend Expiry Modal */}
      <ConfirmationModal
        isOpen={showExtendModal}
        onClose={closeExtendModal}
        onConfirm={handleExtendExpiry}
        title="Extend Expiry"
        message={`Extend the expiry date for "${proposalToExtend?.title}"`}
        confirmText="Extend"
        iconType="info"
        isLoading={extending}
        isDisabled={!newExpiryDate}
        customContent={
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">New Expiry Date</label>
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              min={new Date().toISOString().split('T')[0]}
        />
      </div>
    }
  />

  {/* Duplicate Confirmation Modal */}
  <ConfirmationModal
    isOpen={showDuplicateModal}
    onClose={closeDuplicateModal}
    onConfirm={handleConfirmDuplicate}
    title="Duplicate Proposal?"
    message={`Are you sure you want to duplicate "${proposalToDuplicate?.title}"? A new proposal will be created with the same content.`}
    confirmText="Duplicate"
    iconType="success"
    isLoading={duplicating}
  />

  {/* View Proposal Modal */}
  <ProposalViewModal
    isOpen={showViewModal}
    onClose={closeViewModal}
    proposal={proposalToView}
  />

  {/* PDF Modal */}
  <ProposalPDFModal
    isOpen={showPDFModal}
    onClose={closePDFModal}
    proposal={proposalToPDF}
    signatureBase64={signatureBase64 || undefined}
  />

  {/* Toast */}
  {toast && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  )}
</div>
);
};

export default Proposals;