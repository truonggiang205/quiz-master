import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { PremiumList, PremiumListItem } from './PremiumList';

export interface ChatItem {
  id: string | number;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
  unreadCount?: number;
  isTyping?: boolean;
  isRead?: boolean;
  isSentByMe?: boolean;
}

interface ChatListProps {
  items: ChatItem[];
  onChatClick?: (item: ChatItem) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ items, onChatClick }) => {
  return (
    <PremiumList className="max-w-2xl">
      {items.map((chat) => (
        <PremiumListItem
          key={chat.id}
          onClick={() => onChatClick?.(chat)}
          hoverColorClass="bg-sky-600"
          avatar={
            <>
              <img
                src={chat.avatar}
                alt={chat.name}
                className="w-14 h-14 rounded-full object-cover shadow-sm p-0.5 border-2 border-slate-100 group-hover:border-sky-200 transition-colors duration-300"
              />
              {chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              )}
            </>
          }
          rightAction={
            chat.unreadCount ? (
              <div className="bg-sky-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md shadow-sky-500/30">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </div>
            ) : null
          }
        >
          {/* Chat Info (Middle Section) */}
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`text-base truncate group-hover:text-sky-900 transition-colors ${
                chat.unreadCount ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
              }`}
            >
              {chat.name}
            </h3>
            <span
              className={`text-xs whitespace-nowrap ml-2 ${
                chat.unreadCount ? 'text-sky-600 font-semibold' : 'text-slate-400'
              }`}
            >
              {chat.timestamp}
            </span>
          </div>

          <div className="flex items-center text-sm">
            {chat.isSentByMe && (
              <div className="mr-1.5 flex-shrink-0">
                {chat.isRead ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : (
                  <Check className="w-4 h-4 text-slate-400" />
                )}
              </div>
            )}

            {chat.isTyping ? (
              <span className="text-sky-500 font-medium italic truncate flex items-center">
                đang soạn tin...
              </span>
            ) : (
              <span
                className={`truncate ${
                  chat.unreadCount ? 'text-slate-800 font-medium' : 'text-slate-500'
                }`}
              >
                {chat.lastMessage}
              </span>
            )}
          </div>
        </PremiumListItem>
      ))}
    </PremiumList>
  );
};
