import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2, Users } from 'lucide-react';
import { User } from '../types';

interface CallOverlayProps {
  partnerName: string;
  isVideo: boolean;
  onEndCall: () => void;
  isGroup?: boolean;
  participants?: User[];
}

export const CallOverlay: React.FC<CallOverlayProps> = ({ partnerName, isVideo, onEndCall, isGroup, participants }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(!isVideo);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<'calling' | 'connected'>('calling');

  useEffect(() => {
    // Simulate connection after 2 seconds
    const timer = setTimeout(() => {
      setStatus('connected');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-64 bg-nexus-midnight/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex items-center justify-between cursor-pointer animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-nexus-midnight to-nexus-mint flex items-center justify-center text-white font-bold">
            {partnerName ? partnerName[0].toUpperCase() : '?'}
          </div>
          <div>
            <div className="text-white text-sm font-bold truncate w-24">{partnerName}</div>
            <div className="text-nexus-mint text-xs font-mono">{status === 'calling' ? 'Calling...' : formatTime(duration)}</div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsMinimized(false)} className="p-2 hover:bg-white/10 rounded-full text-white">
             <Maximize2 size={16} />
           </button>
           <button onClick={onEndCall} className="p-2 bg-nexus-coral hover:bg-red-600 rounded-full text-white">
             <PhoneOff size={16} />
           </button>
        </div>
      </div>
    );
  }

  // Mock participants for the group call grid if not provided
  const mockParticipants = [
    { id: '1', name: 'Dr. Erikson' },
    { id: '2', name: 'Alicia' },
    { id: '3', name: 'Traveler' },
    { id: '4', name: 'Nott the Brave' }
  ];

  const displayParticipants = isGroup ? (participants && participants.length >= 4 ? participants.slice(0, 4) : mockParticipants) : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1c1c1d] overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex flex-col">
          <span className="text-white font-bold text-lg">{partnerName}</span>
          <span className="text-gray-300 text-sm">{status === 'calling' ? 'Calling...' : formatTime(duration)}</span>
        </div>
        <button onClick={() => setIsMinimized(true)} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all">
          <Minimize2 size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center p-4 pt-20 pb-32">
        {isGroup && isVideo ? (
          <div className="w-full h-full max-w-5xl grid grid-cols-2 grid-rows-2 gap-4">
            {displayParticipants.map((p, idx) => (
              <div key={p.id || idx} className="relative rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                   {/* Mock Camera Feed */}
                   <div className="w-full h-full bg-gray-700 animate-pulse flex items-center justify-center text-gray-500">
                      Camera Active
                   </div>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-sm font-medium">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        ) : isGroup && !isVideo ? (
          <div className="w-full max-w-md h-full flex flex-col">
            <div className="flex flex-col items-center mb-8">
               <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#3390ec] to-cyan-500 flex items-center justify-center text-5xl font-bold text-white mb-4 shadow-[0_0_30px_rgba(51,144,236,0.3)]">
                 {partnerName ? partnerName[0].toUpperCase() : '?'}
               </div>
               <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 You are Live
               </div>
            </div>
            
            <div className="flex-1 bg-[#2c2c2e] rounded-3xl p-4 overflow-y-auto">
              <h3 className="text-gray-400 text-sm font-medium mb-4 px-2">Participants ({displayParticipants.length})</h3>
              <div className="space-y-4">
                {displayParticipants.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center justify-between px-2 cursor-pointer hover:bg-white/5 rounded-xl p-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                        {p.name ? p.name[0].toUpperCase() : '?'}
                      </div>
                      <div>
                        <div className="text-white font-medium flex items-center gap-2">
                          {p.name} {idx === 0 && <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">Admin</span>}
                        </div>
                        <div className={`text-xs ${idx === 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {idx === 0 ? 'speaking...' : idx === 2 ? 'requested to speak' : 'listening'}
                        </div>
                      </div>
                    </div>
                    {idx === 2 && (
                       <div className="relative group">
                         <button className="text-[#3390ec] text-sm font-medium bg-[#3390ec]/10 px-3 py-1 rounded-full">
                           Review
                         </button>
                         {/* Mock Admin Pop-up */}
                         <div className="absolute right-0 top-full mt-2 w-48 bg-[#1c1c1d] border border-gray-700 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-30">
                           <button className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 text-sm">Allow to speak</button>
                           <button className="w-full text-left px-4 py-3 text-white hover:bg-gray-800 text-sm">Open chat</button>
                           <button className="w-full text-left px-4 py-3 text-red-400 hover:bg-gray-800 text-sm">Remove</button>
                         </div>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
             {/* Ringing Rings */}
             {status === 'calling' && (
               <>
                 <div className="absolute inset-0 border-2 border-[#3390ec]/30 rounded-full animate-ping [animation-duration:2s]"></div>
                 <div className="absolute inset-0 border-2 border-[#3390ec]/20 rounded-full animate-ping [animation-delay:0.5s] [animation-duration:2s]"></div>
               </>
             )}
             
             <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#3390ec] to-cyan-500 p-1 shadow-[0_0_50px_rgba(51,144,236,0.3)] relative overflow-hidden mb-8">
               {(!isCamOff && isVideo) ? (
                  <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                     <div className="w-full h-full bg-gray-700 animate-pulse flex items-center justify-center text-gray-500">
                        Camera Active
                     </div>
                  </div>
               ) : (
                  <div className="w-full h-full rounded-full bg-[#1c1c1d] flex items-center justify-center text-6xl font-bold text-white">
                    {partnerName ? partnerName[0].toUpperCase() : '?'}
                  </div>
               )}
             </div>
             
             <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{partnerName}</h2>
             <p className="text-[#3390ec] font-medium tracking-widest uppercase text-sm">
                {status === 'calling' ? 'Establishing Connection...' : formatTime(duration)}
             </p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-[#2c2c2e]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl z-20">
        <button 
          onClick={() => setIsCamOff(!isCamOff)}
          className={`p-4 rounded-full transition-all duration-300 ${isCamOff ? 'bg-white text-gray-900' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
        >
          {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>

        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-white text-gray-900' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        {isGroup && (
          <button className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-300">
            <Users size={24} />
          </button>
        )}

        <button 
          onClick={onEndCall}
          className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-[0_0_20px_rgba(239,68,68,0.4)] transform hover:scale-105 transition-all"
        >
          <PhoneOff size={28} fill="currentColor" />
        </button>
      </div>
    </div>
  );
};