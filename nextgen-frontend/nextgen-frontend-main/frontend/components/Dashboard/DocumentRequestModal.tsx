import React, { useState } from 'react';
import { X } from 'lucide-react';
import documentRequestsService from '@/services/documentRequestsService';

interface DocumentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  jobName?: string;
  clientName?: string;
  jobId?: string;  
  clientId?: string; 
}

interface DocumentRequestData {
  name: string;
  description: string;
  dueDate: string;
  priority: 'normal' | 'high' | 'urgent';
  reminder: 'none' | '1day' | '3days' | '7days' | 'daily';
  fileTypes: {
    pdf: boolean;
    excel: boolean;
    word: boolean;
    image: boolean;
    any: boolean;
  };
  notifyClient: boolean;
}

const DocumentRequestModal: React.FC<DocumentRequestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  jobName,
  clientName,
  jobId,      
  clientId   
}) => {
  const [formData, setFormData] = useState<DocumentRequestData>({
    name: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    priority: 'normal',
    reminder: '3days',
    fileTypes: {
      pdf: true,
      excel: true,
      word: false,
      image: false,
      any: false
    },
    notifyClient: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const priorityMap = {
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent'
  };

  const reminderMap = {
    none: 'None',
    '1day': '1 day before',
    '3days': '3 days before',
    '7days': '7 days before',
    daily: 'Daily until uploaded'
  };

  const priorityColor = {
    normal: '#6366f1',
    high: '#d97706',
    urgent: '#e05252'
  };

  const updateFormData = (field: keyof DocumentRequestData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateFileType = (type: keyof DocumentRequestData['fileTypes']) => {
    setFormData(prev => {
      if (type === 'any') {
        // Toggle all file types based on 'any' checkbox
        const newValue = !prev.fileTypes.any;
        return {
          ...prev,
          fileTypes: {
            pdf: newValue,
            excel: newValue,
            word: newValue,
            image: newValue,
            any: newValue
          }
        };
      } else {
        // Toggle individual type and update 'any' accordingly
        const newFileTypes = {
          ...prev.fileTypes,
          [type]: !prev.fileTypes[type]
        };
        // If any individual type is unchecked, uncheck 'any'
        // If all specific types are checked, check 'any'
        const allSpecificChecked = newFileTypes.pdf && newFileTypes.excel && newFileTypes.word && newFileTypes.image;
        newFileTypes.any = allSpecificChecked;
        return {
          ...prev,
          fileTypes: newFileTypes
        };
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const response = await documentRequestsService.createDocumentRequest({
        name: formData.name,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        reminder: formData.reminder,
        fileTypes: formData.fileTypes,
        notifyClient: formData.notifyClient,
        assignedStaffId: formData.assignedStaffId,
        jobId: jobId,
        clientId: clientId
      });
      
      setSaveStatus('saved');
      
      // Call onSave callback to refresh parent data
      if (onSave) {
        onSave();
      }
      
      setTimeout(() => {
        setIsSaving(false);
        setSaveStatus('idle');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to create document request:', error);
      setSaveStatus('idle');
      setIsSaving(false);
    }
  };

  const toggleNotify = () => {
    updateFormData('notifyClient', !formData.notifyClient);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 min-h-screen flex items-center justify-center font-['Segoe_UI'] p-6 z-50">
      <div className="bg-white rounded-2xl border border-indigo-200 w-full max-w-[560px] overflow-hidden">
        {/* Modal header */}
        <div className="p-5 border-b border-indigo-100 flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900 m-0">
              Add Document Request
            </p>
            <p className="text-xs text-slate-500 m-0 mt-1">
              {jobName} · {clientName}
            </p>
          </div>
          <div
            onClick={onClose}
            className="flex items-center justify-center cursor-pointer text-slate-400 text-sm hover:bg-slate-50 transition-colors"
          >
            <X />
          </div>
        </div>

        {/* Modal body */}
        <div className="p-5">
          {/* Document name */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-1.5">
              Document name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bank Statements — Sep 2025"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm box-border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-1.5">
              Description / instructions
            </label>
            <textarea
              placeholder="e.g. All accounts including savings and credit cards"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm h-16 resize-none box-border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Due date + priority row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">
                Due date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => updateFormData('dueDate', e.target.value)}
                className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm box-border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => updateFormData('priority', e.target.value as DocumentRequestData['priority'])}
                className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Auto reminder */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-1.5">
              Auto-reminder
            </label>
            <select
              value={formData.reminder}
              onChange={(e) => updateFormData('reminder', e.target.value as DocumentRequestData['reminder'])}
              className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="none">No reminder</option>
              <option value="1day">1 day before due</option>
              <option value="3days">3 days before due</option>
              <option value="7days">7 days before due</option>
              <option value="daily">Daily until uploaded</option>
            </select>
          </div>

          {/* Accepted file types */}
          <div className="mb-4">
            <label className="text-xs text-slate-500 block mb-2">
              Accepted file types
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'pdf', label: 'PDF' },
                { key: 'excel', label: 'Excel / CSV' },
                { key: 'word', label: 'Word / Doc' },
                { key: 'image', label: 'Image (JPG/PNG)' },
                { key: 'any', label: 'Any file type' }
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600 bg-indigo-50 p-1.5 rounded-md border border-indigo-200 hover:bg-indigo-100 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.fileTypes[key as keyof DocumentRequestData['fileTypes']]}
                    onChange={() => updateFileType(key as keyof DocumentRequestData['fileTypes'])}
                    className="accent-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Notify client toggle */}
          <div className="flex items-center justify-between bg-indigo-50 rounded-lg border border-indigo-200 p-3 mb-4">
            <div>
              <p className="text-sm text-slate-900 font-medium m-0">
                Notify client immediately
              </p>
              <p className="text-xs text-slate-500 m-0 mt-1">
                Send an email to the client as soon as this request is created
              </p>
            </div>
            <div
              onClick={toggleNotify}
              className={`w-9 h-5 rounded-full cursor-pointer relative flex-shrink-0 transition-colors ${
                formData.notifyClient ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                  formData.notifyClient ? 'right-0.5' : 'right-5'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-4 border-t border-indigo-100 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-5 py-2 border border-indigo-200 rounded-lg bg-white text-sm cursor-pointer text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 border-none rounded-lg text-sm font-semibold transition-colors ${
              saveStatus === 'saved' 
                ? 'bg-emerald-600 text-white cursor-pointer' 
                : saveStatus === 'saving' 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-500 text-white cursor-pointer hover:bg-indigo-600'
            }`}
          >
            {saveStatus === 'saved' ? 'Added!' : (saveStatus === 'saving' ? 'Adding...' : 'Add Request')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentRequestModal;
