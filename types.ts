export interface User {
  id: string;
  name: string;
  full_name?: string;
  avatar: string;
  email?: string;
  phone?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  preferences?: {
    dmSound?: string;
    groupSound?: string;
    mediaAutoDownload?: 'wifi' | 'cellular' | 'never';
    imageQuality?: 'standard' | 'high';
    theme?: 'light' | 'dark' | 'system';
    enterIsSend?: boolean;
    readReceipts?: boolean;
    wallpaper?: string;
  };
}

export interface Attachment {
  type: 'image' | 'video' | 'file';
  url: string; // Base64 for this demo
  name?: string;
  size?: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isActionItem?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of user IDs
  scheduledFor?: Date;
  status?: 'sent' | 'delivered' | 'read' | 'scheduled';
  
  // Telegram-style features
  editedAt?: Date;         // New: Track if message was edited
  isDeleted?: boolean;     // New: Soft delete flag
  
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
    previewMedia?: string; 
  };
  media?: Attachment;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  priority: 'high' | 'normal';
  unreadCount: number;
  participants: User[];
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
  created_at?: string;
  isPinned?: boolean;
  notificationSound?: string;
}

export interface ActionItem {
  id: string;
  sourceMessageId: string;
  chatId: string;
  title: string;
  dueDateTime: string;
  recurrence?: string; 
  location?: string;   
  isCompleted: boolean;
}

export type TabType = 'priority' | 'groups' | 'actions';

export type SortOption = 'time' | 'unread' | 'alpha';

export interface CallSession {
  isActive: boolean;
  isIncoming: boolean;
  isVideo: boolean;
  partnerName: string;
  partnerAvatar?: string;
  status: 'ringing' | 'connected' | 'ended';
  isGroup?: boolean;
  participants?: User[];
}