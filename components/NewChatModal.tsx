import React, { useState } from 'react';
import { Search, UserPlus, X, Send, Mail, MessageSquare, Users, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { searchUsers, createNewChat, createGhostUser, sendInvite } from '../services/supabaseClient';

interface NewChatModalProps {
  currentUserId: string;
  onClose: () => void;
  onChatCreated: () => void;
}

type ModalStep = 'search' | 'group_participants' | 'group_details';

export const NewChatModal: React.FC<NewChatModalProps> = ({ currentUserId, onClose, onChatCreated }) => {
  const [step, setStep] = useState<ModalStep>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  
  // Group Creation State
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');

  const handleSearch = async (val: string) => {
    setQuery(val);
    setInviteSent(false); // Reset if typing
    if (val.length > 2) {
      setLoading(true);
      const users = await searchUsers(val);
      // Filter out self
      setResults(users.filter((u: any) => u.id !== currentUserId));
      setLoading(false);
    } else {
      setResults([]);
    }
  };

  const startOneOnOneChat = async (userId: string, userName: string) => {
    try {
      setLoading(true);
      // Pass isGroup = false
      await createNewChat(currentUserId, [userId], userName, false);
      onChatCreated();
      onClose();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      setLoading(true);
      const participantIds = selectedUsers.map(u => u.id);
      await createNewChat(currentUserId, participantIds, groupName, true);
      onChatCreated();
      onClose();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleInvite = async (type: 'sms' | 'email') => {
    setLoading(true);
    await sendInvite(type, query);
    
    // Create ghost user immediately so they can start chatting
    const newUser = await createGhostUser(query);
    await createNewChat(currentUserId, [newUser.id], newUser.full_name, false);
    
    setLoading(false);
    setInviteSent(true);
    
    setTimeout(() => {
        onChatCreated();
        onClose();
    }, 2000);
  };

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
      setQuery(''); // Clear search after selection to find more
      setResults([]);
    }
  };

  const isEmail = query.includes('@');
  const isPhone = /^\+?[\d\s-]{4,}$/.test(query);
  const isQueryValidContact = query.length > 3 && (isEmail || isPhone);

  const getHeaderTitle = () => {
    switch(step) {
      case 'search': return 'New Chat';
      case 'group_participants': return 'Add Participants';
      case 'group_details': return 'New Group';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-nexus-card w-full max-w-md rounded-2xl shadow-2xl border dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-nexus-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {step !== 'search' && (
              <button 
                onClick={() => setStep(step === 'group_details' ? 'group_participants' : 'search')}
                className="p-1 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft size={20} className="dark:text-white" />
              </button>
            )}
            <h2 className="font-bold text-lg dark:text-white">{getHeaderTitle()}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>
        
        {/* Step 3: Group Details (Name) */}
        {step === 'group_details' ? (
          <div className="p-6 flex flex-col items-center">
             <div className="w-24 h-24 bg-nexus-midnight rounded-full flex items-center justify-center text-white mb-6">
                <Users size={40} />
             </div>
             
             <div className="w-full space-y-2 mb-8">
               <label className="text-xs font-bold uppercase text-gray-400">Group Name</label>
               <input 
                 autoFocus
                 type="text"
                 placeholder="e.g. Weekend Trip"
                 value={groupName}
                 onChange={(e) => setGroupName(e.target.value)}
                 className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-lg font-medium outline-none border-2 border-transparent focus:border-nexus-mint dark:text-white"
               />
             </div>

             <div className="w-full space-y-2 mb-6">
                <label className="text-xs font-bold uppercase text-gray-400">Participants: {selectedUsers.length}</label>
                <div className="flex flex-wrap gap-2">
                   {selectedUsers.map(u => (
                     <div key={u.id} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg dark:text-gray-300">
                       {u.full_name}
                     </div>
                   ))}
                </div>
             </div>

             <button 
               onClick={createGroup}
               disabled={!groupName.trim() || loading}
               className="w-full py-4 bg-nexus-midnight dark:bg-nexus-mint text-white dark:text-nexus-midnight font-bold rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? 'Creating...' : 'Create Group'}
             </button>
          </div>
        ) : (
          /* Step 1 & 2: Search / Add Participants */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-4">
              {/* Selected Users Chips (Only in Group Flow) */}
              {step === 'group_participants' && selectedUsers.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="flex items-center gap-2 bg-nexus-midnight text-white pl-3 pr-2 py-1.5 rounded-full text-sm flex-shrink-0 animate-fade-in-up">
                      <span>{user.full_name}</span>
                      <button 
                        onClick={() => toggleUserSelection(user)}
                        className="p-0.5 hover:bg-white/20 rounded-full"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={step === 'group_participants' ? "Add people..." : "Name or Email..."}
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-nexus-slate dark:bg-gray-800 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-nexus-mint dark:text-white transition-all"
                />
              </div>

              {/* 'New Group' Button - Only visible on initial search step */}
              {step === 'search' && !query && (
                <button 
                  onClick={() => {
                    setStep('group_participants');
                    setQuery('');
                    setResults([]);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors text-left group"
                >
                   <div className="w-10 h-10 rounded-full bg-nexus-mint/10 text-nexus-mint flex items-center justify-center group-hover:bg-nexus-mint group-hover:text-white transition-colors">
                      <Users size={20} />
                   </div>
                   <span className="font-bold dark:text-white">Create New Group</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 min-h-[200px]">
              {loading ? (
                <div className="flex justify-center py-8 text-gray-400">Processing...</div>
              ) : inviteSent ? (
                <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center text-nexus-mint mb-3">
                        <Send size={32} />
                    </div>
                    <h3 className="font-bold text-lg dark:text-white">Invite Sent!</h3>
                    <p className="text-gray-500 text-sm mt-1">Chat created. They will see it when they join.</p>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-2 pb-4">
                  {results.map(user => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    return (
                      <button 
                        key={user.id}
                        onClick={() => {
                          if (step === 'group_participants') {
                            toggleUserSelection(user);
                          } else {
                            startOneOnOneChat(user.id, user.full_name);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-nexus-mint/10 border border-nexus-mint' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-nexus-midnight/10 text-nexus-midnight dark:bg-gray-700 dark:text-white flex items-center justify-center font-bold relative">
                          {user.full_name[0]}
                          {isSelected && (
                             <div className="absolute -bottom-1 -right-1 bg-white dark:bg-nexus-card rounded-full">
                                <CheckCircle size={16} className="text-nexus-mint fill-current" />
                             </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold ${isSelected ? 'text-nexus-midnight dark:text-nexus-mint' : 'dark:text-white'}`}>{user.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {user.phone ? `${user.phone}` : user.email}
                          </div>
                        </div>
                        {step === 'search' && <UserPlus size={16} className="text-gray-400" />}
                      </button>
                    );
                  })}
                </div>
              ) : query.length > 2 ? (
                <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
                    <p className="text-gray-400">User not found on Daddy.</p>
                    
                    {isQueryValidContact && step === 'search' && (
                      <div className="w-full space-y-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-dashed dark:border-gray-700">
                        <p className="text-sm font-bold dark:text-white mb-2">Invite them to connect:</p>
                        
                        {isPhone && (
                          <button 
                            onClick={() => handleInvite('sms')}
                            className="w-full bg-nexus-mint text-nexus-midnight p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                          >
                            <MessageSquare size={18} />
                            Invite via SMS
                          </button>
                        )}
                        
                        {isEmail && (
                          <button 
                            onClick={() => handleInvite('email')}
                            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border dark:border-gray-600 p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                          >
                            <Mail size={18} />
                            Invite via Email
                          </button>
                        )}
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {step === 'group_participants' ? 'Search to add friends to group.' : 'Enter a number or email to find friends.'}
                </div>
              )}
            </div>

            {/* Bottom Bar for Group Flow */}
            {step === 'group_participants' && selectedUsers.length > 0 && (
               <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-nexus-card">
                  <button 
                    onClick={() => setStep('group_details')}
                    className="w-full py-3 bg-nexus-midnight dark:bg-nexus-mint text-white dark:text-nexus-midnight font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <span>Next ({selectedUsers.length})</span>
                    <ArrowRight size={18} />
                  </button>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};