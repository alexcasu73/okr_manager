import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import OKRList from './components/OKRList';
import CreateOKRModal from './components/CreateOKRModal';
import { ViewMode, User } from './types';
import { USERS } from './mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(USERS[0]); // Default to Admin

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} />;
      case 'okrs':
        return <OKRList currentUser={currentUser} onCreateClick={() => setIsModalOpen(true)} />;
      case 'team':
        return <div className="text-center py-20 text-gray-500">Team View Coming Soon</div>;
      case 'reports':
        return <div className="text-center py-20 text-gray-500">Analytics & Reports Coming Soon</div>;
      default:
        return <Dashboard currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] font-sans">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Header 
            user={currentUser} 
            allUsers={USERS}
            onUserSwitch={setCurrentUser}
          />
          {renderContent()}
        </div>
      </main>

      <CreateOKRModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(data) => {
          console.log('New OKR:', data);
          // In a real app, this would update state/backend
        }} 
      />
    </div>
  );
};

export default App;