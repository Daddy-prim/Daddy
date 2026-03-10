// --- MOCK SUPABASE CLIENT ---
import { Message, Attachment } from '../types';

const USERS_KEY = 'prime_users';
const CHATS_KEY = 'prime_chats';
const MESSAGES_KEY = 'prime_messages';
const SESSION_KEY = 'prime_session';
const PARTICIPANTS_KEY = 'prime_chat_participants';

const broadcast = new BroadcastChannel('prime_realtime');

// --- SEED DATA ---
const seedData = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    const mockUsers = [
      { 
        id: 'u1', 
        email: 'sarah@prime.com', 
        phone: '+234 5550101', 
        full_name: 'Sarah Jen', 
        password: '123', 
        status: 'online', 
        statusMessage: 'Focusing',
        preferences: { dmSound: 'pop', groupSound: 'default', mediaAutoDownload: 'wifi', imageQuality: 'high' }
      },
      { id: 'u2', email: 'mike@prime.com', phone: '+1 5550102', full_name: 'Mike Ross', password: '123', status: 'busy', statusMessage: 'In a meeting' },
      { id: 'u3', email: 'dev@prime.com', phone: '+44 5550103', full_name: 'Dev Team', password: '123', status: 'away', statusMessage: 'Lunch' },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  }
};
seedData();

// --- HELPERS ---
const getStore = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setStore = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- BROWSER NOTIFICATIONS ---
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
};

export const sendLocalNotification = (title: string, body: string) => {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
};

// --- MOCK SUPABASE OBJECT ---
export const supabase = {
  auth: {
    getSession: async () => {
      const sessionUser = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      return { data: { session: sessionUser ? { user: sessionUser } : null }, error: null };
    },
    signInWithPassword: async ({ email, password }: any) => {
      await delay(500);
      const users = getStore(USERS_KEY);
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (user) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        window.dispatchEvent(new Event('storage')); 
        return { data: { user, session: { user } }, error: null };
      }
      return { data: null, error: { message: 'Invalid credentials' } };
    },
    signInWithOtp: async ({ phone }: any) => {
      await delay(800);
      console.log(`[Mock Supabase] Sending OTP to ${phone}...`);
      // In a real app, this sends an SMS via Twilio.
      // For mock, we just acknowledge the request.
      // We can store a temp OTP if we want to be strict, but for now we'll accept '123456'
      return { data: { message: "OTP sent" }, error: null };
    },
    verifyOtp: async ({ phone, token, type }: any) => {
      await delay(800);
      if (token !== '123456') {
        return { data: null, error: { message: 'Invalid OTP code' } };
      }

      const users = getStore(USERS_KEY);
      let user = users.find((u: any) => u.phone === phone);

      if (!user) {
        // Create new user if not exists (Sign Up via OTP)
        user = {
          id: 'u_' + Date.now(),
          email: '', // No email for phone-only auth
          phone,
          full_name: 'New User',
          status: 'online',
          statusMessage: 'Hey there! I am using Daddy.',
          preferences: { dmSound: 'default', groupSound: 'default', mediaAutoDownload: 'wifi', imageQuality: 'standard' }
        };
        users.push(user);
        setStore(USERS_KEY, users);
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event('storage'));
      return { data: { user, session: { user } }, error: null };
    },
    signUp: async ({ email, password, options }: any) => {
      await delay(800);
      const users = getStore(USERS_KEY);
      if (users.find((u: any) => u.email === email)) {
        return { data: null, error: { message: 'User already exists' } };
      }
      const newUser = {
        id: 'u_' + Date.now(),
        email,
        password,
        phone: options?.data?.phone || '',
        full_name: options?.data?.full_name || email.split('@')[0],
        status: 'online',
        statusMessage: '',
        preferences: { dmSound: 'default', groupSound: 'default', mediaAutoDownload: 'wifi', imageQuality: 'standard' }
      };
      
      console.log(`[Mock Supabase] Sending verification email to ${email}...`);
      
      users.push(newUser);
      setStore(USERS_KEY, users);
      // DO NOT set session here, forcing user to login manually after "verification"
      return { data: { user: newUser, session: null }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem(SESSION_KEY);
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      const handler = () => {
        const sessionUser = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        callback('SIGNED_IN', sessionUser ? { user: sessionUser } : null);
      };
      window.addEventListener('storage', handler);
      return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handler) } } };
    }
  },
  channel: (channelName: string) => {
    return {
      on: (type: string, filter: any, callback: any) => {
        const handler = (event: MessageEvent) => {
          const { table, new: record, type: eventType } = event.data;
          // Filter by event type and table
          if (type === 'postgres_changes') {
              if (filter.event !== '*' && filter.event !== eventType) return;
              if (filter.table !== table) return;
              
              if (filter.filter) {
                const [key, val] = filter.filter.split('=eq.');
                if (String(record[key]) !== String(val)) return;
              }
              
              callback({ new: record, eventType });
          }
        };
        broadcast.addEventListener('message', handler);
        return {
          subscribe: () => {} 
        };
      }
    };
  },
  removeChannel: (channel: any) => {
  }
};

