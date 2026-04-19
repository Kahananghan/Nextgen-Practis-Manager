import api from './api';

export const xeroService = {
  // Initiate Xero OAuth connection
  async connect(): Promise<any> {
    const response = await api.get('/integrations/xero/connect');
    return response.data;
  },

  // Handle Xero OAuth callback (usually handled by backend redirect)
  async callback(code: string, state: string): Promise<any> {
    const response = await api.get('/integrations/xero/callback', {
      params: { code, state }
    });
    return response.data;
  },

  // Get Xero connection status
  async getStatus(): Promise<any> {
    const response = await api.get('/integrations/xero/status');
    return response.data;
  },

  // Disconnect Xero integration
  async disconnect(): Promise<any> {
    const response = await api.post('/integrations/xero/disconnect');
    return response.data;
  },

  // Get Xero tenants (organizations)
  async getTenants(): Promise<any> {
    const response = await api.get('/integrations/xero/tenants');
    return response.data;
  },

  // Select Xero tenant
  async selectTenant(tenantId: string): Promise<any> {
    const response = await api.post('/integrations/xero/select-tenant', { tenantId });
    return response.data;
  },

  // Trigger full sync
  async triggerFullSync(): Promise<any> {
    const response = await api.post('/sync/full');
    return response.data;
  },

  // Trigger delta sync
  async triggerDeltaSync(): Promise<any> {
    const response = await api.post('/sync/delta');
    return response.data;
  },

  // Get sync status
  async getSyncStatus(): Promise<any> {
    const response = await api.get('/sync/status');
    return response.data;
  },

  // Get sync statistics
  async getSyncStats(): Promise<any> {
    const response = await api.get('/sync/stats');
    return response.data;
  }
};
