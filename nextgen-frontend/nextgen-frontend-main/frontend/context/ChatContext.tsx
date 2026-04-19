import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { io, Socket } from '../services/socketService';
import { chatService, ChatUser, ChatMessage, ChatError, UploadProgress } from '../services/chatService';
import { useAuth } from './AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface ChatState {
  users: ChatUser[];
  selectedUser: ChatUser | null;
  messages: ChatMessage[];
  loading: boolean;
  error: ChatError | null;
  isConnected: boolean;
  typing: { [userId: string]: boolean };
  uploadProgress: UploadProgress | null;
  hasMoreMessages: boolean;
  loadingMore: boolean;
}

type ChatAction =
  | { type: 'SET_USERS'; payload: ChatUser[] }
  | { type: 'SET_SELECTED_USER'; payload: ChatUser | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { messageId: string; updates: Partial<ChatMessage>; replaceWith?: ChatMessage } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ChatError | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_USER_STATUS'; payload: { userId: string; status: 'active' | 'offline' } }
  | { type: 'SET_TYPING'; payload: { userId: string; isTyping: boolean } }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: UploadProgress | null }
  | { type: 'SET_HAS_MORE_MESSAGES'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'APPEND_MESSAGES'; payload: ChatMessage[] }
  | { type: 'DELETE_MESSAGE'; payload: string };

