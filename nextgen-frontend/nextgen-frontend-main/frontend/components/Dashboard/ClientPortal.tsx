import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';
import axios from 'axios';

interface DocumentRequest {
  id: string;
  name: string;
  description: string;
  due_date: string;
  status: 'pending' | 'uploaded' | 'overdue' | 'cancelled';
  priority: string;
  file_types?: any;
  file_name?: string;
  uploaded_at?: string;
}

interface PortalData {
  jobId: string;
  jobName: string;
  clientName: string;
  clientEmail: string;
  documents: DocumentRequest[];
  portalExpiresAt: string;
}

const ClientPortal: React.FC = () => {
  const { portalToken } = useParams<{ portalToken: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    if (portalToken) {
      fetchPortalData();
    }
  }, [portalToken]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/'}api/portal/${portalToken}`
      );
      
      if (response.data.success) {
        setPortalData(response.data.data);
      } else {
        setError('Failed to load portal data');
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Invalid portal link. Please check the URL or contact your accountant.');
      } else if (err.response?.status === 410) {
        setError('This portal link has expired. Please contact your accountant for a new link.');
      } else {
        setError('Failed to load portal. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateFileType = (fileTypes: any, file: File): { valid: boolean; message?: string } => {
    // If fileTypes is not set or 'any' is true, allow all
    if (!fileTypes || fileTypes.any === true) {
      return { valid: true };
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimetype = file.type;

    // Map file extensions and mimetypes to file type categories
    const typeMap: Record<string, { exts: string[]; mimes: string[] }> = {
      pdf: { exts: ['.pdf'], mimes: ['application/pdf'] },
      excel: { exts: ['.xls', '.xlsx', '.csv'], mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'] },
      word: { exts: ['.doc', '.docx'], mimes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
      image: { exts: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'], mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'] }
    };

    const allowedTypes: string[] = [];

    for (const [type, config] of Object.entries(typeMap)) {
      if (fileTypes[type] === true) {
        // Check extension
        if (config.exts.includes(ext)) {
          return { valid: true };
        }
        // Check mimetype
        if (mimetype && config.mimes.some(m => mimetype.toLowerCase().includes(m.toLowerCase()))) {
          return { valid: true };
        }
        allowedTypes.push(type);
      }
    }

    return {
      valid: false,
      message: `Invalid file type. Allowed types: ${allowedTypes.join(', ') || 'none configured'}`
    };
  };

  const handleFileUpload = async (docId: string, file: File, doc: DocumentRequest) => {
    try {
      // Validate file type before uploading
      const validation = validateFileType(doc.file_types, file);
      if (!validation.valid) {
        alert(validation.message);
        return;
      }

      setUploadingId(docId);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentRequestId', docId);
      formData.append('portalToken', portalToken || '');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/'}api/portal/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Refresh portal data to show updated status
      await fetchPortalData();
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.message) {
        alert(err.response.data.message);
      } else {
        alert('Failed to upload file. Please try again.');
      }
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Uploaded</span>;
      case 'overdue':
        return <span className="bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">Overdue</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Portal Not Found</h2>
          <p className="text-slate-600">This portal link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  const uploadedCount = portalData.documents.filter(doc => doc.status === 'uploaded').length;
  const totalCount = portalData.documents.length;
  const progressPercentage = (uploadedCount / totalCount) * 100;

  return (
    <div className="bg-indigo-50 min-h-screen font-['Segoe_UI'] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Portal header */}
        <div className="text-center mb-8">
          <span className="text-slate-900 font-bold text-xl ">
            Practis Manager
          </span>
          <p className="text-slate-500 text-sm mt-1.5">
            Document Portal — {portalData.clientName}
          </p>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-base font-semibold text-slate-900 m-0">
                {portalData.jobName}
              </p>
              <p className="text-sm text-slate-500 m-0 mt-1">
                Portal expires · {formatDate(portalData.portalExpiresAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 m-0 mb-1">Documents uploaded</p>
              <p className="text-2xl font-bold text-slate-900 m-0">
                {uploadedCount} <span className="text-sm text-slate-400 font-normal">of {totalCount}</span>
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="bg-indigo-100 rounded-lg h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-lg transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden mb-4">
          {portalData.documents.map((doc, index) => (
            <div
              key={doc.id}
              className={`p-3.5 flex items-center justify-between ${
                index < portalData.documents.length - 1 ? 'border-b border-indigo-50' : ''
              } ${doc.status === 'overdue' ? 'bg-red-50' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(doc.status)}
                <div>
                  <p className="text-sm font-medium text-slate-900 m-0">
                    {doc.name}
                  </p>
                  <p className={`text-xs m-0 mt-0.5 ${
                    doc.status === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-500'
                  }`}>
                    {doc.file_name 
                      ? `Uploaded ${formatDate(doc.uploaded_at)} · ${doc.file_name}`
                      : doc.description
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(doc.status)}
                {doc.status !== 'uploaded' && doc.status !== 'cancelled' && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(doc.id, file, doc);
                      }}
                      disabled={uploadingId === doc.id}
                    />
                    <span className={`px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors inline-block ${
                      doc.status === 'overdue'
                        ? 'border-0 bg-red-500 text-white hover:bg-red-600'
                        : 'border-indigo-500 bg-white text-indigo-500 hover:bg-indigo-50'
                    } ${uploadingId === doc.id ? 'bg-gray-300 border-0 text-white cursor-not-allowed' : 'cursor-pointer'}`}>
                      {uploadingId === doc.id ? 'Uploading...' : (doc.status === 'overdue' ? 'Upload now' : 'Upload')}
                    </span>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-300">
          Secured by Practis Manager · Files are encrypted in transit and at rest
        </p>
      </div>
    </div>
  );
};

export default ClientPortal;
