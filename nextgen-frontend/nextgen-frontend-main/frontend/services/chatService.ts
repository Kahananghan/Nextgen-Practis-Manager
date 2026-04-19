import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface ChatUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  status?: 'active' | 'offline' | null;
  lastSeen?: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  message: string | null;
  file: { key: string; url: string; name: string; size: number } | null;
  createdAt: string;
  updatedAt?: string;
  isDelivered?: boolean;
  isRead?: boolean;
}

export interface ChatError {
  message: string;
  code?: string;
  details?: any;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const chatService = {
  async listUsers(): Promise<{ users: ChatUser[] }> {
    try {
      console.log('Fetching users from:', `${API_BASE_URL}/users`);
      const res = await api.get('/users');
      console.log('Users response:', res.data);
      return res.data.data;
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch users',
        code: error.response?.status,
        details: error.response?.data
      } as ChatError;
    }
  },

  async getHistory(userId: string, limit = 200, offset = 0): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    try {
      console.log('Fetching messages for user:', userId, 'from:', `${API_BASE_URL}/messages/${userId}`);
      const res = await api.get(`/messages/${userId}`, { 
        params: { limit, offset }
      });
      console.log('Messages response:', res.data);
      return {
        messages: res.data.data.messages || [],
        hasMore: res.data.data.hasMore || false
      };
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      throw {
        message: error.response?.data?.message || 'Failed to fetch message history',
        code: error.response?.status,
        details: error.response?.data
      } as ChatError;
    }
  },

  async uploadFile(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ file: { key: string; url: string; name: string; size: number } }> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('file', file);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          if (onProgress && progressEvent.total) {
            const progress: UploadProgress = {
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
            };
            onProgress(progress);
          }
        }
      };

      api.post('/upload', form, config)
        .then(res => {
          resolve({
            file: {
              ...res.data.data.file,
              name: file.name,
              size: file.size
            }
          });
        })
        .catch((error: any) => {
          reject({
            message: error.response?.data?.message || 'Failed to upload file',
            code: error.response?.status,
            details: error.response?.data
          } as ChatError);
        });
    });
  },

  // Note: Backend doesn't have read status endpoint yet
  // async markMessagesAsRead(userId: string): Promise<void> {
  //   try {
  //     await api.post(`/messages/${userId}/read`);
  //   } catch (error: any) {
  //     console.warn('Failed to mark messages as read:', error);
  //     // Don't throw error for non-critical operation
  //   }
  // },

  // HTTP fallback for sending messages when socket is not connected
  async sendMessageHttp(userId: string, message: string, fileKey?: string): Promise<{ message: ChatMessage }> {
    try {
      console.log('Sending message via HTTP:', userId, 'content:', message, 'fileKey:', fileKey);
      const res = await api.post('/messages', {
        receiverId: userId,
        message: message.trim(),
        fileKey
      });
      console.log('HTTP send response:', res.data);
      
      // Ensure that response has the correct message structure
      const messageData = res.data.data?.message || res.data.data;
      
      if (!messageData) {
        throw new Error('Invalid response format from server');
      }
      
      return { message: messageData };
    } catch (error: any) {
      console.error('Error sending message via HTTP:', error);
      throw {
        message: error.response?.data?.message || 'Failed to send message',
        code: error.response?.status,
        details: error.response?.data
      } as ChatError;
    }
  },
  // async markMessagesAsRead(userId: string): Promise<void> {
  //   try {
  //     await api.post(`/messages/${userId}/read`);
  //   } catch (error: any) {
  //     console.warn('Failed to mark messages as read:', error);
  //     // Don't throw error for non-critical operation
  //   }
  // },

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await api.delete(`/messages/${messageId}`);
    } catch (error: any) {
      throw {
        message: error.response?.data?.message || 'Failed to delete message',
        code: error.response?.status,
        details: error.response?.data
      } as ChatError;
    }
  }
};

