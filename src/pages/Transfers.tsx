import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';
import { supabase } from '../lib/supabase';
import { Transfer } from '../types';

export const Transfers = () => {
  const { selectedDepot, depots, crateTypes } = useApp();
  const [transactions, setTransactions] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fromDepotId: '',
    toDepotId: '',
    crateTypeId: '',
    quantity: '',
    reason: '',
    notes: '',
    transferDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (selectedDepot) {
      loadTransactions();
      setFormData((prev) => ({ ...prev, fromDepotId: selectedDepot.id }));
    }
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
        .from('transfers')
        .select('*')
        .or(`from_depot_id.eq.${selectedDepot.id},to_depot_id.eq.${selectedDepot.id}`)
        .order('transfer_date', { ascending: false })
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
    if (formData.fromDepotId === formData.toDepotId) {
      alert('Depots must be different');
      return;
    }
    try {
      await supabase.from('transfers').insert({
        from_depot_id: formData.fromDepotId,
        to_depot_id: formData.toDepotId,
        crate_type_id: formData.crateTypeId,
        quantity: parseInt(formData.quantity),
        reason: formData.reason || null,
        notes: formData.notes || null,
        transfer_date: formData.transferDate,
      });
      setShowModal(false);
      setFormData({
        fromDepotId: selectedDepot?.id || '',
        toDepotId: '',
        crateTypeId: crateTypes[0]?.id || '',
        quantity: '',
        reason: '',
        notes: '',
        transferDate: new Date().toISOString().split('T')[0],
      });
      loadTransactions();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transfer?')) return;
    try {
      await supabase.from('transfers').delete().eq('id', id);
      loadTransactions();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getDepotName = (id: string) => depots.find((d) => d.id === id)?.name || 'Unknown';
  const getCrateTypeName = (id: string) => crateTypes.find((ct) => ct.id === id)?.name || 'Unknown';
  const availableToDepots = depots.filter((d) => d.id !== formData.fromDepotId);

  if (loading) return <div className="flex items-center justify-center h-full"><Loading size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transfers</h1>
        <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />New</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">From</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Crate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No transfers</td></tr>
              ) : (
                transactions.map((t) => {
                  const isOutgoing = t.from_depot_id === selectedDepot?.id;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm">{new Date(t.transfer_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">{getDepotName(t.from_depot_id)}</td>
                      <td className="px-4 py-3 text-center"><ArrowRight className="w-4 h-4 text-gray-400 mx-auto" /></td>
                      <td className="px-4 py-3 text-sm">{getDepotName(t.to_depot_id)}</td>
                      <td className="px-4 py-3 text-sm">{getCrateTypeName(t.crate_type_id)}</td>
                      <td className="px-4 py-3 text-sm"><span className={`font-semibold ${isOutgoing ? 'text-red-600' : 'text-green-600'}`}>{isOutgoing ? '-' : '+' }{t.quantity}</span></td>
                      <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Transfer" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="date" label="Date" value={formData.transferDate} onChange={(e) => setFormData({ ...formData, transferDate: e.target.value })} max={new Date().toISOString().split('T')[0]} required />
          <Select label="From" value={formData.fromDepotId} onChange={(e) => setFormData({ ...formData, fromDepotId: e.target.value, toDepotId: '' })} options={depots.map((d) => ({ value: d.id, label: d.name }))} required />
          <Select label="To" value={formData.toDepotId} onChange={(e) => setFormData({ ...formData, toDepotId: e.target.value })} options={[{ value: '', label: 'Select destination...' }, ...availableToDepots.map((d) => ({ value: d.id, label: d.name }))]} required />
          <Select label="Crate Type" value={formData.crateTypeId} onChange={(e) => setFormData({ ...formData, crateTypeId: e.target.value })} options={crateTypes.map((ct) => ({ value: ct.id, label: ct.name }))} required />
          <Input type="number" label="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} min="1" required />
          <Input label="Reason" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
          <Input label="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