// --- SERVICE FUNCTIONS ---

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
};

export const fetchUserChats = async (userId: string) => {
  await delay(200);
  const participants = getStore(PARTICIPANTS_KEY);
  const allChats = getStore(CHATS_KEY);
  const allUsers = getStore(USERS_KEY);
  
  const myChatIds = participants
    .filter((p: any) => p.user_id === userId)
    .map((p: any) => p.chat_id);
    
  return allChats
    .filter((c: any) => myChatIds.includes(c.id))
    .map((c: any) => {
      const chatParticipants = participants
        .filter((p: any) => p.chat_id === c.id)
        .map((p: any) => {
           const u = allUsers.find((user: any) => user.id === p.user_id);
           return u ? { id: u.id, name: u.full_name, avatar: '', status: u.status, statusMessage: u.statusMessage } : null;
        })
        .filter(Boolean);

      return {
        ...c,
        isGroup: c.is_group,
        unreadCount: c.unreadCount || 0,
        isPinned: c.isPinned || false,
        notificationSound: c.notificationSound || 'default',
        participants: chatParticipants,
        messages: []
      };
    });
};

export const fetchMessages = async (chatId: string) => {
  await delay(200);
  const allMessages = getStore(MESSAGES_KEY);
  return allMessages
    .filter((m: any) => m.chat_id === chatId && !m.is_deleted) // Filter out deleted? Or send them to UI to handle?
    // Let's send them to UI but handle 'is_deleted' flag to show "Message deleted"
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      text: m.content,
      timestamp: new Date(m.created_at),
      scheduledFor: m.scheduled_for ? new Date(m.scheduled_for) : undefined,
      status: m.status || 'sent',
      isActionItem: m.is_action_item,
      reactions: m.reactions || {},
      replyTo: m.reply_to || undefined,
      media: m.media || undefined,
      editedAt: m.edited_at ? new Date(m.edited_at) : undefined,
      isDeleted: m.is_deleted || false
    }));
};

// NEW: Edit Message
export const editMessage = async (messageId: string, newText: string) => {
  const allMessages = getStore(MESSAGES_KEY);
  const idx = allMessages.findIndex((m: any) => m.id === messageId);
  
  if (idx !== -1) {
    const updatedMsg = {
      ...allMessages[idx],
      content: newText,
      edited_at: new Date().toISOString()
    };
    allMessages[idx] = updatedMsg;
    setStore(MESSAGES_KEY, allMessages);
    
    broadcast.postMessage({
      type: 'UPDATE',
      table: 'messages',
      new: updatedMsg
    });
    return true;
  }
  return false;
};

// NEW: Delete Message
export const deleteMessage = async (messageId: string) => {
  const allMessages = getStore(MESSAGES_KEY);
  const idx = allMessages.findIndex((m: any) => m.id === messageId);
  
  if (idx !== -1) {
    // Soft delete
    const updatedMsg = {
      ...allMessages[idx],
      is_deleted: true,
      content: '' // Clear content for privacy
    };
    allMessages[idx] = updatedMsg;
    setStore(MESSAGES_KEY, allMessages);
    
    broadcast.postMessage({
      type: 'UPDATE', // We use UPDATE so clients know to re-render it as deleted
      table: 'messages',
      new: updatedMsg
    });
    return true;
  }
  return false;
};

export const sendMessageToDb = async (
  chatId: string, 
  senderId: string, 
  text: string, 
  scheduledDate?: Date, 
  replyTo?: any,
  media?: Attachment
) => {
  const allMessages = getStore(MESSAGES_KEY);
  const newMessage = {
    id: 'msg_' + Date.now(),
    chat_id: chatId,
    sender_id: senderId,
    content: text,
    created_at: scheduledDate ? scheduledDate.toISOString() : new Date().toISOString(),
    scheduled_for: scheduledDate ? scheduledDate.toISOString() : null,
    status: scheduledDate ? 'scheduled' : 'sent',
    is_action_item: false,
    reactions: {},
    reply_to: replyTo,
    media: media,
    edited_at: null,
    is_deleted: false
  };
  
  allMessages.push(newMessage);
  setStore(MESSAGES_KEY, allMessages);
  
  // Emit Realtime Event
  broadcast.postMessage({
    type: 'INSERT',
    table: 'messages',
    new: newMessage
  });
  
  return { data: [newMessage], error: null };
};

export const toggleReaction = async (chatId: string, messageId: string, userId: string, emoji: string) => {
  const allMessages = getStore(MESSAGES_KEY);
  const msgIndex = allMessages.findIndex((m: any) => m.id === messageId);
  
  if (msgIndex === -1) return;
  
  const msg = allMessages[msgIndex];
  if (!msg.reactions) msg.reactions = {};
  
  const userList = msg.reactions[emoji] || [];
  if (userList.includes(userId)) {
    msg.reactions[emoji] = userList.filter((id: string) => id !== userId);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  } else {
    msg.reactions[emoji] = [...userList, userId];
  }
  
  allMessages[msgIndex] = msg;
  setStore(MESSAGES_KEY, allMessages);

  broadcast.postMessage({
    type: 'UPDATE',
    table: 'messages',
    new: msg
  });
};