const initialState: ChatState = {
  users: [],
  selectedUser: null,
  messages: [],
  loading: false,
  error: null,
  isConnected: false,
  typing: {},
  uploadProgress: null,
  hasMoreMessages: false,
  loadingMore: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_SELECTED_USER':
      return { ...state, selectedUser: action.payload, messages: [] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case 'UPDATE_MESSAGE':
      const { messageId, updates, replaceWith } = action.payload;
      
      if (replaceWith) {
        // Replace temporary message with real message
        const tempMessageIndex = state.messages.findIndex(msg => msg.id.startsWith('temp-') && 
          msg.senderId === replaceWith.senderId && 
          msg.receiverId === replaceWith.receiverId);
        
        if (tempMessageIndex !== -1) {
          const newMessages = [...state.messages];
          newMessages[tempMessageIndex] = replaceWith;
          return { ...state, messages: newMessages };
        }
      }
      
      // Update existing message
      const updatedMessages = state.messages.map(msg =>
        msg.id === messageId
          ? { ...msg, ...updates }
          : msg
      );
      return { ...state, messages: updatedMessages };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      console.error('Chat Error:', action.payload);
      return {
        ...state,
        error: action.payload,
        loading: false,
        loadingMore: false
      };
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    case 'SET_USER_STATUS':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId
            ? { ...user, status: action.payload.status }
            : user
        ),
        selectedUser:
          state.selectedUser?.id === action.payload.userId
            ? { ...state.selectedUser, status: action.payload.status }
            : state.selectedUser,
      };
    case 'SET_TYPING':
      return {
        ...state,
        typing: { ...state.typing, [action.payload.userId]: action.payload.isTyping },
      };
    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };
    case 'SET_HAS_MORE_MESSAGES':
      return { ...state, hasMoreMessages: action.payload };
    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.payload };
    case 'APPEND_MESSAGES':
      return { ...state, messages: [...action.payload, ...state.messages] };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload),
      };
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (message: string, fileKey?: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
  loadUsers: () => Promise<void>;
  loadMessages: (userId: string, loadMore?: boolean) => Promise<void>;
  selectUser: (user: ChatUser | null) => void;
  clearError: () => void;
  deleteMessage: (messageId: string) => Promise<void>;
  currentUserId: string | undefined;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = (user as any)?.id as string | undefined;
  
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !currentUserId) return;

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      secure: true,
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: maxReconnectAttempts,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Chat socket connected');
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      reconnectAttempts.current = 0;
    });

    socket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          message: 'Failed to connect to chat server',
          code: 'SOCKET_CONNECTION_ERROR',
          details: error
        }
      });
    });

    socket.on('user_online', ({ userId }: { userId: string }) => {
      dispatch({ type: 'SET_USER_STATUS', payload: { userId, status: 'active' } });
      // setSelectedUser((prev) => (prev?.id === userId) ? { ...prev, status: 'active' } : prev));
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      dispatch({ type: 'SET_USER_STATUS', payload: { userId, status: 'offline' } });
      // setSelectedUser((prev) => (prev?.id === userId) ? { ...prev, status: 'offline' } : prev));
    });

    socket.on('receive_message', (msg: ChatMessage) => {
      const selectedUserId = state.selectedUser?.id;
      if (!selectedUserId) return;
      
      const belongs =
        (msg.senderId === selectedUserId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === selectedUserId);
      
      if (belongs) {
        const isOwnMessage = msg.senderId === currentUserId;
        const isTempMessage = msg.id.startsWith('temp-');
        
        console.log('Message analysis:', {
          isOwnMessage,
          isTempMessage,
          msgId: msg.id,
          senderId: msg.senderId,
          currentUserId
        });
        
        if (isOwnMessage && !isTempMessage) {
          
          // Remove all temporary messages for this conversation
          const filteredMessages = state.messages.filter(m => {
            const shouldRemove = m.id.startsWith('temp-') && 
              m.senderId === msg.senderId && 
              m.receiverId === msg.receiverId;
            
            return !shouldRemove;
          });
                    
          // Add the real message
          dispatch({ 
            type: 'SET_MESSAGES', 
            payload: [...filteredMessages, msg] 
          });
        } else {
          dispatch({ type: 'ADD_MESSAGE', payload: msg });
        }
      }
    });

    socket.on('message_delivered', ({ messageId }: { messageId: string }) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { messageId, updates: { isDelivered: true } }
      });
    });

    socket.on('message_read', ({ messageId }: { messageId: string }) => {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { messageId, updates: { isRead: true } }
      });
    });

    socket.on('typing_start', ({ userId }: { userId: string }) => {
      if (userId !== currentUserId) {
        dispatch({ type: 'SET_TYPING', payload: { userId, isTyping: true } });
      }
    });

    socket.on('typing_stop', ({ userId }: { userId: string }) => {
      if (userId !== currentUserId) {
        dispatch({ type: 'SET_TYPING', payload: { userId, isTyping: false } });
      }
    });

    return () => {
      socket.off();
      socket.off('typing_stop');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, state.selectedUser?.id]);

  const sendMessage = async (message: string, fileKey?: string): Promise<void> => {
    if (!state.selectedUser?.id || !currentUserId) return;

    const messageContent = message.trim();
    
    // If no message and no file, don't send
    if (!messageContent && !fileKey) return;

    // Only create temporary message for text messages, not file messages
    // File messages will be received via Socket.IO with proper data
    let tempMessage: ChatMessage | null = null;
    
    if (messageContent && !fileKey) {
      // Text message - create temporary message for immediate UI feedback
      // Create temp message regardless of socket connection state
      tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: currentUserId!,
        receiverId: state.selectedUser.id,
        message: messageContent,
        file: null,
        createdAt: new Date().toISOString(),
        isDelivered: false,
        isRead: false
      };
      
      // Add to local state immediately for sender
      dispatch({ type: 'ADD_MESSAGE', payload: tempMessage });
    }

    console.log('Attempting to send message:', {
      receiverId: state.selectedUser.id,
      message: messageContent,
      fileKey,
      socketConnected: socketRef.current?.connected
    });

    try {
      // Send via Socket.IO for real-time delivery (backend will save to database)
      if (socketRef.current && state.isConnected) {
        socketRef.current.emit('send_message', {
          receiverId: state.selectedUser.id,
          message: messageContent,
          fileKey,
        }, (response: any) => {
          console.log('Socket response:', response);
          if (!response.ok) {
            console.error('Socket message send failed:', response.error);
            dispatch({
              type: 'SET_ERROR',
              payload: {
                message: response.error || 'Failed to send message',
                code: 'SEND_MESSAGE_FAILED'
              }
            });
          } else {
            console.log('Message sent successfully via socket');
          }
        });
      } else {
        console.warn('Socket not connected, attempting HTTP fallback');
        // Fallback to HTTP API when socket is not connected
        try {
          const { message: savedMessage } = await chatService.sendMessageHttp(state.selectedUser.id, messageContent, fileKey);
          console.log('HTTP fallback successful:', savedMessage);
          
          // If we created a temp message, remove it and add the real one
          if (tempMessage) {
            // Remove all temporary messages for this conversation
            const filteredMessages = state.messages.filter(m => 
              !(m.id.startsWith('temp-') && 
                m.senderId === savedMessage.senderId && 
                m.receiverId === savedMessage.receiverId)
            );
            
            // Add the real message
            dispatch({ 
              type: 'SET_MESSAGES', 
              payload: [...filteredMessages, savedMessage] 
            });
          } else {
            // No temp message to remove, just add the real one
            dispatch({ type: 'ADD_MESSAGE', payload: savedMessage });
          }
        } catch (httpError) {
          console.error('HTTP fallback failed:', httpError);
          dispatch({
            type: 'SET_ERROR',
            payload: {
              message: httpError.message || 'Failed to send message',
              code: 'HTTP_SEND_FAILED'
            }
          });
        }
      }

    } catch (error) {
      console.error('Error in sendMessage:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: {
          message: 'Failed to send message',
          code: 'SEND_MESSAGE_FAILED'
        }
      });
    } finally {
      // Always reset loading state
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const sendFile = async (file: File): Promise<void> => {
    if (!state.selectedUser?.id) return;

    dispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const { file: uploaded } = await chatService.uploadFile(
        file,
        (progress) => dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: progress })
      );

      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          receiverId: state.selectedUser.id,
          fileKey: uploaded.key,
          fileName: file.name,
          fileSize: file.size
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error as ChatError
      });
    } finally {
      dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: null });
    }
  };

  const loadUsers = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const { users } = await chatService.listUsers();
      dispatch({ type: 'SET_USERS', payload: users });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as ChatError });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadMessages = async (userId: string, loadMore = false): Promise<void> => {
    if (!currentUserId) return;

    console.log('Loading messages for user:', userId, 'loadMore:', loadMore);

    if (loadMore) {
      dispatch({ type: 'SET_LOADING_MORE', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }
    
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const offset = loadMore ? state.messages.length : 0;
      const { messages, hasMore } = await chatService.getHistory(userId, 50, offset);
      
      console.log('Messages loaded:', messages.length, 'hasMore:', hasMore);
      
      if (loadMore) {
        dispatch({ type: 'APPEND_MESSAGES', payload: messages });
      } else {
        dispatch({ type: 'SET_MESSAGES', payload: messages });
      }
      
      dispatch({ type: 'SET_HAS_MORE_MESSAGES', payload: hasMore });
    } catch (error) {
      console.error('Failed to load messages:', error);
      dispatch({ type: 'SET_ERROR', payload: error as ChatError });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  };

  const selectUser = (user: ChatUser | null) => {
    console.log('Selecting user:', user);
    dispatch({ type: 'SET_SELECTED_USER', payload: user });
    if (user) {
      loadMessages(user.id);
    }
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const deleteMessage = async (messageId: string): Promise<void> => {
    try {
      await chatService.deleteMessage(messageId);
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as ChatError });
    }
  };

  const value: ChatContextType = {
    state,
    sendMessage,
    sendFile,
    loadUsers,
    loadMessages,
    selectUser,
    clearError,
    deleteMessage,
    currentUserId, 
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
