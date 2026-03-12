import { createClient } from '@supabase/supabase-js';
import { Message, Attachment, User, Chat } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// --- AUTH FUNCTIONS ---
export const signInWithOtp = async ({ email }: { email: string }) => {
  return await supabase.auth.signInWithOtp({
    email,
  });
};

export const verifyOtp = async ({ email, token, type }: { email: string, token: string, type: string }) => {
  return await supabase.auth.verifyOtp({
    email,
    token,
    type: type as any
  });
};

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

// --- SERVICE FUNCTIONS ---

export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();
    
  return userProfile || session.user;
};

export const fetchUserChats = async (userId: string) => {
  // 1. Get chats the user is part of
  const { data: participants, error: pError } = await supabase
    .from('chat_participants')
    .select('chat_id, is_pinned, notification_sound')
    .eq('user_id', userId);
    
  if (pError || !participants?.length) return [];
  
  const chatIds = participants.map(p => p.chat_id);
  
  // 2. Get chat details
  const { data: chats, error: cError } = await supabase
    .from('chats')
    .select(`
      id, name, is_group, created_at,
      chat_participants (
        user_id,
        is_pinned,
        notification_sound,
        users (id, full_name, avatar, status, status_message)
      )
    `)
    .in('id', chatIds);
    
  if (cError || !chats) return [];
  
  return chats.map(c => {
    const myParticipantInfo = participants.find(p => p.chat_id === c.id);
    const mappedParticipants = c.chat_participants.map((cp: any) => ({
      id: cp.users.id,
      name: cp.users.full_name,
      avatar: cp.users.avatar || '',
      status: cp.users.status,
      statusMessage: cp.users.status_message
    }));
    
    return {
      id: c.id,
      name: c.name,
      isGroup: c.is_group,
      priority: 'normal',
      unreadCount: 0,
      isPinned: myParticipantInfo?.is_pinned || false,
      notificationSound: myParticipantInfo?.notification_sound || 'default',
      participants: mappedParticipants,
      messages: []
    };
  });
};

export const fetchMessages = async (chatId: string) => {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
    
  if (error || !messages) return [];
  
  return messages.map(m => ({
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

export const editMessage = async (messageId: string, newText: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ content: newText, edited_at: new Date().toISOString() })
    .eq('id', messageId);
  return !error;
};

export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_deleted: true, content: '' })
    .eq('id', messageId);
  return !error;
};

export const sendMessageToDb = async (
  chatId: string, 
  senderId: string, 
  text: string, 
  scheduledDate?: Date, 
  replyTo?: any,
  media?: Attachment
) => {
  const newMessage = {
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
    is_deleted: false
  };
  
  const { data, error } = await supabase
    .from('messages')
    .insert([newMessage])
    .select();
    
  return { data, error };
};

export const toggleReaction = async (chatId: string, messageId: string, userId: string, emoji: string) => {
  // Fetch current reactions
  const { data: msg } = await supabase.from('messages').select('reactions').eq('id', messageId).single();
  if (!msg) return;
  
  const reactions = msg.reactions || {};
  const userList = reactions[emoji] || [];
  
  if (userList.includes(userId)) {
    reactions[emoji] = userList.filter((id: string) => id !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...userList, userId];
  }
  
  await supabase.from('messages').update({ reactions }).eq('id', messageId);
};

export const searchUsers = async (query: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(5);
    
  return data || [];
};

export const sendInvite = async (type: 'sms' | 'email', contact: string) => {
  console.log(`Sending ${type} invite to ${contact}`);
  return true;
};

export const createGhostUser = async (identifier: string) => {
  // In a real app, you'd create a placeholder user in the DB
  return null;
};

export const createNewChat = async (currentUserId: string, participantIds: string[], chatName: string, isGroup: boolean) => {
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert([{ name: chatName, is_group: isGroup }])
    .select()
    .single();
    
  if (chatError || !chat) throw chatError;
  
  const participants = [
    { chat_id: chat.id, user_id: currentUserId },
    ...participantIds.map(id => ({ chat_id: chat.id, user_id: id }))
  ];
  
  await supabase.from('chat_participants').insert(participants);
  
  if (isGroup) {
    await supabase.from('messages').insert([{
      chat_id: chat.id,
      sender_id: currentUserId, // Or a system user ID
      content: `Group "${chatName}" created`,
      status: 'sent'
    }]);
  }
  
  return chat;
};

export const toggleChatPin = async (chatId: string, pinned: boolean) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase
    .from('chat_participants')
    .update({ is_pinned: pinned })
    .match({ chat_id: chatId, user_id: session.user.id });
};

export const updateChatNotificationSound = async (chatId: string, sound: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase
    .from('chat_participants')
    .update({ notification_sound: sound })
    .match({ chat_id: chatId, user_id: session.user.id });
};

export const updateUserStatus = async (userId: string, status: string, message: string) => {
  await supabase
    .from('users')
    .update({ status, status_message: message })
    .eq('id', userId);
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// --- TYPING INDICATOR REALTIME HELPERS ---
export const sendTypingEvent = (chatId: string, userId: string, isTyping: boolean) => {
  const channel = supabase.channel(`typing:${chatId}`);
  channel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, isTyping }
  });
};

export const subscribeToTypingEvents = (chatId: string, callback: (userId: string, isTyping: boolean) => void) => {
  const channel = supabase.channel(`typing:${chatId}`)
    .on('broadcast', { event: 'typing' }, (payload) => {
      callback(payload.payload.userId, payload.payload.isTyping);
    })
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
};
