import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X,
  Send,
  Trash2,
} from 'lucide-react';
import { applyFormatting, convertToHTML } from '../../utils/textFormatter';
import { letterTemplates, termsTemplates } from '@/utils/ProposalTemplate';
import { clientsService } from '../../services/clientsService';
import { proposalService } from '../../services/proposalService';
import Toast from '../Toast';

interface ProposalBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  proposalToEdit?: any | null;
  onProposalCreated?: () => void;
}

const ProposalBuilder: React.FC<ProposalBuilderProps> = ({ isOpen, onClose, proposalToEdit, onProposalCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [clientMode, setClientMode] = useState<'existing' | 'prospect'>('existing');
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [serviceLines, setServiceLines] = useState<any[]>([]);

  // Template state
  const [selectedLetterTemplate, setSelectedLetterTemplate] = useState('standard_company');
  const [selectedTermsTemplate, setSelectedTermsTemplate] = useState('standard_firm');
  const [letterContent, setLetterContent] = useState('');
  const [termsContent, setTermsContent] = useState('');

  // Refs for contentEditable divs
  const letterTextareaRef = useRef<HTMLDivElement>(null);
  const termsTextareaRef = useRef<HTMLDivElement>(null);
  const letterContentRef = useRef<string>('');
  const termsContentRef = useRef<string>('');

  // Client state
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedClientData, setSelectedClientData] = useState<any>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  // Proposal form state
  const [proposalTitle, setProposalTitle] = useState<string>('FY2026 Compliance Package');
  const [description, setDescription] = useState<string>('');
  const [coverMessage, setCoverMessage] = useState<string>('');
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isSendingProposal, setIsSendingProposal] = useState<boolean>(false);
  const [proposalError, setProposalError] = useState<string>('');
  const [step1Error, setStep1Error] = useState<string>('');
  const [proposalSuccess, setProposalSuccess] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  // Additional proposal state for merge tags
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [autoReminder, setAutoReminder] = useState<string>('3'); // Default to 3 days
  const [firmName] = useState<string>('Practis Manager'); // This could come from user profile
  
  // Billing type state
  const [billingType, setBillingType] = useState<'one-off' | 'recurring'>('one-off');

  // Prospect client state
  const [prospectData, setProspectData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });

  // Fetch clients on component mount
  useEffect(() => {
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

    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  
  // Populate form when editing a proposal
  useEffect(() => {
    if (proposalToEdit && isOpen) {
      setProposalTitle(proposalToEdit.title || '');
      setDescription(proposalToEdit.description || '');
      setCoverMessage(proposalToEdit.cover_message || '');
      setSelectedClient(proposalToEdit.client_id || '');
      setServiceLines(proposalToEdit.service_lines || []);
      setLetterContent(proposalToEdit.documents?.letter || '');
      setTermsContent(proposalToEdit.documents?.terms || '');
      setStartDate(proposalToEdit.start_date || new Date().toISOString().split('T')[0]);
      setExpiryDate(proposalToEdit.expiry_date_raw || proposalToEdit.expiry_date || new Date().toISOString().split('T')[0]);
      setAutoReminder(proposalToEdit.reminder_days?.toString() || '3');
      setBillingType(proposalToEdit.billing_type || 'one-off');
      
      // Populate prospect data if it's a prospect (no client_id)
      if (!proposalToEdit.client_id) {
        setProspectData(prev => ({
          ...prev,
          companyName: proposalToEdit.client || '',
          contactName: proposalToEdit.contact_name || '',
          contactEmail: proposalToEdit.client_email || '',
        }));
      }
    }
  }, [proposalToEdit, isOpen]);
  
  // Update selectedClientData when clients are loaded and we have a selected client
  useEffect(() => {
    if (selectedClient && clients.length > 0) {
      const client = clients.find(c => c.id === selectedClient);
      if (client) {
        setSelectedClientData(client);
      }
    }
  }, [selectedClient, clients]);

  // Function to replace merge tags with actual values
  const replaceMergeTags = (content: string): string => {
    const totals = calculateTotals();
    const clientName = selectedClientData?.name || prospectData?.companyName || '{client_name}';
    const serviceName = serviceLines.map(line => line.service).join(', ');
    
    let replacedContent = content
      .replace(/{client_name}/g, clientName)
      .replace(/{firm_name}/g, firmName)
      .replace(/{total_value}/g, `$${totals.total}`)
      .replace(/{start_date}/g, new Date(startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }))
      .replace(/{service_summary}/g, serviceName || 'Services');
    
    return replacedContent;
  };

  // Handle template selection
  const handleLetterTemplateChange = (templateId: string) => {
    const template = letterTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedLetterTemplate(templateId);
      const contentWithTags = replaceMergeTags(template.content);
      const htmlContent = convertToHTML(contentWithTags);
      setLetterContent(htmlContent);
      letterContentRef.current = htmlContent;
    }
  };

  const handleTermsTemplateChange = (templateId: string) => {
    const template = termsTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTermsTemplate(templateId);
      const contentWithTags = replaceMergeTags(template.content);
      const htmlContent = convertToHTML(contentWithTags);
      setTermsContent(htmlContent);
      termsContentRef.current = htmlContent;
    }
  };

  // Handle client selection
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find(c => c.id === clientId);
    setSelectedClientData(client || null);
    setStep1Error(''); // Clear error when user makes a selection
  };

  // Form validation
  const validateProposalForm = (): boolean => {
    setProposalError('');
    
    if (!proposalTitle.trim()) {
      setProposalError('Proposal title is required');
      return false;
    }
    
    if (clientMode === 'existing' && !selectedClient) {
      setProposalError('Please select a client');
      return false;
    }
    
    if (clientMode === 'prospect') {
      if (!prospectData.companyName.trim()) {
        setProposalError('Company name is required');
        return false;
      }
      if (!prospectData.contactName.trim()) {
        setProposalError('Contact name is required');
        return false;
      }
      if (!prospectData.contactEmail.trim()) {
        setProposalError('Contact email is required');
        return false;
      }
    }
    
    if (!letterContent.trim()) {
      setProposalError('Engagement letter content is required');
      return false;
    }
    
    if (!termsContent.trim()) {
      setProposalError('Terms and conditions content is required');
      return false;
    }
    
    if (serviceLines.length === 0) {
      setProposalError('At least one service line is required');
      return false;
    }
    
    return true;
  };

  // Validate draft (relaxed validation for drafts)
  const validateDraftForm = (): boolean => {
    setProposalError('');
    
    if (!proposalTitle.trim()) {
      setProposalError('Proposal title is required');
      return false;
    }
    
    if (clientMode === 'existing' && !selectedClient) {
      setProposalError('Please select a client');
      return false;
    }
    
    if (clientMode === 'prospect') {
      if (!prospectData.companyName.trim()) {
        setProposalError('Company name is required');
        return false;
      }
      if (!prospectData.contactEmail.trim()) {
        setProposalError('Contact email is required');
        return false;
      }
    }
    
    return true;
  };

  // Create proposal function
  const createProposal = async (status: 'draft' | 'sent' = 'sent') => {
    // Use relaxed validation for drafts, full validation for sent proposals
    if (status === 'sent' ? !validateProposalForm() : !validateDraftForm()) {
      return;
    }

    if (status === 'draft') {
      setIsSavingDraft(true);
    } else {
      setIsSendingProposal(true);
    }
    setProposalError('');

    try {
      let clientId = selectedClient;

      // If prospect mode, create client first
      if (clientMode === 'prospect') {
        const clientData = {
          name: prospectData.companyName,
          email: prospectData.contactEmail,
          phone: prospectData.contactPhone,
          address: {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: ''
          },
          contact_name: prospectData.contactName
        };

        const clientResponse = await clientsService.createClient(clientData);
        console.log('Client creation response:', clientResponse);
        clientId = clientResponse.data?.id || clientResponse.data?.client?.id;
        
        if (!clientId) {
          setProposalError('Failed to create client: ' + (clientResponse.data?.message || 'Unknown error'));
          return;
        }
      }

      // Calculate totals
      const totals = calculateTotals();

      // Get latest content from refs
      const finalLetterContent = letterContentRef.current || letterContent;
      const finalTermsContent = termsContentRef.current || termsContent;

      // Prepare proposal data to match backend schema
      const proposalData = {
        title: proposalTitle,
        description: description,
        client_id: clientId,
        client_name: selectedClientData?.name || prospectData?.companyName,
        client_email: selectedClientData?.email || prospectData?.contactEmail,
        contact_name: selectedClientData?.name || prospectData?.contactName,
        cover_message: coverMessage,
        total_value: parseFloat(totals.total.replace(/[$,]/g, '')) || 0,
        subtotal: parseFloat(totals.subtotal.replace(/[$,]/g, '')) || 0,
        gst_amount: parseFloat(totals.gst.replace(/[$,]/g, '')) || 0,
        expiry_date: new Date(expiryDate).toISOString(),
        auto_reminder_days: parseInt(autoReminder) || 0,
        status: status,
        service_lines: serviceLines.map(line => ({
          service: line.service,
          type: line.type,
          quantity: parseFloat(line.quantity.toString()) || 0,
          rate: parseFloat(typeof line.rate === 'string' ? line.rate.replace(/[$,]/g, '') : line.rate.toString()) || 0,
          total: parseFloat(typeof line.total === 'string' ? line.total.replace(/[$,]/g, '') : line.total.toString()) || 0,
          description: ''
        })),
        documents: {
          letter: finalLetterContent,
          terms: finalTermsContent
        }
      };

      const response = await proposalService.createProposal(proposalData);

      setProposalSuccess(true);
      setToast({ message: 'Proposal created successfully!', type: 'success' });

      // Call callback to refresh proposals list
      if (onProposalCreated) {
        onProposalCreated();
      }

      // Close modal after success
      setTimeout(() => {
        handleClose();
        setToast(null);
      }, 2000);

    } catch (error: any) {
      console.error('Error creating proposal:', error);
      setProposalError(error.response?.data?.message || 'Failed to create proposal');
    } finally {
      if (status === 'draft') {
        setIsSavingDraft(false);
      } else {
        setIsSendingProposal(false);
      }
    }
  };

  // Handle prospect data changes
  const handleProspectChange = (field: string, value: string) => {
    setProspectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate totals for service lines
  const calculateTotals = () => {
    const subtotal = serviceLines.reduce((sum, line) => {
      const rate = parseFloat(typeof line.rate === 'string' ? line.rate.replace(/[$,]/g, '') : line.rate.toString()) || 0;
      const quantity = parseFloat(line.quantity.toString()) || 0;
      return sum + (rate * quantity);
    }, 0);
    
    const gst = subtotal * 0.1; // 10% GST
    const total = subtotal + gst;
    
    return {
      subtotal: subtotal.toFixed(2),
      gst: gst.toFixed(2),
      total: total.toFixed(2)
    };
  };

  // Update service line and recalculate total
  const updateServiceLine = (id: number, field: string, value: string | number) => {
    setServiceLines(prevLines => 
      prevLines.map(line => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value };
          
          // Recalculate total if rate or quantity changed
          if (field === 'rate' || field === 'quantity') {
            const rate = parseFloat(typeof updatedLine.rate === 'string' ? updatedLine.rate.replace(/[$,]/g, '') : updatedLine.rate.toString()) || 0;
            const quantity = parseFloat(updatedLine.quantity.toString()) || 0;
            updatedLine.total = (rate * quantity).toFixed(2);
          }
          
          return updatedLine;
        }
        return line;
      })
    );
    
    // Clear any previous service validation errors when user makes changes
    setProposalError('');
  };
  
  const addServiceLine = () => {
    const newLine = {
      id: Date.now(),
      service: "Service description",
      type: "Fixed",
      quantity: 1,
      rate: "$0.00",
      total: "$0.00"
    };
    setServiceLines([...serviceLines, newLine]);
    // Clear any previous service validation errors
    setProposalError('');
  };

  const removeServiceLine = (id: number) => {
    setServiceLines(serviceLines.filter(line => line.id !== id));
  };

  const stepLabels = ['Client', 'Services', 'Billing', 'Letter', 'T&Cs', 'Send'];

  const validateStep1 = (): boolean => {
    setStep1Error('');
    
    // Check proposal title
    if (!proposalTitle.trim()) {
      setStep1Error('Proposal title is required');
      return false;
    }
    
    // Check client selection for existing client mode
    if (clientMode === 'existing') {
      if (!selectedClient) {
        setStep1Error('Please select a client');
        return false;
      }
      if (!selectedClientData?.email) {
        setStep1Error('Selected client must have an email address');
        return false;
      }
    }
    
    // Check prospect data for prospect mode
    if (clientMode === 'prospect') {
      if (!prospectData.companyName.trim()) {
        setStep1Error('Company name is required');
        return false;
      }
      if (!prospectData.contactName.trim()) {
        setStep1Error('Contact name is required');
        return false;
      }
      if (!prospectData.contactEmail.trim()) {
        setStep1Error('Contact email is required');
        return false;
      }
      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(prospectData.contactEmail)) {
        setStep1Error('Please enter a valid email address');
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    // Validate Step 1 (Client details) - cover message is optional
    if (currentStep === 1) {
      if (!validateStep1()) {
        return;
      }
    }
    
    // Validate services step
    if (currentStep === 2) {
      if (serviceLines.length === 0) {
        setProposalError('Please add at least one service line item');
        return;
      }
      
      // Check if any service line has empty service description
      const hasEmptyService = serviceLines.some(line => !line.service.trim());
      if (hasEmptyService) {
        setProposalError('Please fill in service description for all line items');
        return;
      }
      
      // Check if any service line has zero rate
      const hasZeroRate = serviceLines.some(line => {
        const rate = parseFloat(typeof line.rate === 'string' ? line.rate.replace(/[$,]/g, '') : line.rate.toString()) || 0;
        return rate <= 0;
      });
      if (hasZeroRate) {
        setProposalError('Please enter a valid rate for all service line items');
        return;
      }
    }
    
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const goToStep = (step: number) => {
    if (step < currentStep) setCurrentStep(step);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setClientMode('existing');
    setActionMenuOpen(null);
    setServiceLines([]);
    
    // Clear all form fields
    setProposalTitle('');
    setDescription('');
    setCoverMessage('');
    setSelectedClient('');
    setSelectedClientData(null);
    setProspectData({
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: ''
    });
    setLetterContent('');
    setTermsContent('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date().toISOString().split('T')[0]);
    setAutoReminder('3');
    setBillingType('one-off');
    setProposalError('');
    setProposalSuccess(false);
    setStep1Error('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;


  return createPortal(
    <div className="fixed font-[Segoe_UI] inset-0 bg-slate-900/50 flex items-start justify-center z-50 p-8 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-indigo-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800 m-0 mb-0.5">New Proposal</h3>
            <p className="text-xs text-slate-500 m-0">Step {currentStep} of 6</p>
          </div>
          <button 
            onClick={handleClose}
            className="border-none bg-transparent text-slate-400 hover:text-slate-600 transition-colors text-xl cursor-pointer leading-none"
          >
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-indigo-100">
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            return (
              <button
                key={index}
                onClick={() => goToStep(stepNum)}
                disabled={stepNum > currentStep}
                className={`flex-1 py-2.5 text-xs font-medium cursor-pointer border-b-2 -mb-px transition-colors ${
                  stepNum < currentStep 
                    ? 'border-green-600 text-green-600'
                    : stepNum === currentStep
                    ? 'border-indigo-500 text-indigo-600 font-semibold'
                    : 'border-transparent text-slate-400'
                }`}
              >
                {stepNum < currentStep ? `✓ ${label}` : `${stepNum}. ${label}`}
              </button>
            );
          })}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Client */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Step 1 Error Message */}
              {step1Error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <span className="text-red-500 text-sm">⚠️</span>
                  <p className="text-sm text-red-700">{step1Error}</p>
                </div>
              )}
              
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Client details</p>
                
                {/* Toggle */}
                <div className="flex gap-0 border border-indigo-100 rounded-lg overflow-hidden mb-5">
                  <button 
                    onClick={() => setClientMode('existing')}
                    className={`flex-1 py-2.5 border-none text-xs font-medium cursor-pointer transition-colors ${
                      clientMode === 'existing' 
                        ? 'bg-indigo-500 text-white font-semibold' 
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Existing Client
                  </button>
                  <button 
                    onClick={() => setClientMode('prospect')}
                    className={`flex-1 py-2.5 border-none text-xs font-medium cursor-pointer transition-colors ${
                      clientMode === 'prospect' 
                        ? 'bg-indigo-500 text-white font-semibold' 
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    New Prospect
                  </button>
                </div>
              </div>

                {/* Existing client fields */}
                {clientMode === 'existing' && (
                  <div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Select client <span className="text-red-500">*</span></label>
                      <select 
                        className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        value={selectedClient}
                        onChange={(e) => handleClientChange(e.target.value)}
                        disabled={loadingClients}
                      >
                        <option value="">- Choose a client -</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      {loadingClients && (
                        <p className="text-xs text-slate-500 mt-1">Loading clients...</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 block mb-1.5">Contact name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Auto-filled from client"
                          value={selectedClientData?.name || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-800 block mb-1.5">Contact email <span className="text-red-500">*</span></label>
                        <input 
                          type="email" 
                          placeholder="Auto-filled from client"
                          value={selectedClientData?.email || ''}
                          readOnly
                          className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="my-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Proposal title <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. FY2025 Compliance Package"
                        value={proposalTitle}
                        onChange={(e) => {
                          setProposalTitle(e.target.value);
                          setStep1Error('');
                        }}
                        className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                     <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Description <span className="text-slate-500 font-normal">{'(optional - internal notes)'}</span></label>
                      <textarea 
                        rows={2}
                        placeholder="Internal notes about this proposal..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2.25 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Cover message <span className="text-slate-500 font-normal">{'(optional - shown at top of proposal)'}</span></label>
                      <textarea 
                        rows={3}
                        placeholder="Hi Jane, please find our proposal for accounting services..."
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        className="w-full px-3 py-2.25 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}
                  {/* New prospect fields */}
                {clientMode === 'prospect' && (
                  <div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-xs text-slate-600">
                      This prospect will be saved and automatically converted to a client if they accept proposal.
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Company name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. Acme Pty Ltd"
                        value={prospectData.companyName}
                        onChange={(e) => {
                          handleProspectChange('companyName', e.target.value);
                          setStep1Error('');
                        }}
                        className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 block mb-1.5">Contact name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          placeholder="Jane Smith"
                          value={prospectData.contactName}
                          onChange={(e) => {
                            handleProspectChange('contactName', e.target.value);
                            setStep1Error('');
                          }}
                          className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-800 block mb-1.5">Contact email <span className="text-red-500">*</span></label>
                        <input 
                          type="email" 
                          placeholder="jane@acme.com"
                          value={prospectData.contactEmail}
                          onChange={(e) => {
                            handleProspectChange('contactEmail', e.target.value);
                            setStep1Error('');
                          }}
                          className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Proposal title <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        placeholder="e.g. FY2025 Compliance Package"
                        value={proposalTitle}
                        onChange={(e) => {
                          setProposalTitle(e.target.value);
                          setStep1Error('');
                        }}
                        className="w-full px-3 py-2 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Description <span className="text-slate-500 font-normal">{'(optional - internal notes)'}</span></label>
                      <textarea 
                        rows={2}
                        placeholder="Internal notes about this proposal..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2.25 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-800 block mb-1.5">Cover message <span className="text-slate-500 font-normal">{'(optional - shown at top of proposal)'}</span></label>
                      <textarea 
                        rows={3}
                        placeholder="Hi Jane, please find our proposal for accounting services..."
                        value={coverMessage}
                        onChange={(e) => setCoverMessage(e.target.value)}
                        className="w-full px-3 py-3 border border-indigo-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Service line items</p>
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3.5 mb-4 text-xs text-slate-600">
                  Add services included in this engagement. Each line item will appear in client-facing proposal with pricing breakdown.
                </div>
              </div>

              <div className="bg-white border border-indigo-100 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '35%'}}>Service</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '18%'}}>Type</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '13%'}}>Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '14%'}}>Rate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '12%'}}>Total</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-700 border-b border-indigo-100" style={{width: '8%'}}></th>
                      </tr>
                    </thead>
                    <tbody id="serviceLines" className="divide-y divide-indigo-100">
                      {serviceLines.map((line, index) => (
                        <tr key={line.id}>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={line.service} 
                              onChange={(e) => updateServiceLine(line.id, 'service', e.target.value)}
                              className="w-full px-2 py-1.5 border border-indigo-100 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                              style={{fontSize: "12px"}} 
                              placeholder="Service description"
                            />
                          </td>
                          <td className="p-2">
                            <select 
                              className="w-full px-2 py-1.5 border border-indigo-100 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                              style={{fontSize: "12px"}} 
                              value={line.type}
                              onChange={(e) => updateServiceLine(line.id, 'type', e.target.value)}
                            >
                              <option value="Fixed">Fixed</option>
                              <option value="Hourly">Hourly</option>
                              <option value="Recurring">Recurring</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              value={line.quantity} 
                              onChange={(e) => updateServiceLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-indigo-100 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                              style={{fontSize: "12px"}} 
                              min="0"
                              step="1"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={line.rate} 
                              onChange={(e) => updateServiceLine(line.id, 'rate', e.target.value)}
                              className="w-full px-2 py-1.5 border border-indigo-100 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                              style={{fontSize: "12px"}} 
                              placeholder="$0.00"
                            />
                          </td>
                          <td className="p-2 font-semibold text-sm text-slate-800" style={{fontWeight: 600, color: "#0f1f3d", fontSize: "12px"}}>
                            {line.total}
                          </td>
                          <td className="p-2">
                            <button 
                              className="text-red-600 hover:bg-red-50 border-none p-1 rounded transition-colors" 
                              style={{border: "none", background: "none", cursor: "pointer", color: "#dc2626", fontSize: "14px"}} 
                              onClick={() => removeServiceLine(line.id)}
                              title="Remove service line"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button className="px-4 py-2 border border-indigo-100 rounded-lg text-sm  text-indigo-600 hover:bg-indigo-50 transition-colors mb-4" onClick={addServiceLine}>
                + Add line item
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div></div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3.5 mb-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="text-slate-800">${calculateTotals().subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-slate-600">GST (10%)</span>
                      <span className="text-slate-800">${calculateTotals().gst}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-indigo-200">
                      <span className="font-semibold text-slate-800">Total</span>
                      <span className="font-bold text-indigo-600">${calculateTotals().total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Billing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Recurring billing setup</h4>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                  <p className="text-xs text-indigo-700">
                    If this engagement includes recurring services, configure auto-invoicing here. Invoices will be raised in Xero automatically on the billing cycle start date after proposal acceptance.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-3">
                  Does this proposal include recurring services?
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                    <input 
                      type="radio" 
                      name="hasRecurring" 
                      value="yes" 
                      disabled 
                      className="text-indigo-600"
                      checked={billingType === 'recurring'}
                    />
                    <span className="text-sm text-slate-700">Yes — set up recurring billing</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="hasRecurring" 
                      value="no" 
                      className="text-indigo-600"
                      checked={billingType === 'one-off'}
                      onChange={() => setBillingType('one-off')}
                    />
                    <span className="text-sm text-slate-700">No — one-off engagement only</span>
                  </label>
                </div>
              </div>

              {/* One-off engagement UI */}
              {billingType === 'one-off' && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-indigo-800">One-off engagement details</span>
                    <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">Single payment</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-700 mb-2">Payment due</label>
                      <select className="w-full px-2 py-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option>On acceptance</option>
                        <option>14 days from acceptance</option>
                        <option>30 days from acceptance</option>
                        <option>50% upfront, 50% on completion</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-700 mb-2">Payment method</label>
                      <select className="w-full px-2 py-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        <option>Bank transfer — send invoice</option>
                        <option>Credit card</option>
                        <option>Cash</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-700 mb-2">Invoice timing</label>
                    <select className="w-full px-2 py-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option>Send invoice immediately after proposal acceptance</option>
                      <option>Send invoice on service completion</option>
                      <option>Send invoice on specified date</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <input type="checkbox" id="requireDeposit" className="mt-0.5 rounded" />
                    <label htmlFor="requireDeposit" className="text-xs text-slate-700 cursor-pointer">
                      Require upfront deposit before starting work
                    </label>
                  </div>
                </div>
              )}

              {/* Recurring billing configuration - Disabled for now */}
              {billingType === 'recurring' && (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 space-y-3 opacity-50 pointer-events-none">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Recurring billing configuration</span>
                    <span className="text-xs text-gray-400">(Feature coming soon)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Billing cycle</label>
                      <select disabled className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50">
                        <option>Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Billing start date</label>
                      <input 
                        type="date" 
                        disabled
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Recurring amount (ex GST)</label>
                      <input 
                        type="text" 
                        disabled
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-2">Invoice due</label>
                      <select disabled className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50">
                        <option>14 days from invoice date</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-2">Payment method</label>
                    <select disabled className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50">
                      <option>Bank transfer — send invoice</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Letter */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Engagement letter body</h4>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4">
                  <p className="text-xs text-indigo-700">
                    This text forms the body of the engagement letter that the client will sign. Use merge tags like <strong>{`{client_name}`}</strong>, <strong>{`{firm_name}`}</strong>, <strong>{`{total_value}`}</strong>, <strong>{`{start_date}`}</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">Template</label>
                <select 
                  className="w-full px-2 py-1.5 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={selectedLetterTemplate}
                  onChange={(e) => handleLetterTemplateChange(e.target.value)}
                >
                  <option value="standard_company">Standard Engagement Letter — Company</option>
                  <option value="standard_individual">Standard Engagement Letter — Individual</option>
                  <option value="smsf">SMSF Engagement Letter</option>
                  <option value="custom">Custom Template</option>
                </select>
              </div>

              <div className="border border-indigo-100 rounded-lg overflow-hidden">
                <div className="bg-slate-50 border-b border-indigo-100 px-2 py-1.5 flex gap-1">
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50 font-bold"
                    onClick={() => applyFormatting('bold', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >B</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50 italic"
                    onClick={() => applyFormatting('italic', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >I</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50 underline"
                    onClick={() => applyFormatting('underline', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >U</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                    onClick={() => applyFormatting('h1', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >H1</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                    onClick={() => applyFormatting('h2', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >H2</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                    onClick={() => applyFormatting('paragraph', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >¶</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                    onClick={() => applyFormatting('list', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >List</button>
                  <button 
                    className="px-1.5 py-0.5 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                    onClick={() => applyFormatting('tags', letterTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                  >Tags</button>
                </div>
                <div 
                  ref={letterTextareaRef}
                  contentEditable
                  className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none min-h-[300px] border-0"
                  dangerouslySetInnerHTML={{ __html: letterContent }}
                  onInput={(e) => {
                    letterContentRef.current = e.currentTarget.innerHTML;
                  }}
                  onBlur={(e) => {
                    setLetterContent(e.currentTarget.innerHTML);
                    letterContentRef.current = e.currentTarget.innerHTML;
                  }}
                  placeholder="Select a template to populate content..."
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>
          )}

          {/* Step 5: T&Cs */}
          {currentStep === 5 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Terms and conditions</h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">T&Cs template</label>
                  <select 
                    className="w-full px-2 py-1.5 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={selectedTermsTemplate}
                    onChange={(e) => handleTermsTemplateChange(e.target.value)}
                  >
                    <option value="standard_firm">Standard T&Cs — Accounting Firm (default)</option>
                    <option value="caanz">CAANZ Standard T&Cs</option>
                    <option value="custom">Custom T&Cs</option>
                  </select>
                </div>
                
                <div className="border border-indigo-100 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 border-b border-indigo-100 px-3 py-2 flex gap-2">
                    <button 
                      className="px-2 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 font-bold"
                      onClick={() => applyFormatting('bold', termsTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                    >B</button>
                    <button 
                      className="px-2 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50 italic"
                      onClick={() => applyFormatting('italic', termsTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                    >I</button>
                    <button 
                      className="px-2 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                      onClick={() => applyFormatting('h2', termsTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                    >H2</button>
                    <button 
                      className="px-2 py-1 text-xs border border-indigo-100 rounded hover:bg-indigo-50"
                      onClick={() => applyFormatting('list', termsTextareaRef, setLetterContent, setTermsContent, letterTextareaRef, termsTextareaRef)}
                    >List</button>
                  </div>
                  <div 
                    ref={termsTextareaRef}
                    contentEditable
                    className="w-full px-4 py-3 text-xs text-slate-600 focus:outline-none resize-none min-h-[400px] border-0"
                    dangerouslySetInnerHTML={{ __html: termsContent }}
                    onInput={(e) => {
                      termsContentRef.current = e.currentTarget.innerHTML;
                    }}
                    onBlur={(e) => {
                      setTermsContent(e.currentTarget.innerHTML);
                      termsContentRef.current = e.currentTarget.innerHTML;
                    }}
                    placeholder="Select a template to populate content..."
                    style={{ minHeight: '400px' }}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer my-4">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-xs text-slate-600">Require client to scroll to bottom of T&Cs before they can accept</span>
                </label>
            </div>
          )}            

          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">Proposal settings</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Expiry date</label>
                    <input 
                      type="date" 
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">Auto-reminder</label>
                    <select 
                      value={autoReminder}
                      onChange={(e) => setAutoReminder(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="3">Remind after 3 days if not opened</option>
                      <option value="1">Remind after 1 day</option>
                      <option value="5">Remind after 5 days</option>
                      <option value="0">No auto-reminder</option>
                    </select>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <p className="text-sm font-semibold text-slate-800 mb-4">PROPOSAL SUMMARY</p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Client</span>
                      <span className="font-medium text-slate-800">
                        {selectedClientData?.name || prospectData?.companyName || 'No client selected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Sending to</span>
                      <span className="font-medium text-slate-800">
                        {selectedClientData?.email || prospectData?.contactEmail || 'No email provided'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Proposal title</span>
                      <span className="font-medium text-slate-800">{proposalTitle || 'Untitled Proposal'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Total value</span>
                      <span className="font-bold text-indigo-600">${calculateTotals().total} (inc. GST)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Line items</span>
                      <span className="font-medium text-slate-800">{serviceLines.length} {serviceLines.length === 1 ? 'service' : 'services'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Billing type</span>
                      <span className="font-medium text-indigo-600">
                        {billingType === 'recurring' ? 'Recurring' : 'One-off'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">E-signature</span>
                      <span className="font-medium text-green-600">Required on acceptance</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Start date</span>
                      <span className="font-medium text-slate-800">
                        {new Date(startDate).toLocaleDateString('en-AU', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-4 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-xs text-slate-600">Notify me when client opens the proposal</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-xs text-slate-600">Notify me when client accepts and signs</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-xs text-slate-600">Auto-start Xero recurring invoice on acceptance</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-indigo-100">
            {currentStep > 1 && (
              <button 
                onClick={prevStep}
                className="px-4 py-2 rounded-lg transition-colors border border-indigo-100 text-slate-600 hover:bg-indigo-50"
              >
                 ← Back
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button 
                onClick={() => createProposal('draft')}
                disabled={isSavingDraft || isSendingProposal}
                className="px-4 py-2 border border-indigo-100 rounded-lg text-slate-600 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingDraft ? 'Saving...' : 'Save as draft'}
              </button>
              {currentStep === 6 ? (
                <button 
                  onClick={() => createProposal('sent')}
                  disabled={isSavingDraft || isSendingProposal}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={16} />
                  {isSendingProposal ? 'Creating...' : 'Send proposal'}
                </button>
              ) : (
                <button 
                  onClick={nextStep}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                >
                  Next →
                </button>
              )}
            </div>   
          </div>
        </div>
      </div>
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>,
    document.body
  );
}

export default ProposalBuilder;
