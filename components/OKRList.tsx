import React, { useState } from 'react';
import { Card, Button, Badge, ProgressBar } from './UIComponents';
import { Objective, User } from '../types';
import { ICONS, STATUS_COLORS, PROGRESS_COLORS } from '../constants';
import { MOCK_OBJECTIVES } from '../mockData';

interface OKRListProps {
  onCreateClick: () => void;
  currentUser: User;
}

const OKRList: React.FC<OKRListProps> = ({ onCreateClick, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'company' | 'team'>('all');

  const filteredObjectives = MOCK_OBJECTIVES.filter(obj => {
    // First, filter by permissions
    if (currentUser.role !== 'super-admin' && obj.ownerId !== currentUser.id) {
      return false;
    }

    // Then, filter by tab
    if (activeTab === 'all') return true;
    return obj.level === activeTab;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Objectives & Key Results</h2>
          <p className="text-sm text-gray-500 mt-1">
            {currentUser.role === 'super-admin' 
              ? 'Viewing all company objectives' 
              : `Viewing objectives for ${currentUser.name}`}
          </p>
        </div>
        <Button onClick={onCreateClick} icon={ICONS.Plus}>
          Create OKR
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {['all', 'company', 'team'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative capitalize ${
              activeTab === tab ? 'text-black' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-[-5px] left-0 w-full h-0.5 bg-black rounded-full"></span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredObjectives.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-200">
             <div className="text-gray-400 mb-2">{ICONS.Target}</div>
             <p className="text-gray-500 font-medium">No objectives found for this view.</p>
           </div>
        ) : (
          filteredObjectives.map((obj) => (
            <Card key={obj.id} className="transition-shadow hover:shadow-md">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Side: Objective Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[obj.status].split(' ')[0].replace('bg-', 'bg-').replace('100', '500')}`}></span>
                      <h3 className="text-lg font-bold text-gray-900">{obj.title}</h3>
                      <Badge className="ml-2 capitalize">{obj.period}</Badge>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {ICONS.More}
                    </button>
                  </div>
                  
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {obj.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                    <div className="flex items-center gap-1">
                      <span className="bg-gray-100 p-1 rounded-full">{ICONS.Target}</span>
                      <span className="capitalize">{obj.level}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Owner display could be improved by looking up user details from ID */}
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md font-medium text-gray-600">
                        {obj.ownerId === currentUser.id ? 'You' : obj.ownerId}
                      </span>
                    </div>
                    <div>Due: {new Date(obj.dueDate).toLocaleDateString()}</div>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-gray-900">{obj.progress}%</span>
                    <ProgressBar 
                        value={obj.progress} 
                        color={PROGRESS_COLORS[obj.status as keyof typeof PROGRESS_COLORS] ? `bg-[${PROGRESS_COLORS[obj.status as keyof typeof PROGRESS_COLORS]}]` : 'bg-blue-500'} 
                      />
                  </div>
                </div>

                {/* Right Side: Key Results */}
                <div className="flex-1 bg-gray-50 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Key Results</h4>
                  <div className="space-y-3">
                    {obj.keyResults.map((kr) => (
                      <div key={kr.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-gray-800 line-clamp-1">{kr.description}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[kr.status]}`}>
                            {kr.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-gray-400 h-1.5 rounded-full" 
                              style={{ width: `${(kr.currentValue / kr.targetValue) * 100}%` }}
                            ></div>
                          </div>
                          <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                        </div>
                      </div>
                    ))}
                    {obj.keyResults.length === 0 && (
                      <p className="text-xs text-gray-400 italic">No key results defined.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default OKRList;