import api from './api';

export interface InvoiceRequest {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  invoiceDate: string;
  dueDate: string;
  terms: string;
  lineItems: Array<{
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

export interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  invoiceData: InvoiceRequest;
}

export interface XeroRequest {
  invoiceData: InvoiceRequest;
}

class InvoiceService {
  // Generate and send invoice via email
  async sendInvoice(emailRequest: EmailRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/invoices/send-email`, emailRequest);
      return response.data;
    } catch (error: any) {
      console.error('Failed to send invoice email:', error);
      throw new Error(error.response?.data?.message || 'Failed to send invoice email');
    }
  }

  // Push invoice to Xero
  async pushToXero(xeroRequest: XeroRequest): Promise<{ success: boolean; message: string; xeroInvoiceId?: string }> {
    try {
      const response = await api.post(`/invoices/push-to-xero`, xeroRequest);
      return response.data;
    } catch (error: any) {
      console.error('Failed to push invoice to Xero:', error);
      throw new Error(error.response?.data?.message || 'Failed to push invoice to Xero');
    }
  }

  // Generate invoice PDF
  async generatePDF(invoiceData: InvoiceRequest): Promise<{ pdfUrl: string }> {
    try {
      const response = await api.post(`/invoices/generate-pdf`, invoiceData, {
        responseType: 'blob'
      });
      
      // Create a URL for the PDF blob
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return { pdfUrl };
    } catch (error: any) {
      console.error('Failed to generate PDF:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate PDF');
    }
  }

  // Save invoice draft
  async saveDraft(invoiceData: InvoiceRequest): Promise<{ success: boolean; invoiceId: string }> {
    try {
      const response = await api.post(`/invoices/draft`, invoiceData);
      return response.data;
    } catch (error: any) {
      console.error('Failed to save invoice draft:', error);
      throw new Error(error.response?.data?.message || 'Failed to save invoice draft');
    }
  }

  // Get invoice history
  async getInvoiceHistory(): Promise<{ invoices: any[] }> {
    try {
      const response = await api.get(`/invoices/history`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get invoice history:', error);
      throw new Error(error.response?.data?.message || 'Failed to get invoice history');
    }
  }

}

export const invoiceService = new InvoiceService();
