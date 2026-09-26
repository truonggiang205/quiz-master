import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Info, BellRing } from 'lucide-react';
import { notificationService, Notification } from '../../services/notification.service';
import { useUiStore } from '../../stores/ui.store';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'GENERAL' | 'PERSONAL'>('PERSONAL');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useUiStore();

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getMyNotifications();
      setNotifications(data);
    } catch {
      // fail silently for polling
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {
      addToast({ type: 'error', title: 'Lỗi đánh dấu đã đọc' });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      addToast({ type: 'error', title: 'Lỗi' });
    }
  };

  const filtered = notifications.filter(n => n.type === tab);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[44px] h-[44px] rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all relative group"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 animate-wiggle" />
        ) : (
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-lg">Thông báo</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="flex px-4 pt-3 gap-4 border-b border-slate-100">
            <button
              onClick={() => setTab('PERSONAL')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'PERSONAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Cá nhân
            </button>
            <button
              onClick={() => setTab('GENERAL')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                tab === 'GENERAL' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Hệ thống
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-slate-300" />
                </div>
                <p className="text-sm font-medium">Không có thông báo nào</p>
              </div>
            ) : (
              filtered.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-3 rounded-2xl transition-all flex gap-3 mb-1 group ${n.isRead ? 'opacity-70 hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm mb-0.5 ${n.isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-slate-400 font-medium mt-1.5 block">
                      {new Date(n.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {!n.isRead && (
                    <button 
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-slate-300 hover:bg-indigo-200 hover:text-indigo-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Đánh dấu đã đọc"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
