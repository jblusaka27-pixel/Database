import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';
import { supabase } from '../lib/supabase';
import { IncomingCrate } from '../types';

const REASONS = [
  { value: 'Supplier Return', label: 'Supplier Return' },
  { value: 'Redistribution', label: 'Redistribution' },
  { value: 'Correction', label: 'Correction' },
  { value: 'Recovery', label: 'Recovery' },
  { value: 'Other', label: 'Other' },
];

export const IncomingCrates = () => {
  const { selectedDepot, crateTypes } = useApp();
  const [transactions, setTransactions] = useState<IncomingCrate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    crateTypeId: '',
    quantity: '',
    reason: 'Supplier Return',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (selectedDepot) loadTransactions();
  }, [selectedDepot]);

  useEffect(() => {
    if (crateTypes.length > 0 && !formData.crateTypeId) {
      setFormData((prev) => ({ ...prev, crateTypeId: crateTypes[0].id }));
    }
  }, [crateTypes]);

  const loadTransactions = async () => {
    if (!selectedDepot) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('incoming_crates')
        .select('*')
        .eq('depot_id', selectedDepot.id)
        .order('transaction_date', { ascending: false })
        .limit(50);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepot) return;
    try {
      await supabase.from('incoming_crates').insert({
        depot_id: selectedDepot.id,
        crate_type_id: formData.crateTypeId,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        notes: formData.notes || null,
        transaction_date: formData.transactionDate,
      });
      setShowModal(false);
      setFormData({
        crateTypeId: crateTypes[0]?.id || '',
        quantity: '',
        reason: 'Supplier Return',
        notes: '',
        transactionDate: new Date().toISOString().split('T')[0],
      });
      loadTransactions();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await supabase.from('incoming_crates').delete().eq('id', id);
      loadTransactions();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getCrateTypeName = (id: string) => crateTypes.find((ct) => ct.id === id)?.name || 'Unknown';

  if (loading) return <div className="flex items-center justify-center h-full"><Loading size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Incoming Crates</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Add</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Crate Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No transactions</td></tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-sm">{new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{getCrateTypeName(t.crate_type_id)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">+{t.quantity}</td>
                    <td className="px-4 py-3 text-sm">{t.reason}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.notes || '-'}</td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Incoming" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="date" label="Date" value={formData.transactionDate} onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })} max={new Date().toISOString().split('T')[0]} required />
          <Select label="Crate Type" value={formData.crateTypeId} onChange={(e) => setFormData({ ...formData, crateTypeId: e.target.value })} options={crateTypes.map((ct) => ({ value: ct.id, label: ct.name }))} required />
          <Input type="number" label="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} min="1" required />
          <Select label="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} options={REASONS} required />
          <Input label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
