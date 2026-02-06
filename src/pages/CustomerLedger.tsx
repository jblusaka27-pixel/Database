import { useState, useEffect } from 'react';
import { Plus, ArrowDown, ArrowUp, Filter } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Customer, CustomerLedgerTransaction } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';

interface TransactionForm {
  customerId: string;
  crateTypeId: string;
  transactionType: 'deposit' | 'withdrawal';
  quantity: string;
  reason: string;
  notes: string;
}

export const CustomerLedger = () => {
  const { selectedDepot, crateTypes } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CustomerLedgerTransaction[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<TransactionForm>({
    customerId: '',
    crateTypeId: '',
    transactionType: 'deposit',
    quantity: '',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    if (selectedDepot) {
      loadCustomers();
    }
  }, [selectedDepot]);

  useEffect(() => {
    if (selectedCustomer) {
      loadTransactionsAndBalances();
    }
  }, [selectedCustomer]);

  const loadCustomers = async () => {
    if (!selectedDepot) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('depot_id', selectedDepot.id)
        .order('name');
      if (!error && data) {
        setCustomers(data);
        if (data.length > 0) {
          setSelectedCustomer(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadTransactionsAndBalances = async () => {
    if (!selectedCustomer) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_ledger_transactions')
        .select('*')
        .eq('customer_id', selectedCustomer.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data);
        calculateBalances(data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = (txns: CustomerLedgerTransaction[]) => {
    const balancesByType: Record<string, number> = {};
    txns.forEach((tx) => {
      if (!balancesByType[tx.crate_type_id]) {
        balancesByType[tx.crate_type_id] = 0;
      }
      if (tx.transaction_type === 'deposit') {
        balancesByType[tx.crate_type_id] += tx.quantity;
      } else if (tx.transaction_type === 'withdrawal') {
        balancesByType[tx.crate_type_id] -= tx.quantity;
      }
    });
    setBalances(balancesByType);
  };

  const handleAddTransaction = async () => {
    if (!formData.customerId || !formData.crateTypeId || !formData.quantity || !selectedCustomer) return;

    setLoading(true);
    try {
      const quantity = parseInt(formData.quantity);
      const currentBalance = balances[formData.crateTypeId] || 0;
      let newBalance = currentBalance;

      if (formData.transactionType === 'deposit') {
        newBalance = currentBalance + quantity;
      } else {
        if (currentBalance < quantity) {
          alert('Insufficient balance for this withdrawal');
          setLoading(false);
          return;
        }
        newBalance = currentBalance - quantity;
      }

      await supabase.from('customer_ledger_transactions').insert({
        customer_id: formData.customerId,
        depot_id: selectedDepot?.id,
        crate_type_id: formData.crateTypeId,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: formData.transactionType,
        quantity,
        running_balance: newBalance,
        reason: formData.reason,
        notes: formData.notes,
      });

      setFormData({
        customerId: formData.customerId,
        crateTypeId: '',
        transactionType: 'deposit',
        quantity: '',
        reason: '',
        notes: '',
      });
      setShowModal(false);
      loadTransactionsAndBalances();
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    if (selectedCustomer) {
      setFormData({ ...formData, customerId: selectedCustomer.id });
      setShowModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Ledger</h1>
        <Button onClick={handleOpenModal} icon={Plus}>
          Add Transaction
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No customers found for this depot.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Go to Customers page to add or import customers.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Customer
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = customers.find((c) => c.id === e.target.value);
                      if (customer) setSelectedCustomer(customer);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCustomer && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {crateTypes.map((type) => (
                  <div key={type.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{type.name}</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {balances[type.id] || 0}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction History</h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loading size="lg" text="Loading..." />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No transactions yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr className="text-left text-gray-600 dark:text-gray-400 font-semibold">
                          <th className="pb-3 px-4">Date</th>
                          <th className="pb-3 px-4">Type</th>
                          <th className="pb-3 px-4">Quantity</th>
                          <th className="pb-3 px-4">Balance</th>
                          <th className="pb-3 px-4">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const crateType = crateTypes.find((t) => t.id === tx.crate_type_id);
                          return (
                            <tr
                              key={tx.id}
                              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                                {new Date(tx.transaction_date).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {tx.transaction_type === 'deposit' ? (
                                    <ArrowDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <ArrowUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {crateType?.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                                {tx.transaction_type === 'deposit' ? '+' : '-'}
                                {tx.quantity}
                              </td>
                              <td className="py-4 px-4 font-semibold text-blue-600 dark:text-blue-400">
                                {tx.running_balance}
                              </td>
                              <td className="py-4 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                {tx.reason || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
            )}
            </>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Transaction"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transaction Type *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="deposit"
                  checked={formData.transactionType === 'deposit'}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionType: e.target.value as any })
                  }
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">Deposit</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="withdrawal"
                  checked={formData.transactionType === 'withdrawal'}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionType: e.target.value as any })
                  }
                  className="w-4 h-4"
                />
                <span className="text-gray-700 dark:text-gray-300">Withdrawal</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Crate Type *
            </label>
            <select
              value={formData.crateTypeId}
              onChange={(e) => setFormData({ ...formData, crateTypeId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select crate type</option>
              {crateTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Truck loading, Regular supply"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none h-20"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTransaction}
              disabled={!formData.crateTypeId || !formData.quantity}
            >
              Add Transaction
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
