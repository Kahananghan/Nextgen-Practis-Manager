// ============================================
// services/recurrenceService.ts
// Recurrence Management Service
// ============================================

import api from './api';

export interface CreateRecurrencePatternData {
  jobId: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';
  intervalDaysBeforeDue?: number;
  autoAssignToSameStaff?: boolean;
  requireReviewBeforeCompletion?: boolean;
  useSameTemplateTasks?: boolean;
  notifyAssigneeOnCreation?: boolean;
  notifyManagerOnCreation?: boolean;
  createdBy?: string;
}

export interface RecurrencePreview {
  nextCreationDate: string;
  nextDueDate: string;
  frequency: string;
  intervalDaysBeforeDue: number;
  previewText: string;
}

export const recurrenceService = {
  /**
   * Create a new recurrence pattern
   */
  async createRecurrencePattern(data: CreateRecurrencePatternData): Promise<{ success: boolean; data: any }> {
    const response = await api.post('/recurrence/patterns', data);
    return response.data;
  },

  /**
   * Get recurrence preview
   */
  async getRecurrencePreview(params: {
    jobId: string;
    frequency: string;
    intervalDaysBeforeDue?: number;
  }): Promise<{ success: boolean; data: RecurrencePreview }> {
    const response = await api.get('/recurrence/preview', { params });
    return response.data;
  }
};
