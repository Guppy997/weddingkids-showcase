import React from 'react';
import { Wedding, Staff } from '../types';
import { WeddingCard } from './WeddingCard';

interface MyWeddingsProps {
  weddings: Wedding[];
  currentUser: Staff;
  onWeddingClick: (wedding: Wedding) => void;
}

export const MyWeddings: React.FC<MyWeddingsProps> = ({ weddings, currentUser, onWeddingClick }) => {
  const myAssignments = weddings.filter(w => 
    w.assignedStaffIds.includes(currentUser.id)
  );

  return (
    <div className="px-6 py-4 pb-24">
      <header className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/20">
            {currentUser.initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{currentUser.name}</h1>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">{currentUser.department}</p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-4 leading-relaxed">
          Hier findest du alle Hochzeiten, für die du fest eingeteilt bist.
        </p>
      </header>

      <div className="space-y-4">
        {myAssignments.length > 0 ? (
          myAssignments.map((wedding) => (
            <WeddingCard 
              key={wedding.id} 
              wedding={wedding} 
              onClick={() => onWeddingClick(wedding)} 
            />
          ))
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-12 text-center">
            <p className="text-gray-400 font-medium text-sm">Du bist aktuell für keine Hochzeiten fest eingetragen.</p>
          </div>
        )}
      </div>
    </div>
  );
};
