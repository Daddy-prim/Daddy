import React, { useState } from 'react';
import { Chat } from '../types';
import { updateChatNotificationSound } from '../services/supabaseClient';
import { X, Bell, BellOff, LogOut, Trash2, Shield, Calendar, Users, Music, Image as ImageIcon, FileText, Link, Mic, ChevronRight, Phone, Video, MoreVertical, Plus, CheckSquare, Square } from 'lucide-react';

interface ChatInfoSidebarProps {
  chat: Chat;
  onClose: () => void;
  onLeave: () => void;
}

const NOTIFICATION_SOUNDS = [
  { id: 'default', name: 'Default (Chime)' },
  { id: 'pop', name: 'Pop' },
  { id: 'tweet', name: 'Bird Tweet' },
  { id: 'subtle', name: 'Subtle Pulse' },
];

export const ChatInfoSidebar: React.FC<ChatInfoSidebarProps> = ({ chat, onClose, onLeave }) => {
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('media');
  const [selectedSound, setSelectedSound] = useState(chat.notificationSound || 'default');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const handleSoundChange = (soundId: string) => {
    setSelectedSound(soundId);
    updateChatNotificationSound(chat.id, soundId);
  };

  const displayParticipants = chat.participants.length > 0 ? chat.participants : [
    { id: '1', name: 'Sarah Jen', avatar: '' },
    { id: '2', name: 'Mike Ross', avatar: '' },
    { id: '3', name: 'You', avatar: '' }
  ];

  const mockContacts = [
    { id: 'c1', name: 'Traveler', avatar: '' },
    { id: 'c2', name: 'Critical Troll', avatar: '' },
    { id: 'c3', name: 'Nott the Brave', avatar: '' },
  ];

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-[400px] bg-white dark:bg-[#1c1c1d] border-l border-gray-200 dark:border-black shadow-2xl z-30 transform transition-transform duration-300 flex flex-col">
      
      {/* HEADER */}
      <div className="px-4 py-3 flex items-center justify-between bg-white dark:bg-[#1c1c1d] z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full text-gray-500">
            <X size={20} />
          </button>
          <h2 className="font-semibold text-lg text-black dark:text-white">User Info</h2>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e] rounded-full text-gray-500">
          <MoreVertical size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        
        {/* PROFILE HEADER */}
        <div className="px-6 pt-4 pb-6 flex flex-col items-center border-b border-gray-100 dark:border-black bg-white dark:bg-[#1c1c1d]">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold shadow-sm mb-4 text-white relative
            ${chat.isGroup ? 'bg-gradient-to-br from-orange-400 to-pink-500' : 'bg-gradient-to-br from-blue-400 to-cyan-500'}`}>
            {chat.name ? chat.name[0].toUpperCase() : '?'}
            <div className="absolute bottom-1 right-1 bg-green-500 w-5 h-5 rounded-full border-4 border-white dark:border-[#1c1c1d]"></div>
          </div>
          
          <h3 className="text-xl font-bold text-black dark:text-white text-center mb-1">{chat.name || 'Unknown Chat'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
             {chat.isGroup ? `${displayParticipants.length} members` : 'last seen recently'}
          </p>

          <div className="flex items-center gap-6 w-full justify-center px-4">
             <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2c2c2e] flex items-center justify-center text-[#3390ec] group-hover:bg-[#3390ec] group-hover:text-white transition-colors">
                   <Phone size={20} />
                </button>
                <span className="text-xs text-[#3390ec] group-hover:text-[#3390ec]/80">Call</span>
             </div>
             <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#2c2c2e] flex items-center justify-center text-[#3390ec] group-hover:bg-[#3390ec] group-hover:text-white transition-colors">
                   <Video size={20} />
                </button>
                <span className="text-xs text-[#3390ec] group-hover:text-[#3390ec]/80">Video</span>
             </div>
             <div className="flex flex-col items-center gap-1 cursor-pointer group">
                <button 
                  onClick={() => setMuted(!muted)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${muted ? 'bg-[#3390ec] text-white' : 'bg-gray-100 dark:bg-[#2c2c2e] text-[#3390ec] hover:bg-[#3390ec] hover:text-white'}`}
                >
                   {muted ? <BellOff size={20} /> : <Bell size={20} />}
                </button>
                <span className="text-xs text-[#3390ec] group-hover:text-[#3390ec]/80">{muted ? 'Unmute' : 'Mute'}</span>
             </div>
          </div>
        </div>

        {/* INFO SECTION */}
        <div className="h-2 bg-[#f1f1f1] dark:bg-black"></div>
        
        <div className="bg-white dark:bg-[#1c1c1d] px-4 py-2">
           <div className="py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] px-2 -mx-2 rounded-lg cursor-pointer transition-colors">
              <p className="text-black dark:text-white text-[15px] mb-0.5">+1 (234) 567-8901</p>
              <p className="text-gray-500 text-xs">Mobile</p>
           </div>
           <div className="py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] px-2 -mx-2 rounded-lg cursor-pointer transition-colors">
              <p className="text-[#3390ec] text-[15px] mb-0.5">@{(chat.name || 'unknown').toLowerCase().replace(/\s+/g, '')}</p>
              <p className="text-[#3390ec] text-[15px] mb-0.5">@lady</p>
              <p className="text-gray-500 text-xs mt-1">Username</p>
           </div>
           <div className="py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] px-2 -mx-2 rounded-lg cursor-pointer transition-colors">
              <p className="text-black dark:text-white text-[15px] mb-0.5">Bio description goes here. Keep it short and simple.</p>
              <p className="text-gray-500 text-xs">Bio</p>
           </div>
        </div>

        {/* GROUP CREATION TOOLS */}
        {!chat.isGroup && (
          <>
            <div className="h-2 bg-[#f1f1f1] dark:bg-black"></div>
            <div className="bg-white dark:bg-[#1c1c1d] p-4">
              {!isCreatingGroup ? (
                <button 
                  onClick={() => setIsCreatingGroup(true)}
                  className="w-full py-3 bg-[#3390ec]/10 text-[#3390ec] hover:bg-[#3390ec]/20 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Create Group with {chat.name || 'Unknown'}
                </button>
              ) : (
                <div className="animate-fade-in-up">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-black dark:text-white">Add Members</h4>
                    <button onClick={() => setIsCreatingGroup(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                  <div className="space-y-2 mb-4">
                    {mockContacts.map(contact => (
                      <div 
                        key={contact.id} 
                        onClick={() => toggleContact(contact.id)}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {contact.name ? contact.name[0].toUpperCase() : '?'}
                          </div>
                          <span className="text-black dark:text-white font-medium">{contact.name || 'Unknown'}</span>
                        </div>
                        <div className="text-[#3390ec]">
                          {selectedContacts.includes(contact.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-gray-300 dark:text-gray-600" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    disabled={selectedContacts.length === 0}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                      selectedContacts.length > 0 
                        ? 'bg-[#3390ec] text-white hover:bg-[#2b7ac9]' 
                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Create "The Stowaway 2"
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* MEDIA TABS */}
        <div className="h-2 bg-[#f1f1f1] dark:bg-black"></div>
        
        <div className="bg-white dark:bg-[#1c1c1d]">
           <div className="flex border-b border-gray-100 dark:border-black">
              {['Media', 'Files', 'Links', 'Voice'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.toLowerCase() ? 'border-[#3390ec] text-[#3390ec]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  {tab}
                </button>
              ))}
           </div>
           
           <div className="h-64 overflow-y-auto p-1">
              {activeTab === 'media' && (
                 <div className="grid grid-cols-3 gap-1">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 cursor-pointer hover:opacity-90">
                         <img src={`https://picsum.photos/seed/${i}/200`} className="w-full h-full object-cover" alt="media" />
                      </div>
                    ))}
                 </div>
              )}
              {activeTab === 'files' && (
                 <div className="p-4 text-center text-gray-500 text-sm">No files shared yet.</div>
              )}
              {activeTab === 'links' && (
                 <div className="p-4 text-center text-gray-500 text-sm">No links shared yet.</div>
              )}
              {activeTab === 'voice' && (
                 <div className="p-4 text-center text-gray-500 text-sm">No voice messages.</div>
              )}
           </div>
        </div>

        {/* SETTINGS LIST */}
        <div className="h-2 bg-[#f1f1f1] dark:bg-black"></div>

        <div className="bg-white dark:bg-[#1c1c1d] py-2">
           <button className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors">
              <div className="flex items-center gap-4 text-black dark:text-white">
                 <Bell size={20} className="text-gray-500" />
                 <span className="text-[15px]">Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-gray-500 text-sm">On</span>
                 <ChevronRight size={16} className="text-gray-400" />
              </div>
           </button>
           <button className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors">
              <div className="flex items-center gap-4 text-black dark:text-white">
                 <ImageIcon size={20} className="text-gray-500" />
                 <span className="text-[15px]">Shared Media</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-gray-500 text-sm">124</span>
                 <ChevronRight size={16} className="text-gray-400" />
              </div>
           </button>
           <button className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors">
              <div className="flex items-center gap-4 text-black dark:text-white">
                 <Shield size={20} className="text-gray-500" />
                 <span className="text-[15px]">Encryption</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
           </button>
        </div>

        <div className="h-2 bg-[#f1f1f1] dark:bg-black"></div>

        <div className="bg-white dark:bg-[#1c1c1d] py-2">
           <button 
             onClick={onLeave}
             className="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-[15px]"
           >
             <LogOut size={20} />
             <span>Block User</span>
           </button>
           <button className="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-[15px]">
             <Trash2 size={20} />
             <span>Delete Chat</span>
           </button>
        </div>

      </div>
    </div>
  );
};