export const searchUsers = async (query: string) => {
  await delay(300);
  const users = getStore(USERS_KEY);
  const q = query.toLowerCase();
  
  return users.filter((u: any) => 
    u.full_name.toLowerCase().includes(q) || 
    u.email.toLowerCase().includes(q) ||
    (u.phone && u.phone.includes(q))
  ).slice(0, 5); 
};

export const sendInvite = async (type: 'sms' | 'email', contact: string) => {
  await delay(800);
  console.log(`Sending ${type} invite to ${contact}`);
  return true;
};

export const createGhostUser = async (identifier: string) => {
  const users = getStore(USERS_KEY);
  const isEmail = identifier.includes('@');
  
  const newUser = {
    id: 'u_' + Date.now(),
    email: isEmail ? identifier : '',
    phone: !isEmail ? identifier : '',
    full_name: isEmail ? identifier.split('@')[0] : identifier,
    password: '123', 
    is_ghost: true,
    status: 'offline'
  };
  
  users.push(newUser);
  setStore(USERS_KEY, users);
  return newUser;
};

// Updated to support Groups
export const createNewChat = async (currentUserId: string, participantIds: string[], chatName: string, isGroup: boolean) => {
  const chats = getStore(CHATS_KEY);
  const participants = getStore(PARTICIPANTS_KEY);
  
  // Basic check for existing 1:1 chat to avoid duplicates
  if (!isGroup && participantIds.length === 1) {
     const otherId = participantIds[0];
     // Simple check: do these 2 users already share a non-group chat?
     // (Skipping deep check for demo simplicity, just creating new or assuming unique)
  }

  const newChat = {
    id: 'c_' + Date.now(),
    name: chatName,
    is_group: isGroup,
    created_at: new Date().toISOString(),
    isPinned: false,
    notificationSound: 'default'
  };
  chats.push(newChat);
  setStore(CHATS_KEY, chats);
  
  // Add self
  participants.push({ chat_id: newChat.id, user_id: currentUserId });
  
  // Add others
  participantIds.forEach(pid => {
     participants.push({ chat_id: newChat.id, user_id: pid });
  });
  setStore(PARTICIPANTS_KEY, participants);
  
  // Add initial system message for groups
  if (isGroup) {
    const allMessages = getStore(MESSAGES_KEY);
    allMessages.push({
        id: 'msg_' + Date.now(),
        chat_id: newChat.id,
        sender_id: 'system',
        content: `Group "${chatName}" created`,
        created_at: new Date().toISOString(),
        status: 'sent',
        reactions: {}
    });
    setStore(MESSAGES_KEY, allMessages);
  }
  
  return newChat;
};

export const toggleChatPin = async (chatId: string, pinned: boolean) => {
  const chats = getStore(CHATS_KEY);
  const idx = chats.findIndex((c: any) => c.id === chatId);
  if (idx !== -1) {
    chats[idx].isPinned = pinned;
    setStore(CHATS_KEY, chats);
  }
};

export const updateChatNotificationSound = async (chatId: string, sound: string) => {
  const chats = getStore(CHATS_KEY);
  const idx = chats.findIndex((c: any) => c.id === chatId);
  if (idx !== -1) {
    chats[idx].notificationSound = sound;
    setStore(CHATS_KEY, chats);
  }
};

export const updateUserStatus = async (userId: string, status: string, message: string) => {
  const users = getStore(USERS_KEY);
  const idx = users.findIndex((u: any) => u.id === userId);
  if (idx !== -1) {
    users[idx].status = status;
    users[idx].statusMessage = message;
    setStore(USERS_KEY, users);
    localStorage.setItem(SESSION_KEY, JSON.stringify(users[idx]));
  }
};

export const updateUserProfile = async (userId: string, updates: any) => {
  await delay(500);
  const users = getStore(USERS_KEY);
  const idx = users.findIndex((u: any) => u.id === userId);
  
  if (idx !== -1) {
    const updatedUser = { ...users[idx], ...updates };
    if (updates.preferences && users[idx].preferences) {
        updatedUser.preferences = { ...users[idx].preferences, ...updates.preferences };
    }
    
    users[idx] = updatedUser;
    setStore(USERS_KEY, users);
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  }
  throw new Error("User not found");
};

// --- TYPING INDICATOR REALTIME HELPERS ---
export const sendTypingEvent = (chatId: string, userId: string, isTyping: boolean) => {
  broadcast.postMessage({
    type: 'TYPING',
    chatId,
    userId,
    isTyping
  });
};

export const subscribeToTypingEvents = (chatId: string, callback: (userId: string, isTyping: boolean) => void) => {
  const handler = (event: MessageEvent) => {
    const data = event.data;
    if (data.type === 'TYPING' && data.chatId === chatId) {
      callback(data.userId, data.isTyping);
    }
  };
  broadcast.addEventListener('message', handler);
  return () => broadcast.removeEventListener('message', handler);
};