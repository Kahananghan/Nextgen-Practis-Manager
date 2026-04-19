import api from './api';

export interface TimeEntry {
  id: string;
  jobId: string;
  userId: string;
  userName?: string;
  taskName: string;
  description?: string;
  durationMinutes: number;
  entryDate: string;
  type: 'Billable' | 'Non-Billable';
  isCompleted: boolean;
  isTimerEntry: boolean;
  createdAt: string;
}

export interface LogTimeData {
  taskName: string;
  description?: string;
  durationMinutes: number;
  entryDate?: string;
  type?: 'Billable' | 'Non-Billable';
  isTimerEntry?: boolean;
  userId?: string;
  staffName?: string;
  assignedUserId?: string; 
  staffId?: string; 
}

export const timeTrackingService = {
  // Get time entries for a job
  async getTimeEntries(jobId: string): Promise<any> {
    const response = await api.get(`/jobs/${jobId}/time-entries`);
    return response.data;
  },

  // Get all time entries across all jobs
  async getAllTimeEntries(filters?: { userId?: string; startDate?: string; endDate?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    
    const response = await api.get(`/time-entries${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data;
  },

  // Log time entry for a job
  async logTime(jobId: string, data: LogTimeData): Promise<any> {
    const response = await api.post(`/jobs/${jobId}/time-entries`, data);
    return response.data;
  },

  // Mark time entry as completed
  async completeTimeEntry(entryId: string): Promise<any> {
    const response = await api.put(`/time-entries/${entryId}/complete`);
    return response.data;
  },

  // Delete time entry
  async deleteTimeEntry(entryId: string): Promise<any> {
    const response = await api.delete(`/time-entries/${entryId}`);
    return response.data;
  },

  // Get job time totals
  async getJobTimeTotals(jobId: string): Promise<any> {
    const response = await api.get(`/jobs/${jobId}/time-totals`);
    return response.data;
  },
};
