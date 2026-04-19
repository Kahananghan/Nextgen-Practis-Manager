import api from './api';

export interface Job {
  id: string;
  name: string;
  xpmJobNumber?: string;
  jobType?: string;
  category?: string;
  clientId: string;
  clientName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  managerId?: string;
  state: 'Planned' | 'In Progress' | 'On Hold' | 'Complete';
  priority: 'Low' | 'Normal' | 'Medium' | 'High';
  startDate?: string;
  dueDate?: string;
  budget?: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  sortOrder: number;
}

export const jobsService = {
  // Get all jobs
  async getJobs(params?: {
    state?: string;
    priority?: string;
    clientId?: string;
    staffId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  // Get job by ID
  async getJobById(id: string): Promise<any> {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Create job
  async createJob(jobData: any): Promise<any> {
    const response = await api.post('/jobs', jobData);
    return response.data;
  },

  // Update job
  async updateJob(id: string, jobData: any): Promise<any> {
    const response = await api.put(`/jobs/${id}`, jobData);
    return response.data;
  },

  // Delete job
  async deleteJob(id: string): Promise<any> {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  // Assign job to staff
  async assignJob(id: string, staffId: string): Promise<any> {
    const response = await api.put(`/jobs/${id}/assign`, { staffId });
    return response.data;
  },

  // Get tasks for job
  async getTasks(jobId: string): Promise<any> {
    const response = await api.get(`/jobs/${jobId}/tasks`);
    return response.data;
  },

  // Add task
  async addTask(jobId: string, taskData: { name: string; description?: string; sortOrder?: number }): Promise<any> {
    const response = await api.post(`/jobs/${jobId}/tasks`, taskData);
    return response.data;
  },

  // Update task
  async updateTask(jobId: string, taskId: string, taskData: any): Promise<any> {
    const response = await api.put(`/jobs/${jobId}/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Complete task
  async completeTask(jobId: string, taskId: string, isCompleted: boolean): Promise<any> {
    const response = await api.put(`/jobs/${jobId}/tasks/${taskId}/complete`, { isCompleted });
    return response.data;
  },

  // Delete task
  async deleteTask(jobId: string, taskId: string): Promise<any> {
    const response = await api.delete(`/jobs/${jobId}/tasks/${taskId}`);
    return response.data;
  },

    // Create notes for a job
    async createNotes(jobId: string, note: string): Promise<any> {
      const response = await api.post(`/jobs/${jobId}/notes`, { note });
      return response.data;
    },

    // Get notes for a job
    async getNotes(jobId: string): Promise<any> {
      const response = await api.get(`/jobs/${jobId}/notes`);
      return response.data;
    },

    // Update notes for a job
    async updateNotes(jobId: string, note: string): Promise<any> {
      const response = await api.put(`/jobs/${jobId}/notes`, { note });
      return response.data;
    },

    // Delete notes for a job
    async deleteNotes(jobId: string): Promise<any> {
      const response = await api.delete(`/jobs/${jobId}/notes`);
      return response.data;
    },
  
};
