import React from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';
import { generateProposalPDF } from '../../utils/pdfUtils';

interface ProposalPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
  signatureBase64?: string;
}

const ProposalPDFModal: React.FC<ProposalPDFModalProps> = ({ isOpen, onClose, proposal, signatureBase64 }) => {
  if (!isOpen || !proposal) return null;


  const handleDownload = async () => {
    const success = await generateProposalPDF(proposal, true, signatureBase64);
    if (!success) {
      alert('Failed to generate PDF. Please try again.');
    }
    onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#0f1f3d] px-6 py-4 flex items-center justify-between flex-shrink-0 pdf-modal-header">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#6366f1] rounded-lg flex items-center justify-center text-sm font-bold text-white">
                NG
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Practis Manager</div>
              <div className="text-[#7a94bb] text-xs">Chartered Accountants · Adelaide SA</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* PDF Content - Printable Area */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-6 pdf-content-wrapper">
          <div className="bg-white max-w-[210mm] mx-auto shadow-lg p-8 pdf-content" style={{ minHeight: '297mm' }}>
            {/* PDF Header */}
            <div className="border-b-2 border-[#6366f1] pb-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#6366f1] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  NG
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#0f1f3d]">Practis Manager</h1>
                  <p className="text-sm text-[#888]">Chartered Accountants · Adelaide SA</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#888]">Proposal</p>
                <p className="text-lg font-bold text-[#0f1f3d]">{proposal.title || 'Proposal'}</p>
                <p className="text-sm text-[#6366f1]">Status: Accepted</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-bold text-[#0f1f3d] mb-2 uppercase tracking-wider">Prepared For</h3>
                <p className="text-sm text-[#555] font-semibold">{proposal.client || 'Client'}</p>
                <p className="text-sm text-[#555]">{proposal.clientEmail || ''}</p>
                {proposal.contact_name && <p className="text-sm text-[#555]">{proposal.contact_name}</p>}
              </div>
              <div className="text-right">
                <h3 className="text-sm font-bold text-[#0f1f3d] mb-2 uppercase tracking-wider">Proposal Details</h3>
                <p className="text-sm text-[#555]">
                  <span className="font-semibold">Accepted:</span> {proposal.acceptedDate || '---'}
                </p>
                <p className="text-sm text-[#555]">
                  <span className="font-semibold">Expiry:</span> {proposal.expiryDate || '---'}
                </p>
                <p className="text-sm text-[#555]">
                  <span className="font-semibold">Total:</span> {proposal.value || '$0.00'}
                </p>
              </div>
            </div>

            {/* Description */}
            {proposal.description && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#0f1f3d] mb-2 uppercase tracking-wider">Description</h3>
                <p className="text-sm text-[#555] leading-relaxed">{proposal.description}</p>
              </div>
            )}

            {/* Services Table */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#0f1f3d] mb-2 uppercase tracking-wider">Services</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#f5f5ff]">
                    <th className="py-2 px-3 text-left font-semibold text-[#0f1f3d] border-b border-[#c7d2fe]">Service</th>
                    <th className="py-2 px-3 text-left font-semibold text-[#0f1f3d] border-b border-[#c7d2fe]">Type</th>
                    <th className="py-2 px-3 text-center font-semibold text-[#0f1f3d] border-b border-[#c7d2fe]">Qty</th>
                    <th className="py-2 px-3 text-right font-semibold text-[#0f1f3d] border-b border-[#c7d2fe]">Rate</th>
                    <th className="py-2 px-3 text-right font-semibold text-[#0f1f3d] border-b border-[#c7d2fe]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.service_lines?.map((line: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[#fafbff]'}>
                      <td className="py-2 px-3 border-b border-[#eef2ff]">
                        <div className="font-medium text-[#0f1f3d]">{line.service}</div>
                        {line.description && <div className="text-xs text-[#888]">{line.description}</div>}
                      </td>
                      <td className="py-2 px-3 border-b border-[#eef2ff]">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#eef2ff] text-[#6366f1]">
                          {line.type || 'Fixed'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center border-b border-[#eef2ff] text-[#555]">{line.quantity || 1}</td>
                      <td className="py-2 px-3 text-right border-b border-[#eef2ff] text-[#555]">
                        ${line.rate ? parseFloat(line.rate).toFixed(2) : '0.00'}
                      </td>
                      <td className="py-2 px-3 text-right border-b border-[#eef2ff] font-semibold text-[#0f1f3d]">
                        ${line.total ? parseFloat(line.total).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mb-6">
              <div className="bg-[#f5f5ff] rounded-lg p-4">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-[#888]">Subtotal (ex. GST)</span>
                  <span className="text-sm text-[#0f1f3d]">
                    ${proposal.value ? (parseFloat(proposal.value.replace(/[$,]/g, '')) / 1.1).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-[#888]">GST (10%)</span>
                  <span className="text-sm text-[#0f1f3d]">
                    ${proposal.value ? ((parseFloat(proposal.value.replace(/[$,]/g, '')) / 1.1) * 0.1).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-[#6366f1]">
                  <span className="text-base font-bold text-[#0f1f3d]">Total</span>
                  <span className="text-xl font-bold text-[#6366f1]">{proposal.value || '$0.00'}</span>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#0f1f3d] mb-2 uppercase tracking-wider">Billing Information</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Billing Type</p>
                  <p className="font-semibold text-[#0f1f3d]">{proposal.billingType || 'Fixed fee'}</p>
                </div>
                <div>
                  <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Cycle</p>
                  <p className="font-semibold text-[#0f1f3d]">
                    {proposal.billingType === 'Recurring' ? 'Monthly' : 'One-time'}
                  </p>
                </div>
                <div>
                  <p className="text-[#888] text-xs uppercase tracking-wider mb-1">Payment</p>
                  <p className="font-semibold text-[#0f1f3d]">Direct debit</p>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            {signatureBase64 && (
              <div className="mt-6 pt-6 border-t border-[#c7d2fe]">
                <h3 className="text-sm font-bold text-[#0f1f3d] mb-4 uppercase tracking-wider">Signature</h3>
                <div className="bg-[#fafbff] rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={`data:image/png;base64,${signatureBase64}`}
                      alt="Signature"
                      className="h-16 w-auto"
                    />
                    <div className="text-xs text-[#888]">
                      <p>Electronically signed</p>
                      <p>{proposal.acceptedDate || '---'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-auto pt-6 border-t border-[#c7d2fe]">
              <div className="flex justify-between items-start text-xs text-[#888]">
                <div>
                  <p className="font-semibold text-[#0f1f3d] mb-1">Practis Manager</p>
                  <p>Chartered Accountants</p>
                  <p>Adelaide SA, Australia</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#0f1f3d] mb-1">Contact</p>
                  <p>info@practismanager.com</p>
                  <p>+61 8 1234 5678</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#eef2ff] text-center text-xs text-[#888]">
                <p>This proposal was accepted on {proposal.acceptedDate || '---'}</p>
                <p>Generated by Practis Management System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white border-t border-[#c7d2fe] px-6 py-4 flex justify-end gap-3 flex-shrink-0 pdf-modal-footer">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-[#6366f1] text-white rounded-lg text-sm font-medium hover:bg-[#4f52d4] transition-colors flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#c7d2fe] rounded-lg text-sm font-medium text-[#555] hover:bg-[#f5f5ff] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body
  );
};

export default ProposalPDFModal;
