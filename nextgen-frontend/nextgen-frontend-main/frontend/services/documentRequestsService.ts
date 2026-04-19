// ============================================
// src/services/documentRequestsService.ts
// Document Requests Service
// ============================================
import api from './api';

export interface DocumentRequest {
  id: string;
  tenant_id: string;
  job_id?: string;
  client_id: string;
  name: string;
  description?: string;
  due_date: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reminder_settings: 'none' | '1day' | '3days' | '7days' | 'daily';
  file_types: {
    pdf: boolean;
    excel: boolean;
    word: boolean;
    image: boolean;
    any: boolean;
  };
  notify_client: boolean;
  assigned_staff_id?: string;
  status: 'pending' | 'uploaded' | 'overdue' | 'cancelled';
  reminder_count?: number;
  last_reminder_sent?: string;
  file_name?: string;
  file_url?: string;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
  // Portal link fields
  portal_token?: string;
  portal_url?: string;
  portal_expires_at?: string;
  portal_is_active?: boolean;
  // Joined fields from queries
  job_name?: string;
  client_name?: string;
  client_email?: string;
  staff_name?: string;
  staff_email?: string;
}

export interface DocumentRequestData {
  jobId?: string;
  clientId?: string;
  name: string;
  description?: string;
  dueDate: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  reminder?: 'none' | '1day' | '3days' | '7days' | 'daily';
  fileTypes?: {
    pdf?: boolean;
    excel?: boolean;
    word?: boolean;
    image?: boolean;
    any?: boolean;
  };
  notifyClient?: boolean;
  assignedStaffId?: string;
}

export interface DocumentRequestsResponse {
  data: DocumentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class DocumentRequestsService {
  /**
   * Get document requests with filtering and pagination
   */
  async getDocumentRequests(params?: {
    jobId?: string;
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<DocumentRequestsResponse> {
    const response = await api.get('/api/document-requests', { params });
    return response.data;
  }

  /**
   * Get a specific document request by ID
   */
  async getDocumentRequestById(id: string): Promise<{ data: DocumentRequest }> {
    const response = await api.get(`/api/document-requests/${id}`);
    return response.data;
  }

  /**
   * Create a new document request
   */
  async createDocumentRequest(data: DocumentRequestData): Promise<{ data: DocumentRequest }> {
    const response = await api.post('/api/document-requests', {
      jobId: data.jobId,
      clientId: data.clientId,
      name: data.name,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority,
      reminder: data.reminder,
      fileTypes: data.fileTypes,
      notifyClient: data.notifyClient,
      assignedStaffId: data.assignedStaffId
    });
    return response.data;
  }

  /**
   * Send reminder for a document request
   */
  async sendReminder(documentRequestId: string): Promise<{ data: DocumentRequest }> {
    const response = await api.post(`/api/document-requests/${documentRequestId}/remind`);
    return response.data;
  }

  /**
   * Update document request status
   */
  async updateDocumentRequestStatus(
    documentRequestId: string,
    status: 'pending' | 'uploaded' | 'overdue' | 'cancelled',
    data?: { fileName?: string }
  ): Promise<{ data: DocumentRequest }> {
    const response = await api.patch(`/api/document-requests/${documentRequestId}/status`, {
      status,
      ...data
    });
    return response.data;
  }

  /**
   * Delete a document request
   */
  async deleteDocumentRequest(documentRequestId: string): Promise<{ message: string }> {
    const response = await api.delete(`/api/document-requests/${documentRequestId}`);
    return response.data;
  }

  /**
   * Get document requests for a specific job
   */
  async getDocumentRequestsForJob(jobId: string): Promise<DocumentRequestsResponse> {
    return this.getDocumentRequests({ jobId });
  }

  /**
   * Get document requests for a specific client
   */
  async getDocumentRequestsForClient(clientId: string): Promise<DocumentRequestsResponse> {
    return this.getDocumentRequests({ clientId });
  }

  /**
   * Get overdue document requests
   */
  async getOverdueDocumentRequests(): Promise<DocumentRequestsResponse> {
    return this.getDocumentRequests({ status: 'overdue' });
  }

  /**
   * Get pending document requests
   */
  async getPendingDocumentRequests(): Promise<DocumentRequestsResponse> {
    return this.getDocumentRequests({ status: 'pending' });
  }

  /**
   * Get uploaded document requests
   */
  async getUploadedDocumentRequests(): Promise<DocumentRequestsResponse> {
    return this.getDocumentRequests({ status: 'uploaded' });
  }

  /**
   * Format document request for display
   */
  formatDocumentRequestForDisplay(document: DocumentRequest) {
    let parsedFileTypes: any = {};
    if (typeof document.file_types === 'string') {
      try {
        parsedFileTypes = JSON.parse(document.file_types);
      } catch {
        parsedFileTypes = {};
      }
    } else if (document.file_types) {
      parsedFileTypes = document.file_types;
    }

    return {
      id: document.id,
      name: document.name,
      description: document.description || '',
      dueDate: new Date(document.due_date).toLocaleDateString(),
      status: document.status,
      priority: document.priority,
      reminderSent: document.last_reminder_sent 
        ? new Date(document.last_reminder_sent).toLocaleDateString() 
        : undefined,
      reminderCount: document.reminder_count,
      fileName: document.file_name,
      fileUrl: document.file_url,
      uploadedAt: document.uploaded_at 
        ? new Date(document.uploaded_at).toLocaleDateString() 
        : undefined,
      clientName: document.client_name,
      clientEmail: document.client_email,
      jobName: document.job_name,
      assignedStaffName: document.staff_name,
      assignedStaffEmail: document.staff_email,
      fileTypes: parsedFileTypes,
      notifyClient: document.notify_client,
      reminderSettings: document.reminder_settings,
      portalUrl: document.portal_url,
      portalToken: document.portal_token,
      portalExpiresAt: document.portal_expires_at,
      portalIsActive: document.portal_is_active,
      createdAt: new Date(document.created_at).toLocaleDateString(),
      updatedAt: new Date(document.updated_at).toLocaleDateString()
    };
  }

  /**
   * Get presigned URL to view uploaded file
   */
  async getFileViewUrl(documentRequestId: string): Promise<{ data: { fileUrl: string; fileName: string; expiresIn: number } }> {
    const response = await api.get(`/api/document-requests/${documentRequestId}/file-url`);
    return response.data;
  }

  /**
   * Download file via backend proxy (avoids CORS)
   */
  async downloadFile(documentRequestId: string, fileName?: string): Promise<void> {
    const response = await api.get(`/api/document-requests/${documentRequestId}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Regenerate portal link and send to client
   */
  async regeneratePortalLink(documentRequestId: string): Promise<{ data: { id: string; portalToken: string; portalUrl: string; portalExpiresAt: string }; message: string }> {
    const response = await api.post(`/api/document-requests/${documentRequestId}/regenerate-portal`);
    return response.data;
  }

  /**
   * Get document request statistics
   */
  async getDocumentRequestStats(jobId?: string): Promise<{
    total: number;
    pending: number;
    uploaded: number;
    overdue: number;
  }> {
    const params = jobId ? { jobId } : {};
    const response = await this.getDocumentRequests(params);
    
    const stats = response.data.reduce(
      (acc, doc) => {
        acc.total++;
        acc[doc.status]++;
        return acc;
      },
      { total: 0, pending: 0, uploaded: 0, overdue: 0 }
    );

    return stats;
  }
}

export default new DocumentRequestsService();
