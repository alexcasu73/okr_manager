import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import OKRList from './components/OKRList';
import TeamPage from './components/TeamPage';
import SettingsPage from './components/SettingsPage';
import AnalyticsPage from './components/AnalyticsPage';
import UserManagementPage from './components/UserManagementPage';
import ProfilePage from './components/ProfilePage';
import CreateOKRModal from './components/CreateOKRModal';
import OKRDetailModal from './components/OKRDetailModal';
import LoginPage from './components/LoginPage';
import InvitePage from './components/InvitePage';
import { ViewMode } from './types';
import { Loader2 } from 'lucide-react';

// Simple URL-based routing
function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  };

  return { path, navigate };
}

const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { path, navigate } = useRoute();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [okrRefreshTrigger, setOkrRefreshTrigger] = useState(0);
  const [selectedOKRId, setSelectedOKRId] = useState<string | null>(null);

  // Check for invitation route
  const inviteMatch = path.match(/^\/invite\/(.+)$/);
  const inviteToken = inviteMatch ? inviteMatch[1] : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle invitation page (can be accessed without auth)
  if (inviteToken) {
    return (
      <InvitePage
        token={inviteToken}
        onComplete={() => {
          navigate('/');
          setCurrentView('team');
        }}
      />
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Convert auth user to the format expected by components
  const currentUser = {
    id: user.id,
    name: user.name,
    avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff`,
    role: user.role
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} />;
      case 'okrs':
        return (
          <OKRList
            currentUser={currentUser}
            onCreateClick={() => setIsModalOpen(true)}
            onSelectOKR={(id) => setSelectedOKRId(id)}
            refreshTrigger={okrRefreshTrigger}
          />
        );
      case 'team':
        return <TeamPage />;
      case 'reports':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'admin':
        return <UserManagementPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6] dark:bg-gray-900 font-sans transition-colors duration-300">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Header onSelectOKR={(id) => setSelectedOKRId(id)} />
          {renderContent()}
        </div>
      </main>

      <CreateOKRModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          setOkrRefreshTrigger(prev => prev + 1);
        }}
      />

      <OKRDetailModal
        isOpen={selectedOKRId !== null}
        objectiveId={selectedOKRId}
        onClose={() => setSelectedOKRId(null)}
        onUpdate={() => {
          setOkrRefreshTrigger(prev => prev + 1);
        }}
        onDelete={() => {
          setOkrRefreshTrigger(prev => prev + 1);
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
