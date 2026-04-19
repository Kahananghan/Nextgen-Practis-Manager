import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { X, Paperclip, Send, MessageSquare } from 'lucide-react';
import { chatService, ChatMessage, ChatUser } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(url.split('?')[0] || '');
}

export default function ChatDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const currentUserId = (user as any)?.id as string | undefined;

  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const selectedUserId = selectedUser?.id || null;

  const headerStatus = useMemo(() => {
    if (!selectedUser?.status) return 'offline';
    return selectedUser.status;
  }, [selectedUser?.status]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    (async () => {
      try {
        const { users: list } = await chatService.listUsers();
        if (!cancelled) setUsers(list);
      } catch (e) {
        // ignore for now
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('user_online', ({ userId }: { userId: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)),
      );
      setSelectedUser((prev) => (prev?.id === userId ? { ...prev, status: 'active' } : prev));
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'offline' } : u)),
      );
      setSelectedUser((prev) => (prev?.id === userId ? { ...prev, status: 'offline' } : prev));
    });

    socket.on('receive_message', (msg: ChatMessage) => {
      // Only append if it belongs to current open conversation
      if (!selectedUserId) return;
      const belongs =
        (msg.senderId === selectedUserId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === selectedUserId);
      if (!belongs) return;
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, selectedUserId, currentUserId]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const { messages } = await chatService.getHistory(selectedUserId);
        if (!cancelled) setMessages(messages);
      } catch (e) {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedUserId]);

  const handleSend = async (payload: { message?: string | null; fileKey?: string | null }) => {
    if (!socketRef.current || !selectedUserId || !currentUserId) return;
    setSending(true);
    socketRef.current.emit(
      'send_message',
      { receiverId: selectedUserId, message: payload.message || null, fileKey: payload.fileKey || null },
      () => {
        setSending(false);
      },
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || !selectedUserId) return;
    setText('');
    await handleSend({ message: value });
  };

  const onPickFile = async (file: File) => {
    if (!selectedUserId) return;
    setUploading(true);
    try {
      const { file: uploaded } = await chatService.uploadFile(file);
      await handleSend({ message: text.trim() || null, fileKey: uploaded.key });
      setText('');
    } finally {
      setUploading(false);
    }
  };

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

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {users.map((u) => {
              const active = selectedUser?.id === u.id;
              const online = (u.status || '').toLowerCase() === 'active';
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-5 py-3 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    active ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={u.avatar || `https://picsum.photos/seed/${u.id}/40/40`}
                      alt={u.name}
                      className="w-9 h-9 rounded-xl border border-slate-200 shadow-sm object-cover"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        online ? 'bg-[#1d9e75]' : 'bg-slate-300'
                      }`}
                      title={online ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-800 truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium truncate">{u.email}</div>
                  </div>
                </button>
              );
            })}

            {users.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400 font-medium">
                No users found.
              </div>
            )}
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-14 px-5 border-b border-[#c7d2fe] flex items-center justify-between bg-white">
            <div className="min-w-0">
              <div className="text-sm font-black text-slate-800 tracking-tight truncate">
                {selectedUser ? selectedUser.name : 'Select a user'}
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      headerStatus.toLowerCase() === 'active' ? 'bg-[#1d9e75] animate-pulse' : 'bg-slate-300'
                    }`}
                  />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {headerStatus.toLowerCase() === 'active' ? 'Online' : 'Offline'}
                  </span>
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

          <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 scrollbar-hide">
            {!selectedUser && (
              <div className="h-full flex items-center justify-center text-center px-8">
                <div className="max-w-sm">
                  <div className="text-xs font-black text-slate-800">Start a conversation</div>
                  <div className="text-[11px] text-slate-400 font-medium mt-1">
                    Pick a user on the left to view history and send messages.
                  </div>
                </div>
              </div>
            )}

            {selectedUser && (
              <div className="space-y-4">
                {messages.map((m) => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[78%]">
                        <div
                          className={`p-3 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm ${
                            mine
                              ? 'bg-[#6366f1] text-white rounded-tr-none'
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                          }`}
                        >
                          {m.message && <div className="whitespace-pre-wrap">{m.message}</div>}
                          {m.file?.url && (
                            <div className={`${m.message ? 'mt-2' : ''}`}>
                              {isImageUrl(m.file.url) ? (
                                <img
                                  src={m.file.url}
                                  alt="Attachment"
                                  className="max-h-60 rounded-xl border border-white/20 object-cover"
                                />
                              ) : (
                                <a
                                  href={m.file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-2 text-[11px] font-black underline ${
                                    mine ? 'text-white/90' : 'text-[#6366f1]'
                                  }`}
                                >
                                  <Paperclip size={14} />
                                  Open attachment
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          className={`mt-1 text-[9px] font-black uppercase tracking-widest ${
                            mine ? 'text-slate-400 text-right' : 'text-slate-400'
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="p-5 border-t bg-white">
            <div className="flex items-end gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!selectedUser || uploading}
                placeholder={selectedUser ? 'Type a message…' : 'Select a user to start chatting'}
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6366f1] transition-all placeholder:text-slate-400 disabled:opacity-60"
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  onPickFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={!selectedUser || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-500 transition-all disabled:opacity-60"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <button
                type="submit"
                disabled={!selectedUser || !text.trim() || uploading || sending}
                className="p-3 bg-[#6366f1] text-white rounded-xl hover:bg-[#4f52d4] transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none"
                title="Send"
              >
                <Send size={16} strokeWidth={2.5} />
              </button>
            </div>
            {uploading && (
              <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Uploading…
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

