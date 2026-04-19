import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { proposalService } from '../../services/proposalService';
import { generateProposalPDF } from '../../utils/pdfUtils';

interface ProposalClientViewProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ProposalData {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  contact_name: string;
  cover_message: string;
  total_value: string;
  subtotal: string;
  gst_amount: string;
  status: string;
  expiry_date: string;
  service_lines: any[];
  billing_settings: any;
  firm_name?: string;
  firm_details?: {
    name: string;
    abn?: string;
    address?: string;
  };
  letter?: string;
  terms?: string;
}

const ProposalClientView: React.FC<ProposalClientViewProps> = ({ isOpen = true, onClose }) => {
  const { token } = useParams<{ token: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [letterOpen, setLetterOpen] = useState(false);
  const [tcsRead, setTcsRead] = useState(false);
  const [tcsAgreed, setTcsAgreed] = useState(false);
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineComments, setDeclineComments] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signaturePresignedUrl, setSignaturePresignedUrl] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const hasFetched = useRef(false);

  const fetchProposal = useCallback(async (force = false) => {
    if (!token) return;

    // Only prevent duplicate calls if not forced (manual retry)
    if (!force && hasFetched.current) return;

    hasFetched.current = true;
    setLoading(true);
    setError('');

    try {
      const data = await proposalService.getPublicProposal(token);
      setProposal(data.data);

      // Set TCS as read and agreed if already accepted
      if (data.data?.status === 'accepted' || data.data?.status === 'viewed') {
        setTcsRead(true);
        setTcsAgreed(true);
      }

      // If terms were already agreed, auto-advance to step 2 (signature)
      if (data.data?.terms_agreed_at) {
        setTcsRead(true);
        setTcsAgreed(true);
        setCurrentStep(2);
      }

      // Fetch presigned URL if proposal has signature
      if (data.data?.signature_data?.file && token) {
        try {
          const presignedResult = await proposalService.getSignatureUrl(token);
          if (presignedResult.success) {
            setSignaturePresignedUrl(presignedResult.data.presignedUrl);
          }

          // Also fetch base64 for PDF generation (avoids CORS)
          const base64Result = await proposalService.getSignatureImage(token);
          if (base64Result.success) {
            setSignatureBase64(base64Result.data.base64);
          }
        } catch (err) {
          console.error('Error fetching signature:', err);
        }
      }
    } catch (err: any) {
      console.error('Error fetching proposal:', err);
      setError(err.response?.data?.message || 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProposal();
  }, [fetchProposal]);

  useEffect(() => {
    if (currentStep === 2) {
      initCanvas();
    }
  }, [currentStep]);

  useEffect(() => {
    if (toastMessage) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setToastMessage('');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleTCSCheck = async (checked: boolean) => {
    setTcsAgreed(checked);
    if (checked && token) {
      // Track when client agrees to terms
      try {
        await proposalService.trackTermsAgreed(token);
      } catch (err) {
        console.error('Error tracking terms agreement:', err);
        // Don't show error to user, just log it
      }
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSigModeChange = (mode: 'draw' | 'type') => {
    setSigMode(mode);
    setHasSignature(false);
    setTypedName('');
  };

  // Convert typed name to signature image using canvas
  const typedNameToImage = (name: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set background to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set font for signature
    ctx.font = 'italic 48px Georgia, serif';
    ctx.fillStyle = '#0f1f3d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw the name
    ctx.fillText(name, canvas.width / 2, canvas.height / 2);

    // Convert to base64
    return canvas.toDataURL('image/png');
  };

  const handleTcsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!tcsRead && el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setTcsRead(true);
      showToastMessage('T&Cs fully read. You can now accept the proposal.');
    }
  };

  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;
    
    canvas.width = wrap.offsetWidth || 716;
    canvas.height = 136;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#0f1f3d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    isDrawing.current = true;
    lastX.current = e.clientX - rect.left;
    lastY.current = e.clientY - rect.top;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    lastX.current = x;
    lastY.current = y;
    setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    isDrawing.current = true;
    lastX.current = touch.clientX - rect.left;
    lastY.current = touch.clientY - rect.top;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    lastX.current = x;
    lastY.current = y;
    setHasSignature(true);
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
  };

  const submitSignature = async () => {
    if (!token || !proposal) return;

    setSubmitting(true);
    try {
      let signatureData = '';
      let signatureUrl = '';

      // Convert signature to image and upload to R2
      if (sigMode === 'draw' && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL('image/png');
      } else if (sigMode === 'type' && typedName) {
        signatureData = typedNameToImage(typedName);
      }

      if (signatureData) {
        // Upload signature image to R2
        const blob = await (await fetch(signatureData)).blob();
        const file = new File([blob], 'signature.png', { type: 'image/png' });

        const uploadResult = await proposalService.uploadSignature(token, file);

        if (uploadResult.success) {
          signatureUrl = uploadResult.data.signatureUrl;
        } else {
          throw new Error(uploadResult.message || 'Failed to upload signature');
        }
      }

      // Call API to accept proposal with R2 signature URL
      await proposalService.acceptProposal(token, {
        signature_type: sigMode,
        signature_data: signatureUrl, // Store R2 URL instead of base64
        typed_name: sigMode === 'type' ? typedName : '',
        full_name: sigMode === 'type' ? typedName : ''
      });

      goToStep(3);
    } catch (err: any) {
      console.error('Error accepting proposal:', err);
      showToastMessage(err.response?.data?.message || 'Failed to submit signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDecline = async () => {
    if (!token) return;

    setSubmitting(true);
    try {
      const reason = declineReason || declineComments || 'No reason provided';
      await proposalService.declineProposal(token, reason);
      setShowDeclineModal(false);
      setDeclineReason('');
      setDeclineComments('');
      showToastMessage(`Proposal declined. ${proposal?.firm_name || 'The firm'} has been notified.`);
      // Optionally redirect or show declined state
    } catch (err: any) {
      console.error('Error declining proposal:', err);
      showToastMessage(err.response?.data?.message || 'Failed to decline proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadPDF = async () => {
    if (!proposal || !token) return;

    // Fetch signature base64 for PDF generation
    let signatureData = signatureBase64;
    if (!signatureData && proposal.signature_data?.file) {
      try {
        const response = await proposalService.getSignatureImage(token);
        if (response.success) {
          signatureData = response.data.base64;
        }
      } catch (err) {
        console.error('Error fetching signature for PDF:', err);
      }
    }

    const success = await generateProposalPDF(proposal, true, signatureData || undefined);
    if (success) {
      showToastMessage('PDF downloaded successfully!');
    } else {
      showToastMessage('Failed to generate PDF. Please try again.');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5ff] font-['Segoe_UI',sans-serif] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6366f1] mx-auto mb-4"></div>
          <p className="text-[#888]">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[#f5f5ff] font-['Segoe_UI',sans-serif] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-[#0f1f3d] mb-2">Unable to load proposal</h2>
          <p className="text-[#888] mb-4">{error || 'Proposal not found'}</p>
          <button
            onClick={() => fetchProposal(true)}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Show declined state if proposal has been declined
  if (proposal.status === 'declined') {
    return (
      <div className="min-h-screen bg-[#f5f5ff] font-['Segoe_UI',sans-serif] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-[#fee2e2] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={40} className="text-[#dc2626]" />
          </div>
          <h2 className="text-xl font-semibold text-[#0f1f3d] mb-2">Proposal Declined</h2>
          <p className="text-sm text-[#888] mb-4">
            This proposal has already been declined. You cannot review or sign this proposal again.
          </p>
          <p className="text-sm text-[#888] mb-6">
            If you have any questions or would like to discuss this further, please contact{' '}
            <strong>{proposal.firm_name || 'the firm'}</strong> at{' '}
            <a href={`mailto:${proposal.firm_details?.email || 'info@practismanager.com'}`} className="text-[#6366f1] underline">
              {proposal.firm_details?.email || 'info@practismanager.com'}
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Show accepted state if proposal has already been accepted
  if (proposal.status === 'accepted') {
    return (
      <div className="min-h-screen bg-[#f5f5ff] font-['Segoe_UI',sans-serif] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4 text-[40px]">
            ✓
          </div>
          <h2 className="text-xl font-semibold text-[#0f1f3d] mb-2">Proposal Already Accepted</h2>
          <p className="text-sm text-[#888] mb-4">
            This proposal has already been accepted and signed. Thank you for your response.
          </p>
          <div className="bg-white rounded-xl border border-[#c7d2fe] p-4 mb-4 text-left">
            <div className="flex justify-between py-1.5 border-b border-[#eef2ff]">
              <span className="text-xs text-[#888]">Accepted by</span>
              <span className="text-[13px] font-semibold text-[#0f1f3d]">{proposal.contact_name || proposal.client_name || 'Client'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-[#888]">Accepted on</span>
              <span className="text-[13px] font-semibold text-[#0f1f3d]">
                {proposal.accepted_date
                  ? new Date(proposal.accepted_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>
          </div>
          <p className="text-sm text-[#888] mb-6">
            A copy of the signed proposal has been sent to your email. If you have any questions, please contact{' '}
            <strong>{proposal.firm_name || 'the firm'}</strong> at{' '}
            <a href={`mailto:${proposal.firm_details?.email || 'info@practismanager.com'}`} className="text-[#6366f1] underline">
              {proposal.firm_details?.email || 'info@practismanager.com'}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5ff] font-['Segoe_UI',sans-serif]">
      {/* Firm Header */}
      <div className="bg-[#0f1f3d] px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#6366f1] rounded-lg flex items-center justify-center text-sm font-bold text-white">
            NG
          </div>
          <div>
            <div className="text-white text-[15px] font-semibold">Practis Manager</div>
            <div className="text-[#7a94bb] text-[11px] mt-0.5">Chartered Accountants · Adelaide SA</div>
          </div>
        </div>
        <div className="bg-[rgba(99,102,241,0.2)] border border-[rgba(99,102,241,0.4)] text-[#a5b4fc] text-[11px] px-3 py-1 rounded-full">
          Secure proposal link
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-[#0f1f3d] border-t border-[rgba(255,255,255,0.06)] px-8">
        <div className="flex max-w-[680px] mx-auto">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              onClick={() => step < currentStep && goToStep(step)}
              className={`flex-1 py-3.5 text-center text-xs font-medium cursor-pointer transition-all border-b-[3px] ${
                step === currentStep
                  ? 'text-white border-b-[#6366f1]'
                  : step < currentStep
                  ? 'text-[#34d399] border-b-[#16a34a]'
                  : 'text-[#7a94bb] border-b-transparent'
              }`}
            >
              {step}. {step === 1 ? 'Review proposal' : step === 2 ? 'Sign & accept' : 'Confirmed'}
            </div>
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-[760px] mx-auto px-4 py-8 pb-20">
        {/* Expired Proposal State */}
        {proposal?.isExpired && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-red-800 mb-1">This proposal has expired</h3>
                <p className="text-sm text-red-700 mb-3">
                  This proposal expired on <strong>
                    {proposal?.expiry_date
                      ? new Date(proposal.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '---'}
                  </strong>. You can no longer sign or accept this proposal.
                </p>
                <div className="text-sm text-red-700 mb-4">
                  Please contact <strong>{proposal?.firm_name || 'the firm'}</strong> at{' '}
                  <a href={`mailto:${proposal?.firm_details?.email || 'info@practismanager.com'}`} className="text-red-600 underline">
                    {proposal?.firm_details?.email || 'info@practismanager.com'}
                  </a>
                  {' '}or call{' '}
                  <a href={`tel:${proposal?.firm_details?.phone || '+61 8 1234 5678'}`} className="text-red-600 underline">
                    {proposal?.firm_details?.phone || '+61 8 1234 5678'}
                  </a>
                  {' '}to request an extension.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Review Proposal */}
        {currentStep === 1 && (
          <div>
            {/* Cover */}
            <div className="bg-[#0f1f3d] rounded-2xl p-8 mb-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-[rgba(99,102,241,0.15)] rounded-full" />
              <div className="absolute -bottom-[60px] right-5 w-[140px] h-[140px] bg-[rgba(99,102,241,0.08)] rounded-full" />
              <div className="relative z-10">
                <div className="text-[11px] text-[#7a94bb] uppercase tracking-wider mb-2">
                  Proposal from Practis Manager
                </div>
                <div className="text-2xl font-bold text-white mb-4">{proposal?.title || 'Proposal'}</div>
                <div className="flex gap-6 flex-wrap">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#7a94bb] uppercase tracking-wider">Prepared for</span>
                    <span className="text-[13px] text-[#e2e8f0] font-medium">{proposal?.client_name || 'Client'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#7a94bb] uppercase tracking-wider">Contact</span>
                    <span className="text-[13px] text-[#e2e8f0] font-medium">{proposal?.client_email || 'Contact'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#7a94bb] uppercase tracking-wider">Total value</span>
                    <span className="text-[13px] text-[#a5b4fc] font-medium">${proposal?.total_value ? parseFloat(proposal.total_value).toFixed(2) : '0.00'} inc. GST</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#7a94bb] uppercase tracking-wider">Expires</span>
                    <span className="text-[13px] text-[#fbbf24] font-medium">
                      {proposal?.expiry_date 
                        ? new Date(proposal.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cover message */}
            {proposal?.cover_message && (
              <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
                <div className="p-5 text-[13px] text-[#555] leading-7 italic">
                  "{proposal.cover_message}"
                </div>
              </div>
            )}

            {/* Services */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
                <span className="text-[13px] font-semibold text-[#0f1f3d]">Services included</span>
                <span className="text-xs text-[#888]">{proposal?.service_lines?.length || 0} {proposal?.service_lines?.length === 1 ? 'service' : 'services'}</span>
              </div>
              <div className="overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="py-2 px-3 bg-[#f5f5ff] text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider">Service</th>
                      <th className="py-2 px-3 bg-[#f5f5ff] text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider">Type</th>
                      <th className="py-2 px-3 bg-[#f5f5ff] text-center text-[11px] font-semibold text-[#888] uppercase tracking-wider">Qty</th>
                      <th className="py-2 px-3 bg-[#f5f5ff] text-right text-[11px] font-semibold text-[#888] uppercase tracking-wider">Rate</th>
                      <th className="py-2 px-3 bg-[#f5f5ff] text-right text-[11px] font-semibold text-[#888] uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposal?.service_lines?.map((line, index) => (
                      <tr key={index}>
                        <td className={`py-3 px-3 ${index < (proposal?.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-[#0f1f3d]`}>
                          <div className="font-medium">{line.service}</div>
                          {line.description && <div className="text-[11px] text-[#888]">{line.description}</div>}
                        </td>
                        <td className={`py-3 px-3 ${index < (proposal?.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''}`}>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#eef2ff] text-[#6366f1]">{line.type || 'Fixed'}</span>
                        </td>
                        <td className={`py-3 px-3 ${index < (proposal?.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-center text-[#555]`}>{line.quantity || 1}</td>
                        <td className={`py-3 px-3 ${index < (proposal?.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-right text-[#555]`}>${line.rate ? parseFloat(line.rate).toFixed(2) : '0.00'}</td>
                        <td className={`py-3 px-3 ${index < (proposal?.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-right font-semibold`}>${line.total ? parseFloat(line.total).toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3.5">
                  <div className="bg-[#f5f5ff] rounded-xl p-3.5">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-[#888]">Subtotal (ex. GST)</span>
                      <span className="text-xs text-[#0f1f3d]">${proposal?.subtotal ? parseFloat(proposal.subtotal).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs text-[#888]">GST (10%)</span>
                      <span className="text-xs text-[#0f1f3d]">${proposal?.gst_amount ? parseFloat(proposal.gst_amount).toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1.5 pt-2 border-t border-[#c7d2fe]">
                      <span className="text-sm font-bold text-[#0f1f3d]">Total</span>
                      <span className="text-base font-bold text-[#6366f1]">${proposal?.total_value ? parseFloat(proposal.total_value).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing & payment */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
                <span className="text-[13px] font-semibold text-[#0f1f3d]">Billing & payment</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534]">
                  {proposal?.billing_settings?.type === 'recurring' ? 'Recurring' : 'One-off'}
                </span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Amount</div>
                    <div className="text-[15px] font-bold text-[#0f1f3d]">
                      ${proposal?.total_value ? parseFloat(proposal.total_value).toFixed(2) : '0.00'}
                      <span className="text-xs font-normal text-[#888]">
                        {proposal?.billing_settings?.type === 'recurring' ? `/${proposal?.billing_settings?.frequency || 'month'}` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#888] mt-0.5">inc. GST</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Billing cycle</div>
                    <div className="text-[13px] font-semibold text-[#0f1f3d]">
                      {proposal?.billing_settings?.type === 'recurring' 
                        ? (proposal?.billing_settings?.frequency || 'Monthly') 
                        : 'One-time'}
                    </div>
                    <div className="text-[11px] text-[#888] mt-0.5">
                      {proposal?.billing_settings?.start_date 
                        ? `Starting ${new Date(proposal.billing_settings.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Payment</div>
                    <div className="text-[13px] font-semibold text-[#0f1f3d]">
                      {proposal?.billing_settings?.payment_method || 'Direct debit'}
                    </div>
                    <div className="text-[11px] text-[#888] mt-0.5">
                      {proposal?.billing_settings?.payment_details || 'Auto-charged'}
                    </div>
                  </div>
                </div>
                <div className="bg-[#eef2ff] rounded-lg py-2.5 px-3.5 mt-4 text-xs text-[#555] border-l-[3px] border-[#6366f1]">
                  By accepting this proposal, you authorise {proposal?.firm_name || 'us'} to charge your nominated payment method.
                </div>
              </div>
            </div>

            {/* Engagement Letter (collapsible) */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
                <span className="text-[13px] font-semibold text-[#0f1f3d]">Engagement letter</span>
                <button 
                  onClick={() => setLetterOpen(!letterOpen)}
                  className="text-xs text-[#6366f1] font-semibold flex items-center gap-1"
                >
                  {letterOpen ? 'Collapse ↑' : 'Read →'}
                </button>
              </div>
              {letterOpen && (
                <div className="p-5">
                  <div 
                    className="text-[13px] text-[#374151] leading-7 bg-[#fafbff] rounded-lg p-5 border border-[#eef2ff] proposal-letter"
                    dangerouslySetInnerHTML={{ __html: proposal?.documents?.letter || '<p>Letter content not available.</p>' }}
                  />
                </div>
              )}
            </div>

            {/* T&Cs */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
                <span className="text-[13px] font-semibold text-[#0f1f3d]">Terms & Conditions</span>
                <span className="text-[11px] text-[#888]">Scroll to read all terms</span>
              </div>
              <div className="p-5">
                <div 
                  className="max-h-[180px] overflow-y-auto text-xs text-[#555] leading-relaxed bg-[#fafbff] rounded-lg border border-[#eef2ff] p-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#c7d2fe] [&::-webkit-scrollbar-thumb]:rounded proposal-terms"
                  onScroll={handleTcsScroll}
                  dangerouslySetInnerHTML={{ __html: proposal?.documents?.terms || '<p>Terms and conditions not available.</p>' }}
                />
                {!tcsRead ? (
                  <div className="text-[11px] text-[#888] mt-2 text-center">↓ Please scroll to read all terms before accepting</div>
                ) : (
                  <div className="flex items-center gap-2 mt-2.5">
                    <input
                      type="checkbox"
                      id="tcsCheck"
                      checked={tcsAgreed}
                      onChange={(e) => handleTCSCheck(e.target.checked)}
                      className="w-4 h-4 accent-[#6366f1] cursor-pointer"
                    />
                    <label htmlFor="tcsCheck" className="text-xs text-[#555] cursor-pointer">
                      I have read and agree to the Terms & Conditions and Engagement Letter
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Accept / Decline */}
            <div className="flex gap-3">
              <button
                onClick={() => goToStep(2)}
                disabled={!tcsRead || !tcsAgreed || proposal?.isExpired}
                className="flex-1 py-3.5 border-none rounded-xl bg-[#6366f1] text-white text-sm font-bold cursor-pointer hover:bg-[#4f52d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Accept & Sign
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={proposal?.isExpired}
                className="py-3.5 px-6 border border-[#c7d2fe] rounded-xl bg-white text-[#888] text-sm cursor-pointer hover:bg-[#fee2e2] hover:text-[#dc2626] hover:border-[#fca5a5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline
              </button>
            </div>
            <div className="text-center mt-3 text-[11px] text-[#888]">
              This proposal expires on <strong className="text-[#d97706]">
                {proposal?.expiry_date 
                  ? new Date(proposal.expiry_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '---'}
              </strong>. Accepting confirms you agree to all services, fees and terms above.
            </div>
          </div>
        )}

        {/* STEP 2: Sign */}
        {currentStep === 2 && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#0f1f3d] mb-1">Sign your engagement letter</h2>
              <p className="text-[13px] text-[#888]">Your signature confirms acceptance of all services, fees and terms outlined in the proposal.</p>
            </div>

            {/* Signing summary */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
              <div className="p-5">
                <div className="flex gap-4 items-start">
                  <div className="w-9 h-9 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-[#0f1f3d] text-sm mb-0.5">{proposal?.title || 'Proposal'} — Engagement Letter</div>
                    <div className="text-xs text-[#888]">{proposal?.client_name || 'Client'} · Prepared by {proposal?.firm_name || 'our firm'}</div>
                    <div className="text-[11px] text-[#16a34a] mt-1 font-semibold">✓ Proposal terms reviewed and agreed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature method tabs */}
            <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
                <span className="text-[13px] font-semibold text-[#0f1f3d]">Your signature</span>
                <div className="flex border border-[#c7d2fe] rounded-lg overflow-hidden w-fit">
                  <button
                    onClick={() => handleSigModeChange('draw')}
                    className={`px-4 py-1.5 text-xs cursor-pointer ${sigMode === 'draw' ? 'bg-[#6366f1] text-white font-semibold' : 'bg-white text-[#555]'}`}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => handleSigModeChange('type')}
                    className={`px-4 py-1.5 text-xs cursor-pointer ${sigMode === 'type' ? 'bg-[#6366f1] text-white font-semibold' : 'bg-white text-[#555]'}`}
                  >
                    Type
                  </button>
                </div>
              </div>
              <div className="p-5">
                {sigMode === 'draw' ? (
                  <div>
                    <p className="text-xs text-[#888] mb-2">Sign using your mouse or touchscreen in the box below.</p>
                    <div 
                      ref={canvasWrapRef}
                      className="border-2 border-dashed border-[#c7d2fe] rounded-xl bg-[#fafbff] relative h-[136px] overflow-hidden cursor-crosshair"
                    >
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className="block"
                      />
                      {!hasSignature && (
                        <div className="absolute inset-0 flex items-center justify-center text-[#c7d2fe] text-[13px] pointer-events-none">
                          Draw your signature here...
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-1.5">
                      <button
                        onClick={clearCanvas}
                        className="text-[11px] text-[#6366f1] font-semibold bg-none border-none p-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-[#888] mb-2">Type your full legal name to create a typed signature.</p>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => {
                        setTypedName(e.target.value);
                        setHasSignature(e.target.value.trim().length > 0);
                      }}
                      placeholder={`e.g. ${proposal?.contact_name || 'Your name'}`}
                      className="w-full py-2 px-3 border border-[#c7d2fe] rounded-lg text-[13px] text-[#0f1f3d] mb-3 focus:outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                    />
                    <div className="border-2 border-dashed border-[#c7d2fe] rounded-lg bg-[#fafbff] h-[100px] flex items-center justify-center overflow-hidden">
                      <div className="font-['Georgia',serif] text-[32px] text-[#0f1f3d] italic tracking-wide">
                        {typedName}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3.5 border-t border-[#f5f5ff]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#0f1f3d] block mb-1.5">Full name</label>
                      <input 
                        type="text" 
                        defaultValue={proposal?.contact_name || ''}
                        placeholder="Your full legal name"
                        className="w-full py-2 px-3 border border-[#c7d2fe] rounded-lg text-[13px] text-[#0f1f3d] focus:outline-none focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#0f1f3d] block mb-1.5">Date</label>
                      <input 
                        type="text" 
                        defaultValue={new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        readOnly
                        className="w-full py-2 px-3 border border-[#c7d2fe] rounded-lg text-[13px] text-[#888] bg-[#f5f5ff]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal notice */}
            <div className="bg-[#eef2ff] rounded-xl p-3.5 text-xs text-[#555] mb-5 border-l-[3px] border-[#6366f1] leading-relaxed">
              By clicking &quot;Sign & Submit&quot; you are applying your electronic signature to this document. This constitutes a legally binding agreement equivalent to a handwritten signature under the <em>Electronic Transactions Act 1999 (Cth)</em>. A signed copy will be emailed to you and your accountant.
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => goToStep(1)}
                className="py-3 px-5 border border-[#c7d2fe] rounded-xl bg-white text-[#555] text-[13px] cursor-pointer"
              >
                ← Back
              </button>
              <button 
                onClick={submitSignature}
                disabled={submitting || !hasSignature}
                className="flex-1 py-3.5 border-none rounded-xl bg-[#6366f1] text-white text-sm font-bold cursor-pointer hover:bg-[#4f52d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Sign & Submit'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {currentStep === 3 && (
          <div>
            <div className="bg-white rounded-xl border border-[#c7d2fe] p-8 text-center">
              <div className="w-16 h-16 bg-[#dcfce7] rounded-full flex items-center justify-center mx-auto mb-4 text-[28px]">
                ✓
              </div>
              <div className="text-[22px] font-bold text-[#0f1f3d] mb-2">Proposal accepted & signed!</div>
              <div className="text-sm text-[#888] mb-6">
                Thank you, {proposal?.contact_name || proposal?.client_name || 'valued client'}. Your engagement letter has been signed and {proposal?.firm_name || 'our firm'} has been notified. You&apos;ll receive a copy by email within a few minutes.
              </div>

              <div className="bg-[#f5f5ff] rounded-xl p-4 mb-4 text-left">
                <div className="flex justify-between py-1.5 border-b border-[#eef2ff]">
                  <span className="text-xs text-[#888]">Accepted by</span>
                  <span className="text-[13px] font-semibold text-[#0f1f3d]">{proposal?.contact_name || proposal?.client_name || 'Client'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#eef2ff]">
                  <span className="text-xs text-[#888]">Date & time</span>
                  <span className="text-[13px] font-semibold text-[#0f1f3d]">{new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#eef2ff]">
                  <span className="text-xs text-[#888]">Proposal</span>
                  <span className="text-[13px] font-semibold text-[#0f1f3d]">{proposal?.title || 'Proposal'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#eef2ff]">
                  <span className="text-xs text-[#888]">Total value</span>
                  <span className="text-[13px] font-semibold text-[#6366f1]">${proposal?.total_value ? parseFloat(proposal.total_value).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-xs text-[#888]">Reference</span>
                  <span className="text-xs font-medium text-[#888] font-mono">{proposal?.id || 'N/A'}</span>
                </div>
              </div>

              <button 
                onClick={downloadPDF}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 border border-[#c7d2fe] rounded-xl bg-white text-[#6366f1] text-[13px] font-semibold cursor-pointer hover:bg-[#eef2ff] transition-colors mb-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download signed PDF
              </button>

              <div className="text-xs text-[#888] leading-relaxed">
                A copy of this signed document has been emailed to <strong>{proposal?.client_email || 'you'}</strong> and your accountant at <strong>{'info@practismanager@gmail.com'}</strong>.
                <br /><br />
                If you have any questions about your engagement, please contact us at <span className="text-[#6366f1]">{'info@practismanager@gmail.com'}</span> or call <span className="text-[#6366f1]">{'+61 8 1234 5678'}</span>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <div
          className="fixed inset-0 bg-[rgba(15,31,61,0.5)] z-[100] flex items-center justify-center"
          onClick={() => setShowDeclineModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-[440px] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[#0f1f3d] mb-1">Decline this proposal</h3>
            <p className="text-xs text-[#888] mb-4">You don&apos;t need to give a reason, but it helps {proposal?.firm_name || 'us'} improve our proposals.</p>
            <div className="mb-3">
              <label className="text-xs font-semibold text-[#0f1f3d] block mb-1.5">
                Reason <span className="text-[#888] font-normal">(optional)</span>
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full py-2 px-3 border border-[#c7d2fe] rounded-lg text-[13px] text-[#555] bg-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="">Select a reason...</option>
                <option>Fees are too high</option>
                <option>Engaging a different accountant</option>
                <option>Services not required</option>
                <option>Timing is not right</option>
                <option>Other</option>
              </select>
            </div>
            <div className="mb-5">
              <label className="text-xs font-semibold text-[#0f1f3d] block mb-1.5">
                Additional comments <span className="text-[#888] font-normal">(optional)</span>
              </label>
              <textarea
                value={declineComments}
                onChange={(e) => setDeclineComments(e.target.value)}
                rows={3}
                placeholder="Let us know if there's anything we could have done differently..."
                className="w-full py-2 px-3 border border-[#c7d2fe] rounded-lg text-[13px] text-[#0f1f3d] focus:outline-none focus:border-[#6366f1] resize-y"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 py-2.5 border border-[#c7d2fe] rounded-lg bg-white text-[#555] text-[13px] cursor-pointer"
              >
                Keep reviewing
              </button>
              <button
                onClick={confirmDecline}
                disabled={submitting}
                className="flex-1 py-2.5 border-none rounded-lg bg-[#fee2e2] text-[#dc2626] text-[13px] font-semibold cursor-pointer hover:bg-[#fecaca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Decline proposal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#0f1f3d] text-white py-3 px-5 rounded-xl text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.2)] z-[999]">
          ✓ {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ProposalClientView;
