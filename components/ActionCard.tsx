import React from 'react';
import { ActionItem } from '../types';
import { CheckCircle, ArrowRight, Clock, MapPin, Repeat } from 'lucide-react';

interface ActionCardProps {
  item: ActionItem;
  onComplete: (id: string) => void;
  onGoToChat: (chatId: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({ item, onComplete, onGoToChat }) => {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-5 mb-3 border transition-all duration-300 group
      ${item.isCompleted 
        ? 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60 grayscale' 
        : 'bg-white dark:bg-nexus-card border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-nexus-mint/30'
      }
    `}>
      {/* Decorative indicator */}
      {!item.isCompleted && (
        <div className="absolute left-0 top-4 bottom-4 w-1 bg-nexus-mint rounded-r-full"></div>
      )}

      <div className="flex justify-between items-start pl-3">
        <div className="flex-1 pr-4">
          <h4 className={`font-bold text-lg mb-2 leading-tight ${item.isCompleted ? 'line-through text-gray-500' : 'text-nexus-midnight dark:text-white'}`}>
            {item.title}
          </h4>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center text-xs font-medium text-nexus-midnight bg-nexus-mint/20 px-2 py-1 rounded-md">
              <Clock size={12} className="mr-1.5" />
              <span>{item.dueDateTime}</span>
            </div>
            
            {item.recurrence && (
              <div className="flex items-center text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-md">
                <Repeat size={12} className="mr-1.5" />
                <span>{item.recurrence}</span>
              </div>
            )}
            
            {item.location && (
               <div className="flex items-center text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md">
                <MapPin size={12} className="mr-1.5" />
                <span>{item.location}</span>
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onComplete(item.id); }}
          className={`p-1 rounded-full transition-all transform active:scale-90 ${item.isCompleted ? 'text-nexus-mint' : 'text-gray-300 hover:text-nexus-mint'}`}
        >
          <CheckCircle size={28} className="transition-all" />
        </button>
      </div>

      <div className="flex justify-end pl-3 pt-2 border-t border-gray-50 dark:border-gray-800/50">
         <button 
           onClick={() => onGoToChat(item.chatId)}
           className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-nexus-midnight dark:hover:text-nexus-mint flex items-center transition-colors group-hover:translate-x-1 duration-300"
         >
           View Context <ArrowRight size={12} className="ml-1" />
         </button>
      </div>
    </div>
  );
};