import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, Attachment } from '../types';
import { 
  Send, ArrowLeft, MoreVertical, Paperclip, CheckCheck, 
  Phone, Video, Smile, Share, Search, Clock, CalendarClock, 
  X, Reply, Image as ImageIcon, MapPin, FileText, User, 
  Trash2, Edit2, CornerUpRight, Sparkles
} from 'lucide-react';
import { summarizeChat } from '../services/geminiService';
import { 
  sendTypingEvent, subscribeToTypingEvents, getCurrentUser, 
  toggleReaction, editMessage, deleteMessage 
} from '../services/supabaseClient';
import { ChatInfoSidebar } from './ChatInfoSidebar';
import { ForwardModal } from './ForwardModal';

interface ChatInterfaceProps {
  chat: Chat;
  onBack: () => void;
  onSendMessage: (text: string, scheduledDate?: Date, replyTo?: any, media?: Attachment) => void;
  onCallStart: (isVideo: boolean) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chat, onBack, onSendMessage, onCallStart }) => {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // UI States
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<string | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [activeContextMenuId, setActiveContextMenuId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  
  // Action States
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageState, setEditingMessageState] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Attachment | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    getCurrentUser().then(u => u && setCurrentUserId(u.id));
  }, []);

  useEffect(() => {
    scrollToBottom();
    // Reset transient states when chat changes
    setSummary(null);
    setIsSummarizing(false);
    setShowInfoSidebar(false);
    setIsSearching(false);
    setSearchQuery('');
    setTypingUsers(new Set()); 
    setReplyingTo(null);
    setEditingMessageState(null);
    setSelectedMedia(null);
    setShowAttachMenu(false);
    
    const unsubscribe = subscribeToTypingEvents(chat.id, (userId, isTyping) => {
      if (userId === currentUserId) return;

      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
      setTimeout(scrollToBottom, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [chat.id, currentUserId]);

  useEffect(() => {
    if (!isSearching) scrollToBottom();
  }, [chat.messages, isSearching]);

  // Handle Editing State
  useEffect(() => {
    if (editingMessageState) {
      setInputText(editingMessageState.text);
      inputRef.current?.focus();
    } else {
      // Only clear if we were editing
      if (inputText && chat.messages.find(m => m.text === inputText && m.id === editingMessageState?.id)) {
        setInputText('');
      }
    }
  }, [editingMessageState]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (currentUserId) {
      sendTypingEvent(chat.id, currentUserId, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingEvent(chat.id, currentUserId, false);
      }, 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSelectedMedia({
          type: file.type.startsWith('image') ? 'image' : 'file',
          url: ev.target?.result as string,
          name: file.name,
          size: file.size
        });
        setShowAttachMenu(false);
        inputRef.current?.focus();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedMedia) return;
    
    if (currentUserId) {
      sendTypingEvent(chat.id, currentUserId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    // IF EDITING
    if (editingMessageState) {
      await editMessage(editingMessageState.id, inputText);
      setEditingMessageState(null);
      setInputText('');
      return;
    }
    
    // IF SENDING NEW
    let scheduledDate: Date | undefined;
    if (scheduledTime) {
      scheduledDate = new Date(scheduledTime);
    }

    const replyContext = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text,
      senderName: replyingTo.senderId === 'me' ? 'You' : chat.name, 
      previewMedia: replyingTo.media?.type === 'image' ? replyingTo.media.url : undefined
    } : undefined;

    onSendMessage(inputText, scheduledDate, replyContext, selectedMedia || undefined);
    
    setInputText('');
    setScheduledTime('');
    setShowScheduleInput(false);
    setReplyingTo(null);
    setSelectedMedia(null);
  };

  const handleDelete = async (msgId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      await deleteMessage(msgId);
      setActiveContextMenuId(null);
    }
  };

  const onReactionClick = async (msgId: string, emoji: string) => {
    await toggleReaction(chat.id, msgId, currentUserId, emoji);
    setActiveReactionMessageId(null);
  };

  const handleSummarize = async () => {
    if (chat.messages.length === 0) return;
    setIsSummarizing(true);
    const text = await summarizeChat(chat.messages);
    setSummary(text);
    setIsSummarizing(false);
  };

  const isSomeoneTyping = typingUsers.size > 0;

  const filteredMessages = chat.messages.filter(m => {
    if (!searchQuery) return true;
    const dateStr = new Date(m.timestamp).toLocaleDateString();
    return m.text.toLowerCase().includes(searchQuery.toLowerCase()) || dateStr.includes(searchQuery);
  });

  return (
    <div className="flex flex-row h-full w-full overflow-hidden relative bg-[#87aadd] dark:bg-[#0f0f0f]">
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* TELEGRAM WALLPAPER PATTERN (CSS) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#1c1c1d] border-b border-gray-200 dark:border-black shadow-sm sticky top-0 z-20">
          {isSearching ? (
             <div className="flex-1 flex items-center gap-2 animate-fade-in-down">
               <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full text-gray-500">
                 <ArrowLeft size={20} />
               </button>
               <div className="flex-1 relative">
                 <input 
                   autoFocus
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search messages..."
                   className="w-full bg-gray-100 dark:bg-[#2c2c2e] rounded-full py-2 pl-4 pr-10 text-[15px] outline-none dark:text-white placeholder-gray-500"
                 />
                 {searchQuery && (
                   <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-gray-400">
                     <X size={16} />
                   </button>
                 )}
               </div>
             </div>
          ) : (
            <>
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowInfoSidebar(!showInfoSidebar)}>
                <button onClick={onBack} className="md:hidden text-gray-500 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] p-2 rounded-full -ml-2">
                  <ArrowLeft size={22} />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${chat.isGroup ? 'bg-gradient-to-br from-orange-400 to-pink-500' : 'bg-gradient-to-br from-blue-400 to-cyan-500'}`}>
                    {chat.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-black dark:text-white leading-tight">{chat.name}</h3>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">
                      {isSomeoneTyping ? <span className="text-[#3390ec]">typing...</span> : (chat.isGroup ? `${chat.participants?.length || 0} members` : 'last seen recently')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <button onClick={handleSummarize} disabled={isSummarizing} className="p-2.5 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors text-[#3390ec]" title="Summarize Chat">
                  {isSummarizing ? <div className="w-5 h-5 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" /> : <Sparkles size={22} />}
                </button>
                <button onClick={() => setIsSearching(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors">
                  <Search size={22} />
                </button>
                <button onClick={() => onCallStart(false)} className="hidden sm:block p-2.5 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors">
                    <Phone size={22} />
                </button>
                <button onClick={() => onCallStart(true)} className="hidden sm:block p-2.5 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors">
                    <Video size={22} />
                </button>
                <button 
                  onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                  className={`p-2.5 rounded-full transition-colors ${showInfoSidebar ? 'bg-gray-100 dark:bg-[#2c2c2e]' : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2e]'}`}
                >
                  <MoreVertical size={22} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* SUMMARY BANNER */}
        {summary && (
          <div className="bg-blue-50 dark:bg-[#2b5278]/20 border-b border-blue-100 dark:border-[#2b5278]/50 p-3 flex items-start gap-3 relative z-10">
            <Sparkles className="text-[#3390ec] shrink-0 mt-0.5" size={18} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#3390ec] mb-1">AI Summary</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
            </div>
            <button onClick={() => setSummary(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X size={16} />
            </button>
          </div>
        )}

        {/* MESSAGES AREA */}
        <div 
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-1 no-scrollbar z-0"
          onClick={() => {
            setActiveReactionMessageId(null);
            setActiveContextMenuId(null);
            setShowAttachMenu(false);
          }}
        >
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === 'me';
            const showAvatar = !isMe && (idx === 0 || chat.messages[idx - 1].senderId !== msg.senderId);
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative mb-1.5`}>
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} max-w-full`}>
                  
                  {/* Avatar for Group */}
                  {!isMe && chat.isGroup && (
                    <div className={`w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white mr-2 self-end mb-1 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                      {chat.name[0]}
                    </div>
                  )}
                  
                  <div className="relative group/bubble max-w-[85vw] md:max-w-[480px]">
                    {/* Message Bubble */}
                    <div 
                      onDoubleClick={() => setReplyingTo(msg)}
                      onContextMenu={(e) => { e.preventDefault(); setActiveContextMenuId(msg.id); }}
                      className={`relative shadow-sm px-3 py-1.5 min-w-[80px]
                      ${isMe 
                        ? 'bg-[#eeffde] dark:bg-[#2b5278] text-black dark:text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white dark:bg-[#182533] text-black dark:text-white rounded-2xl rounded-tl-sm'
                      }`}
                    >
                        {/* Reply Context */}
                        {msg.replyTo && (
                           <div className="mb-1 pl-2 border-l-2 border-[#3390ec] rounded-sm cursor-pointer" onClick={() => { /* scroll to msg */ }}>
                             <div className="text-[#3390ec] text-xs font-bold truncate">{msg.replyTo.senderName}</div>
                             <div className="text-gray-500 dark:text-gray-300 text-xs truncate">{msg.replyTo.text || 'Photo'}</div>
                           </div>
                        )}

                        {/* Image */}
                        {msg.media && msg.media.type === 'image' && (
                          <div className="pb-1">
                            <img src={msg.media.url} alt="Shared" className="rounded-lg w-full h-auto max-h-[300px] object-cover" />
                          </div>
                        )}

                        <div className="text-[15px] leading-snug whitespace-pre-wrap break-words pb-1">
                          {msg.text}
                          {/* Timestamp inside text flow (float right) */}
                          <span className="float-right ml-2 mt-1 flex items-center gap-1 select-none">
                            <span className={`text-[11px] ${isMe ? 'text-[#53bdeb] dark:text-[#53bdeb]' : 'text-gray-400'}`}>
                               {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {isMe && (
                              <CheckCheck size={14} className={msg.status === 'read' ? 'text-[#53bdeb]' : 'text-[#53bdeb]'} />
                            )}
                          </span>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-2 bg-white dark:bg-[#1c1c1d] border-t border-gray-200 dark:border-black relative z-30">
          
          {/* Reply/Edit Context */}
          {(replyingTo || editingMessageState) && (
             <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-black mb-1">
               <div className="flex items-center gap-3 overflow-hidden">
                 <Reply size={20} className="text-[#3390ec]" />
                 <div className="flex-1 min-w-0">
                   <div className="text-[#3390ec] font-bold text-sm truncate">
                     {editingMessageState ? 'Edit Message' : `Reply to ${replyingTo?.senderId === 'me' ? 'You' : chat.name}`}
                   </div>
                   <div className="text-gray-500 text-sm truncate">
                     {editingMessageState ? editingMessageState.text : replyingTo?.text}
                   </div>
                 </div>
               </div>
               <button onClick={() => { setReplyingTo(null); setEditingMessageState(null); setInputText(''); }} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full">
                 <X size={20} className="text-gray-500" />
               </button>
             </div>
          )}

          <div className="flex items-end gap-2 max-w-4xl mx-auto px-2">
            <button 
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-3 text-gray-500 hover:text-[#3390ec] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors"
            >
              <Paperclip size={24} />
            </button>
            
            <div className="flex-1 bg-transparent flex items-center py-2">
               <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message"
                className="w-full bg-transparent border-none outline-none text-[16px] text-black dark:text-white placeholder-gray-500"
               />
            </div>
            
            <button className="p-3 text-gray-500 hover:text-[#3390ec] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors">
              <Smile size={24} />
            </button>

            {inputText.trim() ? (
              <button 
                onClick={handleSend}
                className="p-3 text-[#3390ec] hover:bg-blue-50 dark:hover:bg-[#2c2c2e] rounded-full transition-colors animate-fade-in-up"
              >
                <Send size={24} />
              </button>
            ) : (
              <button className="p-3 text-gray-500 hover:text-[#3390ec] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full transition-colors">
                <div className="w-6 h-6 border-2 border-current rounded-full flex items-center justify-center">
                   <div className="w-0.5 h-3 bg-current rounded-full"></div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR (SLIDEOUT) */}
      {showInfoSidebar && (
        <ChatInfoSidebar 
          chat={chat} 
          onClose={() => setShowInfoSidebar(false)} 
          onLeave={() => {
            setShowInfoSidebar(false);
            onBack();
          }}
        />
      )}

      {/* FORWARD MODAL */}
      {forwardingMessage && (
        <ForwardModal 
          messageText={forwardingMessage} 
          onClose={() => setForwardingMessage(null)}
          onForwardSuccess={() => {
             setForwardingMessage(null);
          }}
        />
      )}
    </div>
  );
};