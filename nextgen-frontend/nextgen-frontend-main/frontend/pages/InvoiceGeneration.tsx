import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { timeTrackingService } from '../services/timeTrackingService';
import { jobsService } from '../services/jobsService';
import { invoiceService, InvoiceRequest } from '../services/invoiceService';
import { Trash2, X } from 'lucide-react';

interface InvoiceLineItem {
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

interface InvoiceGenerationProps {
  onClose?: () => void;
  selectedEntryIds?: string[];
  allEntries?: any[];
  originalTimeEntries?: any[];
  clientName?: string;
  clientEmail?: string;
}

const InvoiceGeneration: React.FC<InvoiceGenerationProps> = ({ 
  onClose, 
  selectedEntryIds = [], 
  allEntries = [], 
  originalTimeEntries = [],
  clientName,
  clientEmail
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDestination, setSelectedDestination] = useState<'xero' | 'email'>('xero');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoiceNumber: 'INV-2025-0089',
    clientName: clientName || 'Big Kahuna Burger Ltd.',
    clientEmail: clientEmail || 'john@bigkahunaburger.com',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: 'Net 30',
    lineItems: [
      {
        description: 'Bank Feed Reconciliation (Alice Johnson)',
        hours: 1.75,
        rate: 150,
        amount: 262.50
      },
      {
        description: 'Accounts Receivable Review (Emma Johnson)',
        hours: 2.00,
        rate: 120,
        amount: 240.00
      },
      {
        description: 'Payroll Processing (Alice Johnson)',
        hours: 2.75,
        rate: 150,
        amount: 412.50
      }
    ],
    subtotal: 915.00,
    tax: 91.50,
    total: 1006.50,
    notes: 'Payment due within 30 days. Please reference invoice number.'
  });

  const [emailData, setEmailData] = useState({
    to: clientEmail || 'john@bigkahunaburger.com',
    subject: 'Invoice #INV-2025-0089 — Monthly Bookkeeping Aug 2025',
    message: 'Hi John, please find attached invoice #INV-2025-0089 for Monthly Bookkeeping services rendered in August 2025. Total amount due: $1,006.50. Please don\'t hesitate to reach out with any questions.'
  });

  // Update emailData when invoiceData changes
  useEffect(() => {
    setEmailData({
      to: invoiceData.clientEmail,
      subject: `Invoice #${invoiceData.invoiceNumber}`,
      message: `Hi ${invoiceData.clientName}, please find attached invoice #${invoiceData.invoiceNumber}. Total amount due: $${invoiceData.total.toFixed(2)}. Please don't hesitate to reach out with any questions.`
    });
  }, [invoiceData]);

  // Fetch time entries and jobs data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        let entriesToUse: any[] = [];
        
        if (selectedEntryIds.length > 0 && allEntries.length > 0) {
          // Use selected entries (transformed entries)
          entriesToUse = allEntries.filter(entry => selectedEntryIds.includes(entry.id));
        } else if (selectedEntryIds.length > 0 && originalTimeEntries.length > 0) {
          // Use selected entries (original entries)
          entriesToUse = originalTimeEntries.filter(entry => selectedEntryIds.includes(entry.id));
        } else {
          // Fetch all time entries (fallback)
          const entriesResponse = await timeTrackingService.getAllTimeEntries();
          const allEntries = entriesResponse.data?.entries || [];
          
          // Apply role-based filtering
          const filteredEntries = allEntries.filter((entry: any) => {
            if (user?.roles?.[0] === 'Admin' || user?.roles?.[0] === 'Manager') {
              return true;
            }
            return entry.user_id === user?.id || entry.staff_id === user?.id;
          });
          entriesToUse = filteredEntries;
        }

        // Filter for billable entries only
        const billableEntries = entriesToUse.filter((entry: any) => entry.type === 'Billable');
        setTimeEntries(billableEntries);

        // Fetch jobs
        const jobsResponse = await jobsService.getJobs();
        const allJobs = jobsResponse.data?.jobs || [];
        setJobs(allJobs);

        // Generate invoice from time entries
        if (billableEntries.length > 0) {
          generateInvoiceFromTimeEntries(billableEntries, allJobs);
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedEntryIds, allEntries, originalTimeEntries]);

  // Generate invoice line items from time entries
  const generateInvoiceFromTimeEntries = (entries: any[], allJobs: any[]) => {
    const lineItems: InvoiceLineItem[] = [];
    let subtotal = 0;

    // Filter for billable entries only
    const billableEntries = entries.filter(entry => {
      const isTransformed = entry.task;
      return isTransformed ? entry.type === 'Billable' : entry.type === 'Billable';
    });

    billableEntries.forEach((entry: any) => {
      // Handle both original and transformed entry formats
      const isTransformed = entry.task;
      
      // Find job name
      const job = allJobs.find(j => j.id === entry.job_id);
      const jobName = job?.name || (isTransformed ? entry.job : 'Unknown Job');
      
      // Get task name based on entry format
      const taskName = isTransformed ? entry.task : (entry.task_name || 'Unknown Task');
      
      // Calculate amount (using default rates for now)
      const hours = isTransformed ? 
        ((entry.durationMinutes || 0) / 60) : 
        ((entry.duration_minutes || 0) / 60);
      const rate = 50; // Default rate
      const amount = hours * rate;
      
      lineItems.push({
        description: `${taskName} (${jobName})`,
        hours: parseFloat(hours.toFixed(2)),
        rate,
        amount: parseFloat(amount.toFixed(2))
      });
      
      subtotal += amount;
    });

    const tax = subtotal * 0.1; // 10% GST
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    setInvoiceData(prev => ({
      ...prev,
      invoiceNumber,
      lineItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      notes: `Payment due within 30 days. Please reference invoice ${invoiceNumber}`
    }));

    setEmailData(prev => ({
      ...prev,
      subject: `Invoice #${invoiceNumber} — Monthly Bookkeeping ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
      message: `Hi John, please find attached invoice #${invoiceNumber} for Monthly Bookkeeping services rendered in ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Total amount due: $${total.toFixed(2)}. Please don't hesitate to reach out with any questions.`
    }));
  };

  const handleDestinationSelect = (destination: 'xero' | 'email') => {
    setSelectedDestination(destination);
  };

  const handleGoStep = (step: number) => {
    setCurrentStep(step);
  };

  const handleSubmitInvoice = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare invoice data for API submission
      const invoiceRequest: InvoiceRequest = {
        invoiceNumber: invoiceData.invoiceNumber,
        clientName: invoiceData.clientName,
        clientEmail: invoiceData.clientEmail,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        terms: invoiceData.terms,
        notes: invoiceData.notes,
        lineItems: invoiceData.lineItems,
        subtotal: calculatedTotals.subtotal, // Use calculated totals
        tax: calculatedTotals.tax,
        total: calculatedTotals.total
      };

      if (selectedDestination === 'xero') {
        // Push to Xero
        const result = await invoiceService.pushToXero({ invoiceData: invoiceRequest });
        if (result.success) {
          console.log('Invoice successfully pushed to Xero:', result.xeroInvoiceId);
        } else {
          throw new Error(result.message);
        }
      } else {
        // Send via email
        const emailRequest = {
          to: emailData.to,
          subject: emailData.subject,
          message: emailData.message,
          invoiceData: invoiceRequest
        };
        
        const result = await invoiceService.sendInvoice(emailRequest);
        if (result.success) {
          console.log('Invoice successfully sent via email');
        } else {
          throw new Error(result.message);
        }
      }

      // Move to success step
      setCurrentStep(4);
    } catch (error: any) {
      console.error('Failed to submit invoice:', error);
      // You could add a toast notification here
      alert(`Failed to submit invoice: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToJob = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/time-tracking');
    }
  };

  const handleOpenInXero = () => {
    // Open Xero in new tab
    window.open('https://go.xero.com/', '_blank');
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step < currentStep
                  ? 'bg-green-600 text-white'
                  : step === currentStep
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step < currentStep ? (
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < 3 && (
              <div
                className={`w-6 h-0.5 ${
                  step < currentStep ? 'bg-green-600' : 'bg-gray-100'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Create Invoice</h3>
        <p className="text-xs text-gray-500 mb-5">Edit invoice details before generating.</p>
      </div>

      {/* Invoice Details */}
      <div className="border border-indigo-200 rounded-lg overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gray-900 p-4 flex justify-between items-center">
          <div className="text-white">
            <span className="font-bold text-lg">NEX</span>
            <span className="text-indigo-400 font-bold text-lg">T</span>
            <span className="font-bold text-lg">GEN</span>
            <span className="text-xs font-normal text-gray-400 ml-1.5">Accountants Business Advisors</span>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-semibold">INVOICE</p>
            <p className="text-gray-400 text-xs mt-0.5">#{invoiceData.invoiceNumber}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Bill to + Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Bill to</label>
              <input
                type="text"
                value={invoiceData.clientName}
                onChange={(e) => setInvoiceData({...invoiceData, clientName: e.target.value})}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm font-semibold text-gray-900"
              />
              <input
                type="email"
                value={invoiceData.clientEmail}
                onChange={(e) => setInvoiceData({...invoiceData, clientEmail: e.target.value})}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs text-gray-500 mt-2"
              />
            </div>
            <div className="text-left">
              <div className="grid grid-cols-2 gap-x-2 text-xs">
                <div>
                  <label className="text-gray-500 block mb-1">Invoice date:</label>
                  <input
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                    className="text-gray-900 font-medium px-2 py-1 border border-indigo-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Due date:</label>
                  <input
                    type="date"
                    value={invoiceData.dueDate}
                    onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                    className="text-gray-900 font-medium px-2 py-1 border border-indigo-200 rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">Terms:</label>
                  <input
                    type="text"
                    value={invoiceData.terms}
                    onChange={(e) => setInvoiceData({...invoiceData, terms: e.target.value})}
                    className="text-gray-900 font-medium px-2 py-1 border border-indigo-200 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Editable Line Items */}
          <div>
            <div className="flex justify-end items-center mb-2">
              <button
                onClick={() => {
                  setInvoiceData({
                    ...invoiceData,
                    lineItems: [...invoiceData.lineItems, {
                      description: '',
                      hours: 0,
                      rate: 0,
                      amount: 0
                    }]
                  });
                }}
                className="px-3 py-1 border border-indigo-500 text-indigo-500 text-xs font-medium rounded-lg bg-white hover:bg-indigo-50 transition-colors"
              >
                + Add Item
              </button>
            </div>
            
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-50 border-b border-indigo-100">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Description</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Hours</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = [...invoiceData.lineItems];
                          newItems[index].description = e.target.value;
                          newItems[index].amount = newItems[index].hours * newItems[index].rate;
                          setInvoiceData({
                            ...invoiceData,
                            lineItems: newItems
                          });
                        }}
                        className="w-60 px-2 py-1 border border-indigo-200 rounded text-gray-900"
                        placeholder="Enter description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.hours}
                        onChange={(e) => {
                          const newItems = [...invoiceData.lineItems];
                          newItems[index].hours = parseFloat(e.target.value) || 0;
                          newItems[index].amount = newItems[index].hours * newItems[index].rate;
                          setInvoiceData({
                            ...invoiceData,
                            lineItems: newItems
                          });
                        }}
                        className="w-16 px-2 py-1 border border-indigo-200 rounded text-right text-gray-600"
                        step="0.1"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newItems = [...invoiceData.lineItems];
                          newItems[index].rate = parseFloat(e.target.value) || 0;
                          newItems[index].amount = newItems[index].hours * newItems[index].rate;
                          setInvoiceData({
                            ...invoiceData,
                            lineItems: newItems
                          });
                        }}
                        className="w-20 px-2 py-1 border border-indigo-200 rounded text-right text-gray-600"
                        min="0"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          const newItems = invoiceData.lineItems.filter((_, i) => i !== index);
                          setInvoiceData({
                            ...invoiceData,
                            lineItems: newItems
                          });
                        }}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Editable Notes */}
          <div className="border-t border-indigo-100 pt-3">
            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Notes / Payment terms</label>
            <textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-xs text-gray-600 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => onClose()}
          className="px-5 py-2 border border-red-200 bg-white text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => handleGoStep(2)}
          disabled={invoiceData.lineItems.length === 0}
          className={`px-6 py-2 text-sm font-semibold rounded-lg transition-colors ${
            invoiceData.lineItems.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-500 text-white hover:bg-indigo-600'
          }`}
        >
          Next — Preview Invoice →
        </button>
      </div>
    </div>
  );

  // Calculate totals using useMemo to prevent infinite re-renders
  const calculatedTotals = useMemo(() => {
    const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * 0.1; // 10% GST
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  }, [invoiceData.lineItems]);

  const renderStep2 = () => {

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Review Invoice</h3>
          <p className="text-xs text-gray-500 mb-5">Final invoice preview. Click back to make changes.</p>
        </div>

        <div className="border border-indigo-200 rounded-lg overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gray-900 p-4 flex justify-between items-center">
          <div className="text-white">
            <span className="font-bold text-lg">Practis Manager</span>
            <span className="text-xs font-normal text-gray-400 ml-1.5">Accountants</span>
          </div>
          <div className="text-right">
            <p className="text-white text-sm font-semibold">INVOICE</p>
            <p className="text-gray-400 text-xs mt-0.5">#{invoiceData.invoiceNumber}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Bill to + Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bill to</p>
              <p className="text-sm font-semibold text-gray-900">{invoiceData.clientName}</p>
              <p className="text-xs text-gray-500">{invoiceData.clientEmail}</p>
            </div>
            <div className="text-right flex justify-end">
              <div className="grid grid-cols-2 gap-x-4 text-xs">
                <span className="text-gray-500">Invoice date:</span>
                <span className="text-gray-900 font-medium">{new Date(invoiceData.invoiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-gray-500">Due date:</span>
                <span className="text-gray-900 font-medium">{new Date(invoiceData.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-gray-500">Terms:</span>
                <span className="text-gray-900 font-medium">{invoiceData.terms}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-50 border-b border-indigo-100">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Description</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Hours</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Rate</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.lineItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-900">{item.description}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{item.hours}h</td>
                  <td className="px-3 py-2 text-right text-gray-600">${item.rate}/h</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-48 space-y-1">
              <div className="flex justify-between py-1 border-b border-indigo-100">
                <span className="text-xs text-gray-500">Subtotal</span>
                <span className="text-xs text-gray-900 font-medium">${calculatedTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-indigo-100">
                <span className="text-xs text-gray-500">GST (10%)</span>
                <span className="text-xs text-gray-900 font-medium">${calculatedTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-indigo-500">${calculatedTotals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-indigo-100 pt-3">
            <label className="text-xs text-gray-500 uppercase tracking-wide block mb-2">Notes / Payment terms</label>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{invoiceData.notes}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
        <button
          onClick={() => handleGoStep(1)}
          className="px-5 py-2 border border-indigo-200 bg-white text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
         <button
          onClick={() => onClose()}
          className="px-5 py-2 border border-red-200 bg-white text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancel
        </button>
        </div>
        <button
          onClick={() => handleGoStep(3)}
          className="px-6 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
        >
          Next — Send Invoice →
        </button>
      </div>
    </div>
    );
  }  

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Where should this invoice go?</h3>
        <p className="text-xs text-gray-500 mb-5">
          Invoice #{invoiceData.invoiceNumber} · ${calculatedTotals.total.toFixed(2)} · {invoiceData.clientName}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Xero Option */}
        <div
          onClick={() => handleDestinationSelect('xero')}
          className={`border-2 rounded-lg p-5 cursor-pointer text-center transition-all ${
            selectedDestination === 'xero'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-indigo-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="w-11 h-11 bg-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">X</span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Push to Xero</h4>
          <p className="text-xs text-gray-500 mb-3">Saved as draft invoice in Xero. Review and approve before sending to client.</p>
          <div className="inline-block px-3 py-1.5 bg-green-100 rounded-md">
            <span className="text-xs text-green-700 font-semibold">Recommended</span>
          </div>
        </div>

        {/* Email Option */}
        <div
          onClick={() => handleDestinationSelect('email')}
          className={`border-2 rounded-lg p-5 cursor-pointer text-center transition-all ${
            selectedDestination === 'email'
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-indigo-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Email to client</h4>
          <p className="text-xs text-gray-500">Send directly to {invoiceData.clientEmail} as a PDF attachment.</p>
        </div>
      </div>

      {/* Email Preview */}
      {selectedDestination === 'email' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Email preview</p>
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-10">To:</span>
              <input
                type="text"
                value={emailData.to}
                onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                className="flex-1 px-2.5 py-1.5 border border-indigo-200 rounded-md text-xs"
              />
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500 w-10">Subject:</span>
              <input
                type="text"
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                className="flex-1 px-2.5 py-1.5 border border-indigo-200 rounded-md text-xs"
              />
            </div>
            <textarea
              value={emailData.message}
              onChange={(e) => setEmailData({...emailData, message: e.target.value})}
              className="w-full px-2.5 py-1.5 border border-indigo-200 rounded-md text-xs resize-none"
              rows={4}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
        <button
          onClick={() => handleGoStep(2)}
          className="px-5 py-2 border border-indigo-200 bg-white text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
         <button
          onClick={() => onClose()}
          className="px-5 py-2 border border-red-200 bg-white text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancel
        </button>
        </div>
        <button
          onClick={handleSubmitInvoice}
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : selectedDestination === 'xero' ? 'Push to Xero' : 'Send Invoice'}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-12">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1.5">
        {selectedDestination === 'xero' ? 'Invoice pushed to Xero' : 'Invoice sent to client'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {selectedDestination === 'xero' 
          ? `Invoice #${invoiceData.invoiceNumber} saved as draft in Xero. Open Xero to review and send to client.`
          : `Invoice #${invoiceData.invoiceNumber} emailed to ${invoiceData.clientEmail} as a PDF attachment.`
        }
      </p>
      <div className="flex justify-center gap-2.5">
        <button
          onClick={handleBackToJob}
          className="px-5 py-2 border border-indigo-200 bg-white text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to job
        </button>
        {selectedDestination === 'xero' && (
          <button
            onClick={handleOpenInXero}
            className="px-5 py-2 bg-cyan-500 text-white text-sm font-semibold rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Open in Xero
          </button>
        )}
      </div>
    </div>
  );


  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-200 flex items-center justify-between z-10">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Generate Invoice</h2>
          {/* <p className="text-xs text-gray-500 mt-0.5">Monthly Bookkeeping · Big Kahuna Burger Ltd.</p> */}
        </div>
        <div>
          {renderStepIndicator()}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading time entries...</p>
        </div>
      ) : (
        /* Steps */
        <div className="p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
      )}
    </div>
  );
};

export default InvoiceGeneration;
