import api from './api';

export interface Proposal {
  id: string;
  title: string;
  client_id: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  view_token: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  content?: {
    letter: string;
    terms: string;
    services: Array<{
      id: string;
      service: string;
      type: 'Fixed' | 'Hourly';
      quantity: number;
      rate: string;
      total: string;
    }>;
  };
  signature_data?: {
    signature: string;
    ip_address: string;
    user_agent: string;
    signed_at: string;
  };
}

export interface ProposalCreateData {
  title: string;
  client_id?: string;
  client_name?: string;
  client_email?: string;
  contact_name?: string;
  cover_message?: string;
  total_value?: number;
  subtotal?: number;
  gst_amount?: number;
  expiry_date?: string;
  status?: 'draft' | 'sent';
  service_lines?: Array<{
    service: string;
    type: 'Fixed' | 'Hourly' | 'Recurring';
    quantity: number;
    rate: number;
    total: number;
    description?: string;
  }>;
  documents?: {
    letter: string;
    terms: string;
  };
}

export interface ProposalService {
  getProposals(params?: {
    search?: string;
    status?: string;
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<any>;
  getProposalById(id: string): Promise<any>;
  createProposal(proposalData: ProposalCreateData): Promise<any>;
  updateProposal(id: string, proposalData: Partial<ProposalCreateData>): Promise<any>;
  deleteProposal(id: string): Promise<any>;
  updateProposalStatus(id: string, status: string): Promise<any>;
  duplicateProposal(id: string): Promise<any>;
  extendExpiry(id: string, expiryDate: string): Promise<any>;
  addSignature(id: string, signatureData: {
    signature: string;
    ip_address: string;
    user_agent: string;
  }): Promise<any>;
  getPublicProposal(token: string): Promise<any>;
  acceptProposal(token: string, signatureData: {
    signature_type: 'draw' | 'type';
    signature_data?: string;
    typed_name?: string;
    full_name?: string;
  }): Promise<any>;
  declineProposal(token: string, reason?: string): Promise<any>;
  trackTermsAgreed(token: string): Promise<any>;
  uploadSignature(token: string, file: File): Promise<any>;
  getSignatureUrl(token: string): Promise<any>;
  getSignatureImage(token: string): Promise<any>;
  sendProposalEmail(id: string, emailData: {
    to: string;
    subject?: string;
    message?: string;
  }): Promise<any>;
  getProposalPreview(id: string): Promise<any>;
  exportProposalPDF(id: string): Promise<any>;
  getProposalStats(): Promise<any>;
  sendReminder(id: string): Promise<any>;
}

export const proposalService: ProposalService = {
  // Get all proposals
  async getProposals(params?: {
    search?: string;
    status?: string;
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await api.get('/api/proposals', { params });
    return response.data;
  },

  // Get proposal by ID
  async getProposalById(id: string): Promise<any> {
    const response = await api.get(`/api/proposals/${id}`);
    return response.data;
  },

  // Create proposal
  async createProposal(proposalData: ProposalCreateData): Promise<any> {
    const response = await api.post('/api/proposals', proposalData);
    return response.data;
  },

  // Update proposal
  async updateProposal(id: string, proposalData: Partial<ProposalCreateData>): Promise<any> {
    const response = await api.put(`/api/proposals/${id}`, proposalData);
    return response.data;
  },

  // Delete proposal
  async deleteProposal(id: string): Promise<any> {
    const response = await api.delete(`/api/proposals/${id}`);
    return response.data;
  },

  // Update proposal status
  async updateProposalStatus(id: string, status: string): Promise<any> {
    const response = await api.put(`/api/proposals/${id}/status`, { status });
    return response.data;
  },

  // Duplicate proposal
  async duplicateProposal(id: string): Promise<any> {
    const response = await api.post(`/api/proposals/${id}/duplicate`, {});
    return response.data;
  },

  // Extend proposal expiry
  async extendExpiry(id: string, expiryDate: string): Promise<any> {
    const response = await api.post(`/api/proposals/${id}/extend`, { expiry_date: expiryDate });
    return response.data;
  },

  // Add signature to proposal
  async addSignature(id: string, signatureData: {
    signature: string;
    ip_address: string;
    user_agent: string;
  }): Promise<any> {
    const response = await api.post(`/api/proposals/${id}/signature`, signatureData);
    return response.data;
  },

  // Get public proposal by token
  async getPublicProposal(token: string): Promise<any> {
    const response = await api.get(`/api/proposals/public/${token}`);
    return response.data;
  },

  // Accept proposal (public)
  async acceptProposal(token: string, signatureData: {
    signature_type: 'draw' | 'type';
    signature_data?: string;
    typed_name?: string;
    full_name?: string;
  }): Promise<any> {
    const response = await api.post(`/api/proposals/public/${token}/accept`, signatureData);
    return response.data;
  },

  // Decline proposal (public)
  async declineProposal(token: string, reason?: string): Promise<any> {
    const response = await api.post(`/api/proposals/public/${token}/decline`, { reason: reason || '' });
    return response.data;
  },

  // Track when client agrees to terms (public)
  async trackTermsAgreed(token: string): Promise<any> {
    const response = await api.post(`/api/proposals/public/${token}/terms-agreed`);
    return response.data;
  },

  // Upload signature image to R2 (public)
  async uploadSignature(token: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('signature', file);

    const response = await api.post(`/api/proposals/public/${token}/upload-signature`, formData, {
      headers: {
        'Content-Type': undefined // Let axios set the correct multipart boundary
      }
    });
    return response.data;
  },

  // Get presigned URL for signature image (public)
  async getSignatureUrl(token: string): Promise<any> {
    const response = await api.get(`/api/proposals/public/${token}/signature-url`);
    return response.data;
  },

  // Get signature image as base64 (public) - avoids CORS for PDF generation
  async getSignatureImage(token: string): Promise<any> {
    const response = await api.get(`/api/proposals/public/${token}/signature-image`);
    return response.data;
  },

  // Send proposal email
  async sendProposalEmail(id: string, emailData: {
    to: string;
    subject?: string;
    message?: string;
  }): Promise<any> {
    const response = await api.post(`/api/proposals/${id}/send`, emailData);
    return response.data;
  },

  // Get proposal preview
  async getProposalPreview(id: string): Promise<any> {
    const response = await api.get(`/api/proposals/${id}/preview`);
    return response.data;
  },

  // Export proposal to PDF
  async exportProposalPDF(id: string): Promise<any> {
    const response = await api.get(`/api/proposals/${id}/export`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get proposal statistics
  async getProposalStats(): Promise<any> {
    const response = await api.get('/api/proposals/stats');
    return response.data;
  },

  // Send reminder email
  async sendReminder(id: string): Promise<any> {
    const response = await api.post(`/api/proposals/${id}/remind`);
    return response.data;
  }
};
