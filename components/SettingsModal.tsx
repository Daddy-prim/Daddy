import React, { useState, useEffect } from 'react';
import { 
  X, User, Bell, Moon, Camera, LogOut, ChevronRight, 
  ArrowLeft, Lock, Database, HelpCircle, FileText, 
  Smartphone, Sun, Check, Image as ImageIcon, Wifi, Volume2, HardDrive
} from 'lucide-react';
import { updateUserProfile } from '../services/supabaseClient';

interface SettingsModalProps {
  user: any;
  onClose: () => void;
  onUpdate: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
}

type SettingsView = 'main' | 'profile' | 'chats' | 'notifications' | 'storage' | 'help' | 'privacy';

const NOTIFICATION_SOUNDS = [
  { id: 'default', name: 'Default (Chime)' },
  { id: 'pop', name: 'Pop' },
  { id: 'tweet', name: 'Bird Tweet' },
  { id: 'subtle', name: 'Subtle Pulse' },
];

const SectionTitle = ({ children }: { children?: React.ReactNode }) => (
  <div className="px-4 py-3 text-sm font-bold text-nexus-mint uppercase tracking-wider bg-gray-50/50 dark:bg-black/20">
    {children}
  </div>
);

const ListItem = ({ 
  icon: Icon, 
  label, 
  subLabel, 
  onClick, 
  colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  rightElement,
  danger = false
}: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0 text-left group`}
  >
    {Icon && (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <div className={`font-medium text-base ${danger ? 'text-nexus-coral' : 'text-nexus-midnight dark:text-white'}`}>
        {label}
      </div>
      {subLabel && <div className="text-sm text-gray-500 truncate">{subLabel}</div>}
    </div>
    {rightElement ? rightElement : <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />}
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, onClose, onUpdate, isDarkMode, toggleDarkMode, onLogout 
}) => {
  const [currentView, setCurrentView] = useState<SettingsView>('main');
  
  // Local State for Form Data
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    statusMessage: user?.statusMessage || '',
    avatar_url: user?.avatar_url || '',
  });

  // Local State for Preferences
  const [preferences, setPreferences] = useState({
      dmSound: user?.preferences?.dmSound || 'default',
      groupSound: user?.preferences?.groupSound || 'default',
      mediaAutoDownload: user?.preferences?.mediaAutoDownload || 'wifi',
      imageQuality: user?.preferences?.imageQuality || 'standard',
      enterIsSend: user?.preferences?.enterIsSend || false,
      readReceipts: user?.preferences?.readReceipts ?? true,
      wallpaper: user?.preferences?.wallpaper || 'default',
  });

  const [saving, setSaving] = useState(false);

  // Generic Save Helper
  const saveChanges = async (newData: any, newPreferences: any) => {
    setSaving(true);
    try {
      await updateUserProfile(user.id, {
          ...newData,
          preferences: newPreferences
      });
      onUpdate(); // Refresh parent state
      setTimeout(() => setSaving(false), 300);
    } catch (e) {
      console.error("Save failed", e);
      setSaving(false);
    }
  };

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const updatedFormData = { ...formData, avatar_url: base64String };
        setFormData(updatedFormData);
        saveChanges(updatedFormData, preferences);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler for text input blur (Auto-Save)
  const handleBlur = () => {
    saveChanges(formData, preferences);
  };

  // Handler for immediate preference toggle
  const updatePreference = (key: string, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    saveChanges(formData, newPrefs);
  };

  // --- REUSABLE COMPONENTS ---

  const renderHeader = (title: string, showBack: boolean = false) => (
    <div className="flex items-center px-4 py-3 md:px-6 md:py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-nexus-card sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1">
        {showBack && (
          <button 
            onClick={() => {
              // Ensure we save any pending text changes when navigating back
              if (currentView === 'profile') saveChanges(formData, preferences);
              setCurrentView('main');
            }} 
            className="p-1.5 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-nexus-midnight dark:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h2 className="text-xl font-bold text-nexus-midnight dark:text-white">{title}</h2>
      </div>
      {!showBack && (
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <X size={20} />
        </button>
      )}
    </div>
  );

  // --- VIEWS ---

  const renderMainView = () => (
    <div className="animate-fade-in-up">
      {/* Profile Card */}
      <div 
        onClick={() => setCurrentView('profile')}
        className="flex items-center gap-4 p-4 md:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
      >
        <div className="w-16 h-16 rounded-full bg-nexus-midnight flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden border-2 border-white dark:border-gray-700">
           {formData.avatar_url ? (
             <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
           ) : (
             formData.full_name ? formData.full_name[0].toUpperCase() : '?'
           )}
        </div>
        <div className="flex-1">
           <h3 className="text-lg font-bold text-nexus-midnight dark:text-white">{formData.full_name}</h3>
           <p className="text-gray-500 text-sm line-clamp-1">{formData.statusMessage || "No status set"}</p>
        </div>
        <div className="p-2 bg-nexus-slate dark:bg-gray-800 rounded-full text-nexus-mint">
           <User size={20} />
        </div>
      </div>

      <div className="py-2">
        <ListItem 
          icon={Lock} 
          label="Privacy" 
          subLabel="Block contacts, disappearing messages" 
          colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
          onClick={() => setCurrentView('privacy')}
        />
        <ListItem 
          icon={User} 
          label="Chats" 
          subLabel="Theme, wallpapers, chat history" 
          colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300"
          onClick={() => setCurrentView('chats')}
        />
        <ListItem 
          icon={Bell} 
          label="Notifications" 
          subLabel="Message, group & call tones" 
          colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300"
          onClick={() => setCurrentView('notifications')}
        />
        <ListItem 
          icon={Database} 
          label="Storage and Data" 
          subLabel="Network usage, auto-download" 
          colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300"
          onClick={() => setCurrentView('storage')}
        />
        <ListItem 
          icon={HelpCircle} 
          label="Help" 
          subLabel="Help center, contact us, privacy policy" 
          colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          onClick={() => setCurrentView('help')}
        />
      </div>

      <div className="mt-4 px-4">
        <button 
          onClick={onLogout}
          className="w-full py-3 flex items-center justify-center gap-2 text-nexus-coral font-bold bg-nexus-coral/10 hover:bg-nexus-coral/20 rounded-xl transition-colors"
        >
          <LogOut size={18} /> Log Out
        </button>
        <div className="text-center mt-4 pb-4">
          <p className="text-xs text-gray-400">Daddy for Web</p>
          <p className="text-xs text-gray-300">Version 2.0.4</p>
        </div>
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="animate-fade-in-up pb-20">
      <div className="flex flex-col items-center py-8 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800">
        <div className="relative group cursor-pointer mb-4">
           <div className="w-32 h-32 rounded-full bg-nexus-midnight flex items-center justify-center text-5xl font-bold text-white shadow-xl overflow-hidden border-4 border-white dark:border-gray-800">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                formData.full_name ? formData.full_name[0].toUpperCase() : '?'
              )}
           </div>
           {/* File Input */}
           <input 
             type="file" 
             accept="image/*"
             onChange={handleFileChange}
             className="absolute inset-0 opacity-0 cursor-pointer z-10" 
             title="Upload Photo" 
           />
           <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
              <Camera className="text-white" size={32} />
           </div>
        </div>
        <p className="text-sm text-gray-500">Tap to change profile photo</p>
      </div>

      <div className="p-4 space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase text-nexus-mint mb-2">Your Name</label>
          <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-2 focus-within:border-nexus-mint transition-colors">
             <User size={20} className="text-gray-400" />
             <input 
               type="text" 
               value={formData.full_name}
               onChange={(e) => setFormData({...formData, full_name: e.target.value})}
               onBlur={handleBlur}
               className="flex-1 bg-transparent border-none outline-none text-nexus-midnight dark:text-white font-medium"
             />
             <div className={`text-nexus-mint transition-opacity ${saving ? 'opacity-100' : 'opacity-0'}`}><Check size={18} /></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">This name will be visible to your Daddy contacts.</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-nexus-mint mb-2">About</label>
          <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-2 focus-within:border-nexus-mint transition-colors">
             <FileText size={20} className="text-gray-400" />
             <input 
               type="text" 
               value={formData.statusMessage}
               onChange={(e) => setFormData({...formData, statusMessage: e.target.value})}
               onBlur={handleBlur}
               maxLength={140}
               className="flex-1 bg-transparent border-none outline-none text-nexus-midnight dark:text-white font-medium"
             />
             <span className={`text-xs ${formData.statusMessage.length > 130 ? 'text-nexus-coral' : 'text-gray-400'}`}>
               {140 - formData.statusMessage.length}
             </span>
          </div>
        </div>

        <div>
           <label className="block text-xs font-bold uppercase text-nexus-mint mb-2">Phone</label>
           <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-2 opacity-75">
             <Smartphone size={20} className="text-gray-400" />
             <div className="text-nexus-midnight dark:text-white font-medium">{formData.phone || 'Not set'}</div>
           </div>
           <p className="text-xs text-gray-400 mt-2">Phone number cannot be changed.</p>
        </div>
      </div>
    </div>
  );

  const renderChatsView = () => (
    <div className="animate-fade-in-up">
       <SectionTitle>Display</SectionTitle>
       <ListItem 
         icon={isDarkMode ? Moon : Sun} 
         label="Theme" 
         subLabel={isDarkMode ? "Dark" : "Light"}
         onClick={toggleDarkMode}
         colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
         rightElement={
            <div className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-nexus-mint' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </div>
         }
       />
       <ListItem 
         icon={ImageIcon} 
         label="Wallpaper" 
         subLabel={preferences.wallpaper === 'default' ? "Default" : "Custom"}
         colorClass="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-300"
         onClick={() => {
             const next = preferences.wallpaper === 'default' ? 'custom' : 'default';
             updatePreference('wallpaper', next);
         }}
       />

       <SectionTitle>Chat Settings</SectionTitle>
       <ListItem 
         icon={Smartphone} 
         label="Enter is Send" 
         subLabel="Enter key will send your message" 
         colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
         onClick={() => updatePreference('enterIsSend', !preferences.enterIsSend)}
         rightElement={
            <div className={`w-12 h-6 rounded-full relative transition-colors ${preferences.enterIsSend ? 'bg-nexus-mint' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.enterIsSend ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </div>
         }
       />
    </div>
  );

  const renderNotificationsView = () => (
    <div className="animate-fade-in-up pb-20">
      <SectionTitle>Messages</SectionTitle>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div>
           <div className="font-medium text-nexus-midnight dark:text-white">Notification Tone</div>
           <div className="text-sm text-gray-500">Select sound for incoming messages</div>
        </div>
        <select 
          value={preferences.dmSound}
          onChange={(e) => updatePreference('dmSound', e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-2 text-sm outline-none dark:text-white"
        >
            {NOTIFICATION_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <SectionTitle>Groups</SectionTitle>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
        <div>
           <div className="font-medium text-nexus-midnight dark:text-white">Notification Tone</div>
           <div className="text-sm text-gray-500">Select sound for group messages</div>
        </div>
        <select 
          value={preferences.groupSound}
          onChange={(e) => updatePreference('groupSound', e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-2 text-sm outline-none dark:text-white"
        >
            {NOTIFICATION_SOUNDS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </div>
  );

  const renderStorageView = () => (
    <div className="animate-fade-in-up pb-20">
      <SectionTitle>Storage</SectionTitle>
      <ListItem 
         icon={HardDrive} 
         label="Manage Storage" 
         subLabel="2.4 GB used" 
         colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
         onClick={() => {}}
         rightElement={<div className="h-1 w-12 bg-blue-200 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-blue-500"></div></div>}
      />

      <SectionTitle>Media Auto-Download</SectionTitle>
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
         <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            {['wifi', 'cellular', 'never'].map((opt) => (
               <button 
                 key={opt}
                 onClick={() => updatePreference('mediaAutoDownload', opt)}
                 className={`flex-1 py-2 text-xs font-bold capitalize rounded-md transition-all ${
                    preferences.mediaAutoDownload === opt 
                    ? 'bg-white dark:bg-gray-700 shadow text-nexus-midnight dark:text-white' 
                    : 'text-gray-500'
                 }`}
               >
                 {opt === 'wifi' ? 'Wi-Fi' : opt}
               </button>
            ))}
         </div>
         <p className="text-xs text-gray-400 mt-2">Voice messages are always automatically downloaded.</p>
      </div>

      <SectionTitle>Media Upload Quality</SectionTitle>
      <div className="px-4 py-3 flex justify-between items-center">
        <div>
           <div className="font-medium text-nexus-midnight dark:text-white">Photo Quality</div>
           <div className="text-sm text-gray-500">Best quality (larger size)</div>
        </div>
        <select 
          value={preferences.imageQuality}
          onChange={(e) => updatePreference('imageQuality', e.target.value)}
          className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-2 text-sm outline-none dark:text-white"
        >
           <option value="standard">Data Saver</option>
           <option value="high">Best Quality</option>
        </select>
      </div>
    </div>
  );

  const renderPrivacyView = () => (
    <div className="animate-fade-in-up pb-20">
      <SectionTitle>Privacy</SectionTitle>
       <ListItem 
         icon={User} 
         label="Last Seen & Online" 
         subLabel="Everyone" 
         colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
         onClick={() => {}}
       />
       <ListItem 
         icon={ImageIcon} 
         label="Profile Photo" 
         subLabel="Everyone" 
         colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
         onClick={() => {}}
       />
       <ListItem 
         icon={FileText} 
         label="About" 
         subLabel="Everyone" 
         colorClass="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
         onClick={() => {}}
       />

       <div className="px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div>
            <div className="font-medium text-nexus-midnight dark:text-white">Read Receipts</div>
            <div className="text-sm text-gray-500 max-w-xs">If turned off, you won't send or receive read receipts.</div>
          </div>
          <button 
             onClick={() => updatePreference('readReceipts', !preferences.readReceipts)}
             className={`w-12 h-6 rounded-full relative transition-colors ${preferences.readReceipts ? 'bg-nexus-mint' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${preferences.readReceipts ? 'translate-x-7' : 'translate-x-1'}`}></div>
          </button>
       </div>
    </div>
  );

  const renderHelpView = () => (
     <div className="animate-fade-in-up">
        <ListItem icon={HelpCircle} label="Help Center" onClick={() => {}} colorClass="bg-blue-100 text-blue-600" />
        <ListItem icon={FileText} label="Terms and Privacy Policy" onClick={() => {}} colorClass="bg-gray-100 text-gray-600" />
        <ListItem icon={User} label="App Info" subLabel="Daddy v2.0.4" onClick={() => {}} colorClass="bg-gray-100 text-gray-600" />
     </div>
  );

  // --- RENDER ---

  const renderView = () => {
    switch (currentView) {
      case 'profile': return renderProfileView();
      case 'chats': return renderChatsView();
      case 'notifications': return renderNotificationsView();
      case 'storage': return renderStorageView();
      case 'privacy': return renderPrivacyView();
      case 'help': return renderHelpView();
      default: return renderMainView();
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'profile': return 'Profile';
      case 'chats': return 'Chats';
      case 'notifications': return 'Notifications';
      case 'storage': return 'Storage and Data';
      case 'privacy': return 'Privacy';
      case 'help': return 'Help';
      default: return 'Settings';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6">
      <div className="bg-white dark:bg-nexus-card w-full h-full md:h-[85vh] md:max-w-2xl md:rounded-2xl shadow-2xl border-none md:border dark:border-gray-700 flex flex-col overflow-hidden animate-fade-in-up">
        {renderHeader(getTitle(), currentView !== 'main')}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-nexus-card relative no-scrollbar">
           {renderView()}
        </div>
      </div>
    </div>
  );
};