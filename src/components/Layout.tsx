import { ReactNode, useState } from 'react';
import { Package, Home, Users, BookOpen, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ClipboardList, FileText, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navigation = [
  { name: 'Dashboard', icon: Home, page: 'dashboard' },
  { name: 'Customers', icon: Users, page: 'customers' },
  { name: 'Ledger', icon: BookOpen, page: 'ledger' },
  { name: 'Daily Closing', icon: ClipboardList, page: 'daily-closing' },
  { name: 'Incoming', icon: ArrowDownCircle, page: 'incoming' },
  { name: 'Outgoing', icon: ArrowUpCircle, page: 'outgoing' },
  { name: 'Transfers', icon: ArrowLeftRight, page: 'transfers' },
  { name: 'Reports', icon: FileText, page: 'reports' },
];

export const Layout = ({ children, currentPage, onNavigate }: LayoutProps) => {
  const { selectedDepot, depots, setSelectedDepot } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">CrateFlow</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Current Depot</label>
              <select
                value={selectedDepot?.id || ''}
                onChange={(e) => {
                  const depot = depots.find((d) => d.id === e.target.value);
                  if (depot) setSelectedDepot(depot);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {depots.map((depot) => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name}
                  </option>
                ))}
              </select>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => {
                          onNavigate(item.page);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <Package className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900 dark:text-white">CrateFlow</span>
            </div>
            <div className="w-6" />
          </div>

          <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
