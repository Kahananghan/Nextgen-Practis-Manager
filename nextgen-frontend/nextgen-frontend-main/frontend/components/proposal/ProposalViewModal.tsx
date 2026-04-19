import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calendar, DollarSign, User, Clock } from 'lucide-react';

interface ProposalViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
}

const ProposalViewModal: React.FC<ProposalViewModalProps> = ({ isOpen, onClose, proposal }) => {
  if (!isOpen || !proposal) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0f1f3d] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6366f1] rounded-lg flex items-center justify-center text-sm font-bold text-white">
              NG
            </div>
            <div>
              <div className="text-white text-lg font-semibold">Practis Manager</div>
              <div className="text-[#7a94bb] text-xs">Chartered Accountants · Adelaide SA</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f5f5ff]">
          {/* Proposal Cover */}
          <div className="bg-[#0f1f3d] rounded-2xl p-8 mb-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-[200px] h-[200px] bg-[rgba(99,102,241,0.15)] rounded-full" />
            <div className="absolute -bottom-[60px] right-5 w-[140px] h-[140px] bg-[rgba(99,102,241,0.08)] rounded-full" />
            <div className="relative z-10">
              <div className="text-xs text-[#7a94bb] uppercase tracking-wider mb-2">
                Proposal from Practis Manager
              </div>
              <div className="text-2xl font-bold text-white mb-4">{proposal.title || 'Proposal'}</div>
              <div className="flex gap-6 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#7a94bb] uppercase tracking-wider">Prepared for</span>
                  <span className="text-sm text-[#e2e8f0] font-medium">{proposal.client || 'Client'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#7a94bb] uppercase tracking-wider">Contact</span>
                  <span className="text-sm text-[#e2e8f0] font-medium">{proposal.clientEmail || 'Contact'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#7a94bb] uppercase tracking-wider">Total value</span>
                  <span className="text-sm text-[#a5b4fc] font-medium">${proposal.value || '0.00'} inc. GST</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#7a94bb] uppercase tracking-wider">Status</span>
                  <span className="text-sm text-[#34d399] font-medium">Accepted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
              <span className="text-sm font-semibold text-[#0f1f3d]">Services included</span>
              <span className="text-xs text-[#888]">{proposal.service_lines?.length || 0} {proposal.service_lines?.length === 1 ? 'service' : 'services'}</span>
            </div>
            <div className="overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="py-2 px-3 bg-[#f5f5ff] text-left text-xs font-semibold text-[#888] uppercase tracking-wider">Service</th>
                    <th className="py-2 px-3 bg-[#f5f5ff] text-left text-xs font-semibold text-[#888] uppercase tracking-wider">Type</th>
                    <th className="py-2 px-3 bg-[#f5f5ff] text-center text-xs font-semibold text-[#888] uppercase tracking-wider">Qty</th>
                    <th className="py-2 px-3 bg-[#f5f5ff] text-right text-xs font-semibold text-[#888] uppercase tracking-wider">Rate</th>
                    <th className="py-2 px-3 bg-[#f5f5ff] text-right text-xs font-semibold text-[#888] uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.service_lines?.map((line: any, index: number) => (
                    <tr key={index}>
                      <td className={`py-3 px-3 ${index < (proposal.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-[#0f1f3d]`}>
                        <div className="font-medium">{line.service}</div>
                        {line.description && <div className="text-xs text-[#888]">{line.description}</div>}
                      </td>
                      <td className={`py-3 px-3 ${index < (proposal.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''}`}>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[#eef2ff] text-[#6366f1]">{line.type || 'Fixed'}</span>
                      </td>
                      <td className={`py-3 px-3 ${index < (proposal.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-center text-[#555]`}>{line.quantity || 1}</td>
                      <td className={`py-3 px-3 ${index < (proposal.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-right text-[#555]`}>${line.rate ? parseFloat(line.rate).toFixed(2) : '0.00'}</td>
                      <td className={`py-3 px-3 ${index < (proposal.service_lines?.length || 0) - 1 ? 'border-b border-[#f5f5ff]' : ''} text-right font-semibold`}>${line.amount ? parseFloat(line.amount).toFixed(2) : '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3.5">
                <div className="bg-[#f5f5ff] rounded-xl p-3.5">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-[#888]">Subtotal (ex. GST)</span>
                    <span className="text-xs text-[#0f1f3d]">${proposal.value ? (parseFloat(proposal.value.replace(/[$,]/g, '')) / 1.1).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-[#888]">GST (10%)</span>
                    <span className="text-xs text-[#0f1f3d]">${proposal.value ? ((parseFloat(proposal.value.replace(/[$,]/g, '')) / 1.1) * 0.1).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5 pt-2 border-t border-[#c7d2fe]">
                    <span className="text-sm font-bold text-[#0f1f3d]">Total</span>
                    <span className="text-base font-bold text-[#6366f1]">{proposal.value || '$0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="bg-white rounded-xl border border-[#c7d2fe] mb-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
              <span className="text-sm font-semibold text-[#0f1f3d]">Billing & payment</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534]">
                {proposal.billingType === 'Recurring' ? 'Recurring' : 'One-off'}
              </span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-1">Amount</div>
                  <div className="text-lg font-bold text-[#0f1f3d]">
                    {proposal.value || '$0.00'}
                    <span className="text-xs font-normal text-[#888]">
                      {proposal.billingType === 'Recurring' ? '/month' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-[#888] mt-0.5">inc. GST</div>
                </div>
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-1">Billing cycle</div>
                  <div className="text-sm font-semibold text-[#0f1f3d]">
                    {proposal.billingType === 'Recurring' ? 'Monthly' : 'One-time'}
                  </div>
                  {proposal.start_date && (
                    <div className="text-xs text-[#888] mt-0.5">
                      Starting {new Date(proposal.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-1">Accepted on</div>
                  <div className="text-sm font-semibold text-[#0f1f3d]">
                    {proposal.acceptedDate || '---'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal Details */}
          <div className="bg-white rounded-xl border border-[#c7d2fe]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5ff]">
              <span className="text-sm font-semibold text-[#0f1f3d]">Proposal details</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Description</div>
                  <div className="text-sm text-[#0f1f3d]">{proposal.description || 'No description provided'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Expiry date</div>
                  <div className="text-sm text-[#0f1f3d]">{proposal.expiryDate || '---'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User size={16} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Contact name</div>
                  <div className="text-sm text-[#0f1f3d]">{proposal.contact_name || '---'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-[#6366f1] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Times opened</div>
                  <div className="text-sm text-[#0f1f3d]">{proposal.openCount || 0} time{proposal.openCount !== 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-[#c7d2fe] px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#c7d2fe] rounded-lg text-sm font-medium text-[#555] hover:bg-[#f5f5ff] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProposalViewModal;
