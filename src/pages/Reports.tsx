import { useState } from 'react';
import { FileDown, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { calculateCurrentBalance } from '../utils/calculations';
import { getCustomerBalance } from '../utils/customerBalance';
import { Customer, CustomerLedgerTransaction } from '../types';

interface ReportData {
  crateTypeName: string;
  openingBalance: number;
  incoming: number;
  outgoing: number;
  transfersIn: number;
  transfersOut: number;
  closingBalance: number;
}

interface CustomerReportData {
  customerName: string;
  crateTypeName: string;
  balance: number;
}

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export const Reports = () => {
  const { selectedDepot, depots, crateTypes } = useApp();
  const [reportType, setReportType] = useState<'depot' | 'customer'>('depot');
  const [reportDepotId, setReportDepotId] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [customerReportData, setCustomerReportData] = useState<CustomerReportData[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const calculateDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();
    switch (dateRange) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'last7days':
        start = new Date(today.setDate(today.getDate() - 6));
        end = new Date();
        break;
      case 'last30days':
        start = new Date(today.setDate(today.getDate() - 29));
        end = new Date();
        break;
      case 'custom':
        return { start: startDate, end: endDate };
    }
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const generateReport = async () => {
    const depotId = reportDepotId || selectedDepot?.id;
    if (!depotId) return;

    if (reportType === 'depot') {
      generateDepotReport(depotId);
    } else {
      generateCustomerReport(depotId);
    }
  };

  const generateDepotReport = async (depotId: string) => {
    try {
      const dates = calculateDateRange();
      const dayBefore = new Date(dates.start);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const openingDate = dayBefore.toISOString().split('T')[0];

      const reportPromises = crateTypes.map(async (ct) => {
        const [opening, incoming, outgoing, transfersIn, transfersOut] = await Promise.all([
          calculateCurrentBalance(depotId, ct.id, openingDate),
          supabase.from('incoming_crates').select('quantity').eq('depot_id', depotId).eq('crate_type_id', ct.id).gte('transaction_date', dates.start).lte('transaction_date', dates.end),
          supabase.from('outgoing_crates').select('quantity').eq('depot_id', depotId).eq('crate_type_id', ct.id).gte('transaction_date', dates.start).lte('transaction_date', dates.end),
          supabase.from('transfers').select('quantity').eq('to_depot_id', depotId).eq('crate_type_id', ct.id).gte('transfer_date', dates.start).lte('transfer_date', dates.end),
          supabase.from('transfers').select('quantity').eq('from_depot_id', depotId).eq('crate_type_id', ct.id).gte('transfer_date', dates.start).lte('transfer_date', dates.end),
        ]);
        const incomingTotal = incoming.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const outgoingTotal = outgoing.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const transfersInTotal = transfersIn.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const transfersOutTotal = transfersOut.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const closingBalance = opening + incomingTotal - outgoingTotal + transfersInTotal - transfersOutTotal;
        return {
          crateTypeName: ct.name,
          openingBalance: opening,
          incoming: incomingTotal,
          outgoing: outgoingTotal,
          transfersIn: transfersInTotal,
          transfersOut: transfersOutTotal,
          closingBalance: Math.max(0, closingBalance),
        };
      });
      const results = await Promise.all(reportPromises);
      setReportData(results);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const generateCustomerReport = async (depotId: string) => {
    try {
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('depot_id', depotId)
        .eq('status', 'active');

      if (custError || !customers) return;

      const reportData: CustomerReportData[] = [];
      for (const customer of customers) {
        for (const crateType of crateTypes) {
          const balance = await getCustomerBalance(customer.id, crateType.id);
          reportData.push({
            customerName: customer.name,
            crateTypeName: crateType.name,
            balance,
          });
        }
      }

      setCustomerReportData(reportData);
      setHasGenerated(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const exportToCSV = () => {
    const depotName = depots.find((d) => d.id === (reportDepotId || selectedDepot?.id))?.name || 'All';
    const dates = calculateDateRange();
    const headers = ['Crate Type', 'Opening', 'Incoming', 'Outgoing', 'Trans In', 'Trans Out', 'Closing'];
    const rows = reportData.map((r) => [r.crateTypeName, r.openingBalance, r.incoming, r.outgoing, r.transfersIn, r.transfersOut, r.closingBalance]);
    const csvContent = [
      [`CrateFlow Pro Report`],
      [`Depot: ${depotName}`],
      [`Period: ${dates.start} to ${dates.end}`],
      [],
      headers,
      ...rows,
      [],
      ['Total', reportData.reduce((sum, r) => sum + r.openingBalance, 0), reportData.reduce((sum, r) => sum + r.incoming, 0), reportData.reduce((sum, r) => sum + r.outgoing, 0), reportData.reduce((sum, r) => sum + r.transfersIn, 0), reportData.reduce((sum, r) => sum + r.transfersOut, 0), reportData.reduce((sum, r) => sum + r.closingBalance, 0)],
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${dates.start}-to-${dates.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totals = {
    openingBalance: reportData.reduce((sum, r) => sum + r.openingBalance, 0),
    incoming: reportData.reduce((sum, r) => sum + r.incoming, 0),
    outgoing: reportData.reduce((sum, r) => sum + r.outgoing, 0),
    transfersIn: reportData.reduce((sum, r) => sum + r.transfersIn, 0),
    transfersOut: reportData.reduce((sum, r) => sum + r.transfersOut, 0),
    closingBalance: reportData.reduce((sum, r) => sum + r.closingBalance, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setReportType('depot')}
            className={`px-4 py-2 rounded transition-colors ${
              reportType === 'depot'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Depot Reports
          </button>
          <button
            onClick={() => setReportType('customer')}
            className={`px-4 py-2 rounded transition-colors ${
              reportType === 'customer'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Customer Ledger
          </button>
        </div>
      </div>
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Depot" value={reportDepotId} onChange={(e) => setReportDepotId(e.target.value)} options={[{ value: '', label: `Current (${selectedDepot?.name})` }, ...depots.map((d) => ({ value: d.id, label: d.name }))]} />
            <Select label="Date Range" value={dateRange} onChange={(e) => setDateRange(e.target.value)} options={DATE_RANGES} />
          </div>
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="date" label="Start" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input type="date" label="End" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={generateReport}><Search className="w-4 h-4 mr-2" />Generate</Button>
          </div>
        </div>
      </Card>
      {hasGenerated && (
        <Card>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Results</h3>
              {reportType === 'depot' && (
                <Button variant="secondary" onClick={exportToCSV} icon={<FileDown className="w-4 h-4" />}>
                  Export CSV
                </Button>
              )}
            </div>
            {reportType === 'depot' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Crate Type</th>
                      <th className="px-4 py-3 text-right font-medium">Opening</th>
                      <th className="px-4 py-3 text-right font-medium">Incoming</th>
                      <th className="px-4 py-3 text-right font-medium">Outgoing</th>
                      <th className="px-4 py-3 text-right font-medium">Trans In</th>
                      <th className="px-4 py-3 text-right font-medium">Trans Out</th>
                      <th className="px-4 py-3 text-right font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.map((row) => (
                      <tr key={row.crateTypeName} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium">{row.crateTypeName}</td>
                        <td className="px-4 py-3 text-right">{row.openingBalance}</td>
                        <td className="px-4 py-3 text-right text-green-600">+{row.incoming}</td>
                        <td className="px-4 py-3 text-right text-red-600">-{row.outgoing}</td>
                        <td className="px-4 py-3 text-right text-teal-600">+{row.transfersIn}</td>
                        <td className="px-4 py-3 text-right text-orange-600">-{row.transfersOut}</td>
                        <td className="px-4 py-3 text-right font-semibold">{row.closingBalance}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 dark:bg-gray-700/50 font-semibold">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{totals.openingBalance}</td>
                      <td className="px-4 py-3 text-right text-green-600">+{totals.incoming}</td>
                      <td className="px-4 py-3 text-right text-red-600">-{totals.outgoing}</td>
                      <td className="px-4 py-3 text-right text-teal-600">+{totals.transfersIn}</td>
                      <td className="px-4 py-3 text-right text-orange-600">-{totals.transfersOut}</td>
                      <td className="px-4 py-3 text-right">{totals.closingBalance}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Customer</th>
                      <th className="px-4 py-3 text-left font-medium">Crate Type</th>
                      <th className="px-4 py-3 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customerReportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 font-medium">{row.customerName}</td>
                        <td className="px-4 py-3">{row.crateTypeName}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                          {row.balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
