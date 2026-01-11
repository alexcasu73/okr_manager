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
import SuperadminPage from './components/SuperadminPage';
import ProfilePage from './components/ProfilePage';
import BillingPage from './components/BillingPage';
import CreateOKRModal from './components/CreateOKRModal';
import OKRDetailModal from './components/OKRDetailModal';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import InvitePage from './components/InvitePage';
import RegisterAziendaPage from './components/RegisterAziendaPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import SetupAccountPage from './components/SetupAccountPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import { ViewMode } from './types';
import { Loader2, Menu } from 'lucide-react';

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
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const { path, navigate } = useRoute();
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [okrRefreshTrigger, setOkrRefreshTrigger] = useState(0);
  const [selectedOKRId, setSelectedOKRId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Check for invitation route
  const inviteMatch = path.match(/^\/invite\/(.+)$/);
  const inviteToken = inviteMatch ? inviteMatch[1] : null;

  // Check for register route
  const isRegisterPage = path === '/register';

  // Check for login route
  const isLoginPage = path === '/login';

  // Check for verify-email route
  const verifyEmailMatch = path.match(/^\/verify-email/);
  const verifyEmailToken = verifyEmailMatch ? new URLSearchParams(window.location.search).get('token') : null;

  // Check for setup-account route
  const setupAccountMatch = path.match(/^\/setup-account/);
  const setupAccountToken = setupAccountMatch ? new URLSearchParams(window.location.search).get('token') : null;

  // Check for billing route (redirect from Stripe)
  const isBillingPage = path === '/billing';

  // Check for privacy and terms pages
  const isPrivacyPage = path === '/privacy';
  const isTermsPage = path === '/terms';

  // Set default view based on user role or URL
  useEffect(() => {
    // Handle /billing URL redirect from Stripe
    if (isBillingPage && user?.role === 'azienda') {
      setCurrentView('billing');
      return;
    }
    if (user?.role === 'superadmin' && currentView === 'dashboard') {
      setCurrentView('superadmin');
    } else if (user?.role === 'azienda' && currentView === 'dashboard') {
      setCurrentView('admin'); // Azienda atterra su Gestione Utenti
    }
    // admin, lead, user → atterrano sulla Dashboard
  }, [user?.role, isBillingPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
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

  // Handle email verification page (can be accessed without auth)
  if (verifyEmailToken) {
    return (
      <VerifyEmailPage
        token={verifyEmailToken}
        onVerified={async () => {
          await refreshUser();
          setCurrentView('dashboard');
          navigate('/');
        }}
        onNavigateToLogin={() => navigate('/')}
      />
    );
  }

  // Handle setup account page (for invited users to set their password)
  if (setupAccountToken) {
    return (
      <SetupAccountPage
        token={setupAccountToken}
        onSetupComplete={async () => {
          await refreshUser();
          setCurrentView('dashboard');
          navigate('/');
        }}
        onNavigateToLogin={() => navigate('/')}
      />
    );
  }

  // Handle register page (can be accessed without auth)
  if (isRegisterPage) {
    return (
      <RegisterAziendaPage
        onNavigateToLogin={() => navigate('/')}
      />
    );
  }

  // Handle privacy page (can be accessed without auth)
  if (isPrivacyPage) {
    return (
      <PrivacyPage
        onBack={() => navigate('/')}
      />
    );
  }

  // Handle terms page (can be accessed without auth)
  if (isTermsPage) {
    return (
      <TermsPage
        onBack={() => navigate('/')}
      />
    );
  }

  // Not authenticated - show landing or login page
  if (!isAuthenticated || !user) {
    // Show login page on /login route
    if (isLoginPage) {
      return (
        <LoginPage
          onNavigateToRegister={() => navigate('/register')}
          onNavigateToLanding={() => navigate('/')}
        />
      );
    }
    // Show landing page by default
    return (
      <LandingPage
        onNavigateToLogin={() => navigate('/login')}
        onNavigateToRegister={() => navigate('/register')}
        onNavigateToPrivacy={() => navigate('/privacy')}
        onNavigateToTerms={() => navigate('/terms')}
      />
    );
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
      case 'superadmin':
        return <SuperadminPage />;
      case 'profile':
        return <ProfilePage />;
      case 'billing':
        return <BillingPage />;
      default:
        return <Dashboard currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 font-sans transition-colors duration-300 overflow-hidden">
      <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className={`flex-1 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col h-full overflow-hidden transition-all duration-300`}>
        <div className="flex-1 p-4 md:p-6 flex flex-col overflow-hidden">
          <div className="w-full flex-1 flex flex-col min-h-0">
            {/* Mobile hamburger button */}
            <div className="md:hidden flex items-center gap-3 mb-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">OKR Manager</h1>
            </div>
            <Header onSelectOKR={(id) => setSelectedOKRId(id)} />
            <div className="flex-1 min-h-0 overflow-auto">
              {renderContent()}
            </div>
          </div>
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
