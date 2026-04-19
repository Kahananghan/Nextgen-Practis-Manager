import React, { useEffect, useRef, useState } from 'react';
import { 
  X, Paperclip, Send, MessageSquare, AlertCircle, 
  Check, CheckCheck, MoreVertical, Trash2, Download,
  User as UserIcon, Clock, Image, File
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { formatDistanceToNow, formatFileSize } from '../../utils/dateUtils';
import { chatService } from '../../services/chatService';

function isImageUrl(url?: string) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url.split('?')[0] || '');
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return Image;
  }
  return File;
}

interface MessageBubbleProps {
  message: any;
  isMine: boolean;
  onDelete?: (messageId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const FileIcon = getFileIcon(message.file?.name || '');

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div className="max-w-[78%] relative">
        <div
          className={`p-3 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm ${
            isMine
              ? 'bg-[#6366f1] text-white rounded-tr-none'
              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
          }`}
        >
          {message.message && (
            <div className="whitespace-pre-wrap break-words">{message.message}</div>
          )}
          
          {message.file && (
            <div className={`${message.message ? 'mt-2' : ''}`}>
              {isImageUrl(message.file.url) ? (
                <div className="relative">
                  <img
                    src={message.file.url}
                    alt="Attachment"
                    className="max-h-60 rounded-xl border border-white/20 object-cover cursor-pointer"
                    onClick={() => window.open(message.file.url, '_blank')}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded">
                    {formatFileSize(message.file.size)}
                  </div>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-2 p-2 rounded-lg ${
                  isMine ? 'bg-white/10' : 'bg-slate-50'
                }`}>
                  <FileIcon size={16} className={isMine ? 'text-white' : 'text-slate-500'} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-medium truncate ${
                      isMine ? 'text-white' : 'text-slate-700'
                    }`}>
                      {message.file.name}
                    </div>
                    <div className={`text-[10px] ${
                      isMine ? 'text-white/70' : 'text-slate-500'
                    }`}>
                      {formatFileSize(message.file.size)}
                    </div>
                  </div>
                  <a
                    href={message.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`p-1.5 rounded hover:bg-black/10 transition-colors ${
                      isMine ? 'text-white' : 'text-[#6366f1]'
                    }`}
                    title="Download"
                  >
                    <Download size={14} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <div className={`text-[9px] ${
            isMine ? 'text-slate-400 text-right' : 'text-slate-400'
          }`}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </div>
          
          {isMine && (
            <div className="flex items-center gap-1">
              {message.isRead ? (
                <CheckCheck size={12} className="text-blue-500" />
              ) : message.isDelivered ? (
                <Check size={12} className="text-slate-400" />
              ) : null}
            </div>
          )}
          
          {isMine && onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded hover:bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all"
                title="More options"
              >
                <MoreVertical size={12} />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-6 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10">
                    <button
                      onClick={() => {
                        onDelete(message.id);
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ChatDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { 
    state, 
    sendMessage, 
    sendFile, 
    loadUsers, 
    selectUser, 
    clearError, 
    deleteMessage,
    currentUserId  // ✅ Get currentUserId from chat context
  } = useChat();
  
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Load users when drawer opens
  useEffect(() => {
    if (isOpen && state.users.length === 0) {
      loadUsers();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || !state.selectedUser) return;

    setText('');
    await sendMessage(message);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.selectedUser) return;

    // Upload file first, then send message with file
    try {
      const { file: uploaded } = await chatService.uploadFile(file);
      
      // Send message with file (like the old ChatDrawer did)
      await sendMessage('', uploaded.key);
      
      e.target.value = '';
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const handleUserSelect = (user: any) => {
    console.log('User clicked in drawer:', user);
    selectUser(user);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
  };

  const loadMoreMessages = () => {
    if (state.selectedUser && state.hasMoreMessages && !state.loadingMore) {
      loadUsers(); // This will be replaced with proper loadMore implementation
    }
  };

  const selectedUserId = state.selectedUser?.id;
  const isTyping = state.typing[selectedUserId || ''];

  return (
    <div
      className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/10 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        className={`absolute top-0 right-0 h-full w-[920px] max-w-[95vw] bg-white shadow-[0_0_50px_rgba(0,0,0,0.12)] border-l border-slate-100 transform transition-transform duration-500 ease-out flex ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Left: user list */}
        <div className="w-[320px] border-r border-slate-100 flex flex-col">
          <div className="h-14 px-5 border-b border-[#c7d2fe] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#1e2124] rounded-xl flex items-center justify-center text-[#6366f1]">
                <MessageSquare size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800 tracking-tight">Chat</div>
              </div>
            </div>
          </div>

          {/* Error display */}
          {state.error && (
            <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-[#e05252] mt-0.5" />
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-red-800">{state.error.message}</div>
                  <button
                    onClick={clearError}
                    className="text-[10px] text-red-600 hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {state.loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1] mx-auto mb-3"></div>
                <div className="text-xs text-slate-400 font-medium">Loading users...</div>
              </div>
            ) : (
              <>
                {state.users.map((user) => {
                  const isSelected = state.selectedUser?.id === user.id;
                  const isOnline = user.status === 'active';
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={user.avatar || `https://picsum.photos/seed/${user.id}/40/40`}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl border border-slate-200 shadow-sm object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isOnline ? 'bg-[#1d9e75]' : 'bg-slate-300'
                          }`}
                          title={isOnline ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-800 truncate">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate">{user.email}</div>
                      </div>
                      {isOnline && (
                        <div className="w-1.5 h-1.5 bg-[#1d9e75] rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })}

                {state.users.length === 0 && !state.loading && (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    No users found.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 px-5 border-b border-[#c7d2fe] flex items-center justify-between bg-white">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-800 tracking-tight truncate">
                {state.selectedUser ? state.selectedUser.name : 'Select a user'}
              </div>
              {state.selectedUser && (
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      state.selectedUser.status === 'active' ? 'bg-[#1d9e75] animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {state.selectedUser.status === 'active' ? 'Online' : 'Offline'}
                  </span>
                  {isTyping && (
                    <span className="text-[9px] text-[#6366f1] font-medium animate-pulse">
                      typing...
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-300 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-all"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-5 bg-slate-50/30 scrollbar-hide"
          >
            {!state.selectedUser && (
              <div className="h-full flex items-center justify-center text-center px-8">
                <div className="max-w-sm">
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-[#6366f1] mx-auto mb-4">
                    <MessageSquare size={20} />
                  </div>
                  <div className="text-xs font-black text-slate-800">Start a conversation</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    Pick a user on the left to view history and send messages.
                  </div>
                </div>
              </div>
            )}

            {state.selectedUser && (
              <div className="space-y-4">
                {/* Load more button */}
                {state.hasMoreMessages && (
                  <div className="text-center">
                    <button
                      onClick={loadMoreMessages}
                      disabled={state.loadingMore}
                      className="text-[11px] text-[#6366f1] hover:text-[#4f52d4] font-medium disabled:opacity-50"
                    >
                      {state.loadingMore ? 'Loading...' : 'Load older messages'}
                    </button>
                  </div>
                )}

                {/* Messages */}
                {state.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isMine={message.senderId === currentUserId}
                    onDelete={handleDeleteMessage}
                  />
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-1 h-1 bg-[#6366f1] rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-[#6366f1] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1 h-1 bg-[#6366f1] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Upload progress */}
          {state.uploadProgress && (
            <div className="px-5 py-2 bg-slate-50 border-t">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#6366f1] transition-all duration-300"
                      style={{ width: `${state.uploadProgress.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {state.uploadProgress.percentage}%
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="p-5 border-t bg-white">
            <div className="flex items-end gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!state.selectedUser || state.uploadProgress}
                placeholder={
                  state.selectedUser 
                    ? 'Type a message…' 
                    : 'Select a user to start chatting'
                }
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition-all placeholder:text-slate-400 disabled:opacity-60"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={!state.selectedUser || state.uploadProgress}
              />
              <button
                type="button"
                disabled={!state.selectedUser || state.uploadProgress}
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-500 transition-all disabled:opacity-60"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="submit"
                disabled={!state.selectedUser || !text.trim() || state.uploadProgress}
                className="p-3 bg-[#6366f1] text-white rounded-xl hover:bg-[#6366f1] transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
                title="Send"
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
