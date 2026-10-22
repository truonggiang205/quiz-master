import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Search, Send, User, Mail, Bell, ChevronLeft } from 'lucide-react';
import io, { Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { chatService, Conversation, Message, ChatUser } from '../../services/chat.service';
import { UserAvatar } from './UserAvatar';


export const FloatingChat: React.FC = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONTACTS' | 'CHAT'>('CONTACTS');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRef = useRef('');
  const [socket, setSocket] = useState<Socket | null>(null);

  const { addToast } = useUiStore();
  const activeConvRef = useRef<Conversation | null>(null);
  const isOpenRef = useRef<boolean>(false);

  useEffect(() => {
    activeConvRef.current = activeConv;
    isOpenRef.current = isOpen;
  }, [activeConv, isOpen]);

  useEffect(() => {
    if (!user) return;
    
    // Fix Socket URL by stripping /api from backend URL
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');

    // Initialize socket
    const newSocket = io(socketUrl, {
      query: { userId: user.id },
    });

    setSocket(newSocket);

    newSocket.on('newMessage', (msg: Message & { sender?: ChatUser }) => {
        setMessages(prev => {
          // If the message is for the currently open conversation (or from the user we are chatting with), append it
          const isActiveChat = activeConvRef.current && 
            (activeConvRef.current.id === msg.conversationId || activeConvRef.current.otherUser?.id === msg.senderId);
            
          if (isActiveChat) {
            return [...prev, msg];
          }
          return prev;
        });
        
        // Show notification if chat is not open or not in the active conversation
        const isNotActiveChat = !activeConvRef.current || 
          (activeConvRef.current.id !== msg.conversationId && 
           activeConvRef.current.otherUser?.id !== msg.senderId);
          
        if (!isOpenRef.current || isNotActiveChat) {
          addToast({
            type: 'message',
            title: msg.sender?.name || 'Tin nhắn mới',
            message: msg.content,
            avatar: msg.sender?.avatar || null,
            payload: msg.sender,
          });
        }
        
        loadConversations(); // refresh unread count / last message
      });

    newSocket.on('messageSent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      loadConversations();
      
      // Update temp conversation ID to real ID if this is the first message sent
      setActiveConv(prev => {
        if (prev?.id === 'temp') {
          return { ...prev, id: msg.conversationId };
        }
        return prev;
      });
    });

    newSocket.on('userTyping', ({ userId, isTyping }: { userId: string, isTyping: boolean }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: isTyping }));
    });

    newSocket.on('messagesRead', ({ conversationId }: { conversationId: string }) => {
      setMessages(prev => prev.map(m => (m.conversationId === conversationId ? { ...m, isRead: true } : m)));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    // Listen for custom event to open chat from toast click
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetUser = customEvent.detail?.user;
      if (targetUser) {
        setIsOpen(true);
        startChatWith(targetUser);
      }
    };
    window.addEventListener('openChat', handleOpenChat);

    return () => {
      window.removeEventListener('openChat', handleOpenChat);
    };
  }, [conversations]); // Dependency added to ensure we have conversations loaded if possible

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeConv && activeConv.id !== 'temp') {
      loadMessages(activeConv.id);
    }
  }, [activeConv]);

  const loadMessages = async (convId: string) => {
    try {
      const data = await chatService.getMessages(convId);
      setMessages(data);
      // clear unread count locally
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    if (isOpen && activeConv && activeConv.id !== 'temp' && messages.length > 0) {
      const unreadFromOther = messages.some(m => !m.isRead && m.senderId !== user?.id);
      if (unreadFromOther) {
        socket?.emit('readMessages', { receiverId: activeConv.otherUser?.id, conversationId: activeConv.id });
        setMessages(prev => prev.map(m => m.senderId !== user?.id ? { ...m, isRead: true } : m));
      }
    }
  }, [messages, isOpen, activeConv, user?.id]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    const trimmed = q.trim();
    latestSearchRef.current = trimmed;

    if (trimmed.length > 2) {
      try {
        const results = await chatService.searchUsers(trimmed);
        if (latestSearchRef.current === trimmed) {
          setSearchResults(results);
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const startChatWith = async (targetUser: ChatUser) => {
    let existing = conversations.find(c => c.otherUser?.id === targetUser.id);
    
    // If not found in current state, fetch fresh from server (in case it was just created)
    if (!existing) {
      try {
        const freshConvs = await chatService.getConversations();
        setConversations(freshConvs);
        existing = freshConvs.find((c: any) => c.otherUser?.id === targetUser.id);
      } catch (e) {}
    }

    if (existing) {
      setActiveConv(existing);
    } else {
      // Fake a temp conversation to start chatting
      setActiveConv({
        id: 'temp',
        participants: [user!.id, targetUser.id],
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        otherUser: targetUser,
      });
      setMessages([]);
    }
    setActiveTab('CHAT');
    setSearchQuery('');
  };

  const handleSend = () => {
    if (!newMessage.trim() || !activeConv || !user) return;
    const receiverId = activeConv.otherUser?.id;
    if (!receiverId) return;

    socket?.emit('sendMessage', {
      receiverId,
      content: newMessage,
    });
    setNewMessage('');
    socket?.emit('typing', { receiverId, isTyping: false });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    const receiverId = activeConv?.otherUser?.id;
    if (receiverId) {
      socket?.emit('typing', { receiverId, isTyping: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('typing', { receiverId, isTyping: false });
      }, 2000);
    }
  };

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!user) return null;

  return (
    <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] z-50 flex flex-col items-end">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[350px] max-w-[calc(100vw-3rem)] h-[calc(100vh-120px)] max-h-[550px] bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
          
          {/* Header */}
          <div className="h-16 bg-gradient-to-r from-sky-500 to-sky-600 px-4 flex items-center justify-between text-white shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2">
              {activeTab === 'CHAT' && (
                <button 
                  onClick={() => { setActiveTab('CONTACTS'); setActiveConv(null); }} 
                  className="hover:bg-white/20 p-1.5 rounded-full transition-colors shrink-0 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              
              <div className="flex items-center gap-3">
                {activeTab === 'CHAT' && activeConv?.otherUser && (
                  <UserAvatar
                    user={activeConv.otherUser}
                    size="md"
                    ring
                    ringColor="ring-white/30"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{activeTab === 'CHAT' ? activeConv?.otherUser?.name : 'Tin nhắn'}</h3>
                  {activeTab === 'CHAT' && <p className="text-xs text-sky-100 uppercase truncate">{activeConv?.otherUser?.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</p>}
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contacts Tab */}
          {activeTab === 'CONTACTS' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
              <div className="p-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    aria-label="Tìm kiếm theo tên hoặc email"
                    placeholder="Tìm theo tên hoặc email..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {searchQuery ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {searchResults.length > 0 ? (
                      searchResults.map(u => (
                        <button key={u.id} onClick={() => startChatWith(u)} className="w-full flex items-center gap-3 p-3 mb-1 rounded-2xl hover:bg-sky-50 border border-transparent hover:border-sky-100 transition-all text-left group shadow-sm bg-white">
                          <UserAvatar
                            user={u}
                            size="lg"
                            ring
                            ringColor="ring-slate-100 group-hover:ring-sky-300"
                          />
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-sm text-slate-800 truncate group-hover:text-sky-700 transition-colors">{u.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 group-hover:text-sky-400 transition-colors" />
                              <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                            </div>
                            <p className="text-[10px] uppercase font-bold text-sky-500/70 mt-0.5">{u.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-slate-400 text-sm">Không tìm thấy kết quả nào cho "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  conversations.map(c => (
                    <button key={c.id} onClick={() => startChatWith(c.otherUser!)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left group">
                      <div className="relative">
                        <UserAvatar
                          user={c.otherUser}
                          size="header"
                          ring
                          ringColor="ring-slate-200"
                        />
                        {c.unreadCount ? (
                          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-sm truncate ${c.unreadCount ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{c.otherUser?.name}</p>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${c.unreadCount ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                          {c.lastMessage?.senderId === user.id ? `Bạn: ${c.lastMessage?.content}` : c.lastMessage?.content || 'Chưa có tin nhắn'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
                {!searchQuery && conversations.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    Bạn chưa có đoạn chat nào. <br/> Hãy tìm kiếm để bắt đầu!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {messages.map((m, idx) => {
                  const isMe = m.senderId === user.id;
                  const isLastMessage = idx === messages.length - 1;
                  return (
                    <div 
                      key={m.id || idx} 
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div className="flex items-end gap-2 max-w-[85%]">
                        {!isMe && (
                          <UserAvatar
                            user={activeConv?.otherUser}
                            size="xs"
                            className="mb-0.5 shadow-sm"
                          />
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 text-[13px] md:text-sm shadow-sm ${
                          isMe 
                            ? 'bg-sky-600 text-white rounded-br-sm' 
                            : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                      {isMe && isLastMessage && m.isRead && (
                         <div className="flex items-center gap-1 mt-1 mr-1 animate-in fade-in zoom-in duration-300">
                           <UserAvatar
                             user={activeConv?.otherUser}
                             size={14}
                             className="opacity-80"
                           />
                         </div>
                      )}
                    </div>
                  );
                })}
                
                {activeConv?.otherUser?.id && typingUsers[activeConv.otherUser.id] && (
                  <div className="flex items-end gap-2 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <UserAvatar
                      user={activeConv.otherUser}
                      size="xs"
                      className="mb-0.5 shadow-sm"
                    />
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5 h-10">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full  [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full  [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full "></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 bg-white border-t border-slate-100 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.05)] z-10">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    aria-label="Soạn tin nhắn"
                    placeholder="Nhắn tin..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500 focus:bg-white transition-colors resize-none max-h-24 custom-scrollbar"
                    rows={1}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 hover:bg-sky-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md shadow-sky-200"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bubble Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-sky-600 hover:bg-sky-700 hover:scale-110 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(79,70,229,0.5)] transition-all relative group"
      >
        <MessageCircle className="w-6 h-6" />
        {!isOpen && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-rose-500 rounded-full border-2 border-white text-[10px] font-bold text-white flex items-center justify-center ">
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
};
