import api from './api';

export const clientsService = {
  // Get all clients
  async getClients(params?: {
    search?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  // Get client by ID
  async getClientById(id: string): Promise<any> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Get client jobs
  async getClientJobs(id: string): Promise<any> {
    const response = await api.get(`/clients/${id}/jobs`);
    return response.data;
  },

  // Create client
  async createClient(clientData: {
    name: string;
    email?: string;
    phone?: string;
    address?: any;
  }): Promise<any> {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  // Update client
  async updateClient(id: string, clientData: any): Promise<any> {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  },

  // Archive client
  async archiveClient(id: string): Promise<any> {
    const response = await api.put(`/clients/${id}/archive`);
    return response.data;
  },

  // Unarchive client
  async unarchiveClient(id: string): Promise<any> {
    const response = await api.put(`/clients/${id}/unarchive`);
    return response.data;
  },

  // Delete client
  async deleteClient(id: string): Promise<any> {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  // Create contact for a client
  async createContact(clientId: string, contactData: {
    contactName: string;
    email?: string;
    phone?: string;
    position?: string;
  }): Promise<any> {
    const response = await api.post(`/clients/${clientId}/contacts`, contactData);
    return response.data;
  },

  // Get all contacts for a client
  async getContacts(clientId: string): Promise<any> {
    const response = await api.get(`/clients/${clientId}/contacts`);
    return response.data;
  },

  // Add favourite client
  async addFavouriteClient(clientId: string): Promise<any> {
    const response = await api.post(`/clients/${clientId}/favourite`);
    return response.data;
  },

  // Remove favourite client
  async removeFavouriteClient(clientId: string): Promise<any> {
    const response = await api.delete(`/clients/${clientId}/favourite`);
    return response.data;
  },

  // Get all favourite clients for the user
  async getFavouriteClients(): Promise<any> {
    const response = await api.get(`/clients/favourites`);
    return response.data;
  },
};

  
