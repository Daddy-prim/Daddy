import React, { useState, useEffect } from 'react';
import { User, Message, Chat, ActionItem, TabType, SortOption, CallSession } from './types';
import { supabase, getCurrentUser, fetchUserChats, fetchMessages, sendMessageToDb, toggleChatPin, updateUserStatus, updateUserProfile } from './services/supabaseClient';
import { ChatInterface } from './components/ChatInterface';
import { ActionCard } from './components/ActionCard';
import { AuthScreen } from './components/AuthScreen';
import { NewChatModal } from './components/NewChatModal';
import { CallOverlay } from './components/CallOverlay';
import { SettingsModal } from './components/SettingsModal';
import { Logo } from './components/Logo';
import { 
  Search, Bell, Moon, Sun, Filter, 
  MessageSquare, Star, Zap, CheckSquare, Plus, LogOut,
  Users, Pin, ChevronDown, Clock, Activity, Circle, Settings, Edit2
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('priority');
  const [sortOption, setSortOption] = useState<SortOption>('time');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  // 1. Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setSession({ user });
          setCurrentUser(user);
          if (user.preferences?.theme === 'dark') {
            setDarkMode(true);
          }
        }
      } catch (e) {
        console.error('Failed to load user', e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = await getCurrentUser();
        setSession({ user });
        setCurrentUser(user);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Load User Data (Chats)
  const loadChats = async () => {
    if (!session?.user) return;
    const myChats = await fetchUserChats(session.user.id);
    if (myChats.length === 0) {
      // Add a mock group chat for demonstration
      setChats([{
        id: 'mock-group',
        name: 'The Stowaway',
        isGroup: true,
        priority: 'normal',
        unreadCount: 0,
        participants: [
          { id: '1', name: 'Dr. Erikson', avatar: '' },
          { id: '2', name: 'Alicia', avatar: '' },
          { id: '3', name: 'Traveler', avatar: '' },
          { id: '4', name: 'Nott the Brave', avatar: '' }
        ],
        messages: [
          {
            id: 'm1',
            senderId: '2',
            text: "Who's up for a quick video call?",
            timestamp: new Date(Date.now() - 60000),
            media: {
              type: 'image',
              url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
              name: 'Mt. Kilimanjaro'
            }
          }
        ]
      }]);
    } else {
      setChats(myChats);
    }
  };

  useEffect(() => {
    if (session) {
      loadChats();
    }
  }, [session]);

  // 3. Load Messages for Selected Chat & Subscribe to Realtime
  useEffect(() => {
    if (!selectedChatId || !session) return;

    const loadMsgs = async () => {
      if (selectedChatId === 'mock-group') return;
      
      const msgs = await fetchMessages(selectedChatId);
      // Transform DB messages to UI format
      const formattedMsgs: Message[] = msgs.map((m: any) => ({
        ...m,
        senderId: m.senderId === session.user.id ? 'me' : m.senderId
      }));

      setChats(prev => prev.map(c => {
        if (c.id === selectedChatId) {
          return { ...c, messages: formattedMsgs };
        }
        return c;
      }));
    };

    loadMsgs();

    // Subscribe to new messages (INSERT) and updates (UPDATE - for reactions)
    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` }, 
        (payload) => {
          
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            if (newMsg.sender_id === session.user.id) return; // Skip own inserts if handled optimistically

            const formattedMsg: Message = {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              text: newMsg.content,
              timestamp: new Date(newMsg.created_at),
              isActionItem: newMsg.is_action_item,
              reactions: newMsg.reactions,
              scheduledFor: newMsg.scheduled_for ? new Date(newMsg.scheduled_for) : undefined,
              status: newMsg.status
            };

            setChats(prev => prev.map(c => {
               if (c.id === selectedChatId) {
                 return { ...c, messages: [...c.messages, formattedMsg] };
               }
               return c;
            }));
          } 
          else if (payload.eventType === 'UPDATE') {
             const updatedMsg = payload.new;
             setChats(prev => prev.map(c => {
               if (c.id === selectedChatId) {
                 return {
                   ...c,
                   messages: c.messages.map(m => m.id === updatedMsg.id ? {
                     ...m,
                     reactions: updatedMsg.reactions
                   } : m)
                 };
               }
               return c;
             }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, session]);

  // Toggle Dark Mode and Persist
  const handleToggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Persist to user preferences
    if (session?.user?.id) {
       await updateUserProfile(session.user.id, {
         preferences: { 
           ...currentUser?.preferences, 
           theme: newMode ? 'dark' : 'light' 
         }
       });
       // Update local user state to reflect change
       setCurrentUser((prev: any) => ({
         ...prev,
         preferences: { ...prev.preferences, theme: newMode ? 'dark' : 'light' }
       }));
    }
  };

  // Apply Dark Mode class to HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSendMessage = async (text: string, scheduledDate?: Date) => {
    if (!selectedChatId || !session) return;

    const tempId = Date.now().toString();
    const newMessage: Message = {
      id: tempId,
      senderId: 'me',
      text,
      timestamp: new Date(),
      scheduledFor: scheduledDate,
      status: scheduledDate ? 'scheduled' : 'sent'
    };

    // Optimistic Update
    setChats(prev => prev.map(c => {
      if (c.id === selectedChatId) {
        return { ...c, messages: [...c.messages, newMessage] };
      }
      return c;
    }));

    // Send to DB
    await sendMessageToDb(selectedChatId, session.user.id, text, scheduledDate);

    if (!scheduledDate) {
      const { detectActionItem } = await import('./services/geminiService');
      const analysis = await detectActionItem(text);
      if (analysis.isAction) {
        setActionItems(prev => [...prev, {
          id: Date.now().toString(),
          title: analysis.title || 'New Action Item',
          dueDate: analysis.dateTime ? new Date(analysis.dateTime) : undefined,
          isCompleted: false,
          chatId: selectedChatId
        }]);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setChats([]);
    setSelectedChatId(null);
    setShowSettingsModal(false);
  };

  const toggleActionComplete = (id: string) => {
    setActionItems(prev => prev.map(item => 
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ));
  };

  const handlePinChat = async (e: React.MouseEvent, chatId: string, currentPinned: boolean) => {
    e.stopPropagation();
    // Optimistic Update
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, isPinned: !currentPinned } : c));
    await toggleChatPin(chatId, !currentPinned);
  };

  const handleStatusChange = async (status: string) => {
    if (!session?.user) return;
    const msg = status === 'busy' ? 'In a meeting' : '';
    await updateUserStatus(session.user.id, status, msg);
    setCurrentUser((prev: any) => ({ ...prev, status: status, statusMessage: msg }));
    setShowStatusMenu(false);
  };

  const getFilteredAndSortedChats = () => {
    if (!chats) return [];
    
    // 1. Filter Tab
    let filtered = chats;
    if (activeTab === 'priority') {
      filtered = chats.filter(c => c.priority === 'high' || (c.unreadCount && c.unreadCount > 0));
    } else if (activeTab === 'groups') {
      filtered = chats.filter(c => c.isGroup);
    }

    // 2. Sort Logic
    return filtered.sort((a, b) => {
      // Pinned always on top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Sort Option
      if (sortOption === 'time') {
         const timeA = a.messages.length > 0 ? new Date(a.messages[a.messages.length-1].timestamp).getTime() : 0;
         const timeB = b.messages.length > 0 ? new Date(b.messages[b.messages.length-1].timestamp).getTime() : 0;
         return timeB - timeA;
      } else if (sortOption === 'unread') {
         return (b.unreadCount || 0) - (a.unreadCount || 0);
      } else if (sortOption === 'alpha') {
         return a.name.localeCompare(b.name);
      }
      return 0;
    });
  };

  const activeChat = chats.find(c => c.id === selectedChatId);

  // --- RENDERING ---

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-nexus-slate dark:bg-nexus-dark"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexus-mint"></div></div>;

  if (!session) {
    return <AuthScreen onAuthSuccess={async () => {
      const user = await getCurrentUser();
      if (user) {
        setSession({ user });
        setCurrentUser(user);
        loadChats();
      }
    }} />;
  }

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden bg-nexus-slate dark:bg-nexus-dark ${darkMode ? 'dark' : ''}`}>
      {/* GLOBAL MODALS */}
      {showNewChatModal && (
        <NewChatModal 
          currentUserId={session.user.id} 
          onClose={() => setShowNewChatModal(false)} 
          onChatCreated={() => {
            loadChats();
            setActiveTab('priority'); // Reset tab to see new chat usually
          }} 
        />
      )}

      {showSettingsModal && (
        <SettingsModal 
          user={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={async () => {
             const user = await getCurrentUser();
             setCurrentUser(user);
          }}
          isDarkMode={darkMode}
          toggleDarkMode={handleToggleDarkMode}
          onLogout={handleLogout}
        />
      )}

      {activeCall && (
        <CallOverlay 
          partnerName={activeCall.partnerName}
          isVideo={activeCall.isVideo}
          onEndCall={() => setActiveCall(null)}
        />
      )}
      
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* === SIDEBAR / MOBILE LIST VIEW === */}
        <div className={`
          flex flex-col h-full bg-white dark:bg-[#1c1c1d] border-r border-gray-200 dark:border-black transition-all duration-300
          w-full md:w-[420px] 
          ${selectedChatId ? 'hidden md:flex' : 'flex'}
        `}>
          
          {/* TELEGRAM-STYLE HEADER */}
          <div className="px-4 py-3 flex gap-3 items-center bg-white dark:bg-[#1c1c1d]">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#2c2c2e] rounded-full transition-colors"
            >
              <div className="flex flex-col gap-1.5 w-5">
                <span className="h-0.5 w-full bg-current rounded-full"></span>
                <span className="h-0.5 w-full bg-current rounded-full"></span>
                <span className="h-0.5 w-full bg-current rounded-full"></span>
              </div>
            </button>
            
            <div className="flex-1 bg-[#f1f1f1] dark:bg-[#2c2c2e] rounded-full flex items-center px-4 py-2 transition-all focus-within:bg-white dark:focus-within:bg-[#2c2c2e] focus-within:ring-2 focus-within:ring-[#3390ec] border border-transparent dark:border-transparent">
              <Search size={18} className="text-gray-400 mr-3" />
              <input 
                type="text" 
                placeholder="Search" 
                className="bg-transparent border-none outline-none text-[15px] w-full dark:text-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* TABS */}
          <div className="px-4 flex gap-6 border-b border-gray-100 dark:border-black overflow-x-auto no-scrollbar">
             {['Priority', 'Groups', 'Actions'].map(tab => {
               const tabValue = tab.toLowerCase() as TabType;
               return (
                 <button 
                   key={tab} 
                   onClick={() => setActiveTab(tabValue)}
                   className={`py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tabValue ? 'text-[#3390ec] border-b-2 border-[#3390ec]' : 'text-gray-500 hover:text-[#3390ec]'}`}
                 >
                   {tab}
                 </button>
               );
             })}
          </div>

          {/* CHAT LIST / ACTIONS LIST */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {activeTab === 'actions' ? (
              <div className="p-4">
                {actionItems.length === 0 ? (
                  <div className="text-center text-gray-500 mt-10">No action items detected yet.</div>
                ) : (
                  actionItems.map(item => (
                    <ActionCard 
                      key={item.id} 
                      item={item} 
                      onComplete={toggleActionComplete} 
                      onGoToChat={(chatId) => {
                        setSelectedChatId(chatId);
                        setActiveTab('priority');
                      }} 
                    />
                  ))
                )}
              </div>
            ) : (
              getFilteredAndSortedChats().map(chat => {
               const lastMsg = chat.messages[chat.messages.length - 1];
               const isSelected = selectedChatId === chat.id;
               
               return (
                 <div
                   key={chat.id}
                   onClick={() => setSelectedChatId(chat.id)}
                   className={`group flex items-center gap-3 p-2 mx-2 rounded-xl cursor-pointer transition-colors ${
                     isSelected 
                       ? 'bg-[#3390ec] text-white' 
                       : 'hover:bg-[#f4f4f5] dark:hover:bg-[#2c2c2e] bg-transparent'
                   }`}
                 >
                   {/* Avatar */}
                   <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-white relative ${
                     chat.isGroup ? 'bg-gradient-to-br from-orange-400 to-pink-500' : 'bg-gradient-to-br from-blue-400 to-cyan-500'
                   }`}>
                     {chat.name[0]}
                     {chat.isGroup && (
                        <div className="absolute bottom-0 right-0 bg-white dark:bg-[#1c1c1d] rounded-full p-[2px]">
                          <div className="bg-green-500 w-3 h-3 rounded-full border-2 border-white dark:border-[#1c1c1d]"></div>
                        </div>
                     )}
                   </div>

                   {/* Content */}
                   <div className="flex-1 min-w-0 py-1">
                     <div className="flex justify-between items-baseline mb-0.5">
                       <h3 className={`font-semibold text-[15px] truncate ${isSelected ? 'text-white' : 'text-black dark:text-white'}`}>
                         {chat.name}
                       </h3>
                       <div className="flex items-center gap-1">
                         {lastMsg?.status === 'read' && lastMsg.senderId === 'me' && (
                           <CheckSquare size={12} className={isSelected ? 'text-white/70' : 'text-[#3390ec]'} />
                         )}
                         <span className={`text-[12px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                           {lastMsg?.timestamp ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center">
                       <p className={`text-[14px] truncate leading-snug pr-2 ${isSelected ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                         {lastMsg?.senderId === 'me' && <span className={`${isSelected ? 'text-white/90' : 'text-[#3390ec]'}`}>You: </span>}
                         {lastMsg?.text || <span className="italic opacity-60">No messages yet</span>}
                       </p>
                       
                       {/* Unread Badge */}
                       {chat.unreadCount && chat.unreadCount > 0 ? (
                         <div className={`min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                           isSelected ? 'bg-white text-[#3390ec]' : 'bg-[#3390ec] text-white'
                         }`}>
                           {chat.unreadCount}
                         </div>
                       ) : (
                         chat.isPinned && <Pin size={14} className={`rotate-45 ${isSelected ? 'text-white/70' : 'text-gray-400'}`} fill="currentColor" />
                       )}
                     </div>
                   </div>
                 </div>
               );
            })
           )}
          </div>

          {/* Floating Action Button (Telegram Style) */}
          <button 
            onClick={() => setShowNewChatModal(true)}
            className="absolute bottom-6 right-6 w-14 h-14 bg-[#3390ec] hover:bg-[#2b7ac9] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 md:hidden"
          >
            <Edit2 size={24} />
          </button>
        </div>

        {/* === CHAT AREA === */}
        <div className={`
          flex-1 bg-white/50 dark:bg-black/20 relative
          ${!selectedChatId ? 'hidden md:flex items-center justify-center' : 'flex w-full absolute inset-0 md:static z-20'}
        `}>
          {activeChat ? (
            <ChatInterface 
              chat={activeChat} 
              onBack={() => setSelectedChatId(null)}
              onSendMessage={handleSendMessage}
              onCallStart={(isVideo) => setActiveCall({
                isActive: true,
                isIncoming: false,
                isVideo,
                partnerName: activeChat.name,
                status: 'ringing',
                isGroup: activeChat.isGroup,
                participants: activeChat.participants
              })}
            />
          ) : (
            <div className="text-center opacity-40 max-w-sm px-6">
              <div className="w-32 h-32 mx-auto mb-8 flex items-center justify-center rotate-3 transform transition-transform hover:rotate-6">
                 <Logo className="w-full h-full shadow-2xl" />
              </div>
              <h2 className="text-3xl font-bold text-nexus-midnight dark:text-white mb-3">Daddy Web</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed">
                Select a conversation from the sidebar to start messaging. 
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}