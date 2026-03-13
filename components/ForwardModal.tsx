import React, { useState, useEffect } from 'react';
import { X, Send, Search } from 'lucide-react';
import { Chat } from '../types';
import { fetchUserChats, getCurrentUser, sendMessageToDb } from '../services/supabaseClient';

interface ForwardModalProps {
  messageText: string;
  onClose: () => void;
  onForwardSuccess: () => void;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({ messageText, onClose, onForwardSuccess }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        const myChats = await fetchUserChats(user.id);
        setChats(myChats);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleForward = async (chatId: string) => {
    if (sendingTo) return;
    setSendingTo(chatId);
    try {
      await sendMessageToDb(chatId, currentUserId, messageText);
      onForwardSuccess();
    } catch (e) {
      console.error(e);
      setSendingTo(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-nexus-card w-full max-w-md rounded-2xl shadow-2xl border dark:border-gray-700 flex flex-col max-h-[80vh]">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-nexus-card rounded-t-2xl">
          <h2 className="font-bold text-lg dark:text-white">Forward Message</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800">
           <div className="text-xs font-bold text-gray-400 mb-1 uppercase">Message Preview</div>
           <div className="bg-white dark:bg-gray-800 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 italic truncate border dark:border-gray-700">
             "{messageText}"
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
           {loading ? (
             <div className="text-center py-8 text-gray-400">Loading chats...</div>
           ) : (
             <div className="space-y-1">
               {chats.map(chat => (
                 <button 
                   key={chat.id}
                   disabled={!!sendingTo}
                   onClick={() => handleForward(chat.id)}
                   className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors group text-left"
                 >
                   <div className="flex items-center gap-3 overflow-hidden">
                     <div className="w-10 h-10 rounded-full bg-nexus-primary/20 text-nexus-primary flex-shrink-0 flex items-center justify-center font-bold">
                       {chat.name ? chat.name[0].toUpperCase() : '?'}
                     </div>
                     <span className="font-medium dark:text-white truncate">{chat.name || 'Unknown Chat'}</span>
                   </div>
                   
                   <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                     sendingTo === chat.id 
                       ? 'bg-nexus-success text-white' 
                       : 'bg-nexus-primary/10 text-nexus-primary group-hover:bg-nexus-primary group-hover:text-white'
                   }`}>
                     {sendingTo === chat.id ? 'Sent!' : 'Send'}
                     {sendingTo !== chat.id && <Send size={12} />}
                   </div>
                 </button>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};