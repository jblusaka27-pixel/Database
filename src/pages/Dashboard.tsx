import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Loading } from '../components/ui/Loading';
import { SimpleBarChart } from '../components/ui/SimpleBarChart';
import { calculateCurrentBalance, getTodayTransactions } from '../utils/calculations';
import { supabase } from '../lib/supabase';

interface Balance {
  crateTypeName: string;
  quantity: number;
}

export const Dashboard = () => {
  const { selectedDepot, crateTypes } = useApp();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [todayStats, setTodayStats] = useState({ incoming: 0, outgoing: 0, transfersIn: 0, transfersOut: 0 });
  const [hasClosingToday, setHasClosingToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedDepot) loadDashboardData();
  }, [selectedDepot]);

  const loadDashboardData = async () => {
    if (!selectedDepot) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const balancePromises = crateTypes.map(async (ct) => ({
        crateTypeName: ct.name,
        quantity: await calculateCurrentBalance(selectedDepot.id, ct.id),
      }));
      const [balanceResults, stats, closingCheck] = await Promise.all([
        Promise.all(balancePromises),
        getTodayTransactions(selectedDepot.id),
        supabase.from('daily_closings').select('id').eq('depot_id', selectedDepot.id).eq('closing_date', today).limit(1),
      ]);
      setBalances(balanceResults);
      setTodayStats(stats);
      setHasClosingToday((closingCheck.data?.length || 0) > 0);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loading size="lg" text="Loading..." /></div>;

  const totalCrates = balances.reduce((sum, b) => sum + b.quantity, 0);
  const lowStockItems = balances.filter((b) => b.quantity < 50).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">{selectedDepot?.name}</p>
      </div>

      {!hasClosingToday && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div><h3 className="font-medium text-yellow-900">No Daily Closing Today</h3></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="!p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Crates</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCrates}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>
        <Card className="!p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Incoming</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.incoming}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </Card>
        <Card className="!p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outgoing</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.outgoing}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </Card>
        <Card className="!p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transfers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{todayStats.transfersIn + todayStats.transfersOut}</p>
            </div>
            <ArrowLeftRight className="w-8 h-8 text-teal-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Current Stock Levels">
          <SimpleBarChart data={balances.map((b) => ({ label: b.crateTypeName, value: b.quantity }))} height={250} />
        </Card>
        <Card title="Stock Status">
          <div className="space-y-3">
            {balances.map((balance) => (
              <div key={balance.crateTypeName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">{balance.crateTypeName}</span>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-bold">{balance.quantity}</span>
                  {balance.quantity < 50 && <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded">Low</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
