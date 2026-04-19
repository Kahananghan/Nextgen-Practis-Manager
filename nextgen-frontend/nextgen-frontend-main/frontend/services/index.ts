import api from './api';

// Staff Service
export const staffService = {
  async getStaff(params?: any): Promise<any> {
    const response = await api.get('/staff', { params });
    return response.data;
  },

  async getStaffById(id: string): Promise<any> {
    const response = await api.get(`/staff/${id}`);
    return response.data;
  },

  async getStaffJobs(id: string): Promise<any> {
    const response = await api.get(`/staff/${id}/jobs`);
    return response.data;
  },

  async createStaff(staffData: any): Promise<any> {
    const response = await api.post('/staff', staffData);
    return response.data;
  },

  async updateStaff(id: string, staffData: any): Promise<any> {
    const response = await api.put(`/staff/${id}`, staffData);
    return response.data;
  },

  async activateStaff(id: string): Promise<any> {
    const response = await api.put(`/staff/${id}/activate`);
    return response.data;
  },

  async deactivateStaff(id: string): Promise<any> {
    const response = await api.put(`/staff/${id}/deactivate`);
    return response.data;
  },

  async deleteStaff(id: string): Promise<any> {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },
};

// Dashboard Service
export const dashboardService = {
  async getOverview(): Promise<any> {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },

  async getJobsByState(): Promise<any> {
    const response = await api.get('/dashboard/jobs-by-state');
    return response.data;
  },

  async getJobsByPriority(): Promise<any> {
    const response = await api.get('/dashboard/jobs-by-priority');
    return response.data;
  },

  async getUpcomingJobs(): Promise<any> {
    const response = await api.get('/dashboard/upcoming-jobs');
    return response.data;
  },

  async getOverdueJobs(): Promise<any> {
    const response = await api.get('/dashboard/overdue-jobs');
    return response.data;
  },

  async getStaffWorkload(): Promise<any> {
    const response = await api.get('/dashboard/staff-workload');
    return response.data;
  },

  async getRecentActivity(): Promise<any> {
    const response = await api.get('/dashboard/recent-activity');
    return response.data;
  },

  async getCharts(): Promise<any> {
    const response = await api.get('/dashboard/charts');
    return response.data;
  },

  async getTopClients(): Promise<any> {
    const response = await api.get('/dashboard/top-clients');
    return response.data;
  },

  async getKPIs(): Promise<any> {
    const response = await api.get('/dashboard/kpis');
    return response.data;
  },
};

// Templates Service
export const templatesService = {
  async getTemplates(): Promise<any> {
    const response = await api.get('/templates');
    return response.data;
  },

  async getTemplateById(id: string): Promise<any> {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  async createTemplate(templateData: any): Promise<any> {
    const response = await api.post('/templates', templateData);
    return response.data;
  },

  async updateTemplate(id: string, templateData: any): Promise<any> {
    const response = await api.put(`/templates/${id}`, templateData);
    return response.data;
  },

  async deleteTemplate(id: string): Promise<any> {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },

  async createJobFromTemplate(id: string, jobData: any): Promise<any> {
    const response = await api.post(`/templates/${id}/create-job`, jobData);
    return response.data;
  },
};

// Settings Service
export const settingsService = {
  async getUserSettings(): Promise<any> {
    const response = await api.get('/settings/user');
    return response.data;
  },

  async updateUserSettings(settings: any): Promise<any> {
    const response = await api.put('/settings/user', settings);
    return response.data;
  },

  async getTenantSettings(): Promise<any> {
    const response = await api.get('/settings/tenant');
    return response.data;
  },

  async updateTenantSettings(settings: any): Promise<any> {
    const response = await api.put('/settings/tenant', settings);
    return response.data;
  },

  async getBillingSettings(): Promise<any> {
    const response = await api.get('/settings/billing');
    return response.data;
  },

  async resetUserSettings(): Promise<any> {
    const response = await api.post('/settings/user/reset');
    return response.data;
  },

  async getAllSettings(): Promise<any> {
    const response = await api.get('/settings/all');
    return response.data;
  },
};

// Notifications Service
export const notificationsService = {
  async getNotifications(params?: any): Promise<any> {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  async getUnreadCount(): Promise<any> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(id: string): Promise<any> {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<any> {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },

  async deleteNotification(id: string): Promise<any> {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  async getPreferences(): Promise<any> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  async updatePreferences(preferences: any): Promise<any> {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data;
  },
};

// Roles Service
export const rolesService = {
  async getRoles(): Promise<any> {
    const response = await api.get('/roles');
    return response.data;
  },

  async createRole(roleData: any): Promise<any> {
    const response = await api.post('/roles', roleData);
    return response.data;
  },

  async deleteRole(id: string): Promise<any> {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },
};

// Alerts Service
export const alertsService = {
  async getAlerts(params?: any): Promise<any> {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  async markAsRead(id: string): Promise<any> {
    const response = await api.put(`/alerts/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<any> {
    const response = await api.put('/alerts/mark-all-read');
    return response.data;
  },
};

