import React from 'react';
import { LayoutGrid, Calendar, Bell, Settings, CheckSquare, Newspaper } from 'lucide-react';

export type ViewType = 'kanban' | 'calendar' | 'requests' | 'mines' | 'admin' | 'aufgaben' | 'news';

interface BottomNavProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  pendingRequestCount?: number;
  isAdmin?: boolean;
  newsCount?: number;
  calendarCount?: number;
  boardCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, pendingRequestCount = 0, isAdmin = false, newsCount = 0, calendarCount = 0, boardCount = 0 }) => {
  const tabs = isAdmin ? [
    { id: 'kanban' as const, label: 'Board', icon: LayoutGrid },
    { id: 'requests' as const, label: 'Anfragen', icon: Bell, badge: pendingRequestCount > 0 ? pendingRequestCount : undefined },
    { id: 'calendar' as const, label: 'Plan', icon: Calendar },
    { id: 'aufgaben' as const, label: 'Aufgaben', icon: CheckSquare },
    { id: 'admin' as const, label: 'Admin', icon: Settings },
  ] : [
    { id: 'kanban' as const, label: 'Board', icon: LayoutGrid, badge: boardCount > 0 ? boardCount : undefined },
    { id: 'requests' as const, label: 'Anfragen', icon: Bell, badge: pendingRequestCount > 0 ? pendingRequestCount : undefined },
    { id: 'calendar' as const, label: 'Plan', icon: Calendar, badge: calendarCount > 0 ? calendarCount : undefined },
    { id: 'news' as const, label: 'News', icon: Newspaper, badge: newsCount > 0 ? newsCount : undefined },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center px-4 z-40 shadow-lg nav-h">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-all relative ${
              isActive ? 'text-blue-900 bg-primary/20 rounded-2xl mx-1 my-1' : 'text-gray-400'
            }`}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {tab.badge !== undefined && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {tab.badge}
                </div>
              )}
            </div>
            <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
