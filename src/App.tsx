import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Loading } from './components/ui/Loading';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { CustomerLedger } from './pages/CustomerLedger';
import { DailyClosing } from './pages/DailyClosing';
import { IncomingCrates } from './pages/IncomingCrates';
import { OutgoingCrates } from './pages/OutgoingCrates';
import { Transfers } from './pages/Transfers';
import { Reports } from './pages/Reports';

const AppContent = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { loading, selectedDepot } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading size="lg" text="Loading CrateFlow..." />
      </div>
    );
  }

  if (!selectedDepot) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">No depots available</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please add a depot to get started</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'ledger':
        return <CustomerLedger />;
      case 'daily-closing':
        return <DailyClosing />;
      case 'incoming':
        return <IncomingCrates />;
      case 'outgoing':
        return <OutgoingCrates />;
      case 'transfers':
        return <Transfers />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
