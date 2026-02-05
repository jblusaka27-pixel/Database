import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronDown, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';

interface CustomerFormData {
  name: string;
  notes: string;
}

export const Customers = () => {
  const { selectedDepot } = useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({ name: '', notes: '' });
  const [importData, setImportData] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedDepot) {
      loadCustomers();
    }
  }, [selectedDepot, statusFilter]);

  const loadCustomers = async () => {
    if (!selectedDepot) return;
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('depot_id', selectedDepot.id);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('name');
      if (!error && data) {
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({ name: customer.name, notes: customer.notes || '' });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !selectedDepot) return;

    setLoading(true);
    try {
      if (editingCustomer) {
        await supabase
          .from('customers')
          .update({
            name: formData.name,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);
      } else {
        await supabase.from('customers').insert({
          depot_id: selectedDepot.id,
          name: formData.name,
          notes: formData.notes,
          status: 'active',
          ledger_enabled: true,
        });
      }
      setShowModal(false);
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      await supabase
        .from('customers')
        .update({
          status: customer.status === 'active' ? 'inactive' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);
      loadCustomers();
    } catch (error) {
      console.error('Error updating customer status:', error);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Delete ${customer.name}?`)) return;
    try {
      await supabase.from('customers').delete().eq('id', customer.id);
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleImportCustomers = async () => {
    if (!importData.trim() || !selectedDepot) return;

    setLoading(true);
    const lines = importData.trim().split('\n').filter(line => line.trim());
    let success = 0;
    let failed = 0;

    try {
      for (const line of lines) {
        const customerName = line.trim();
        if (!customerName) continue;

        try {
          await supabase.from('customers').insert({
            depot_id: selectedDepot.id,
            name: customerName,
            status: 'active',
            ledger_enabled: true,
          });
          success++;
        } catch (error) {
          failed++;
        }
      }

      setImportStatus({ success, failed });
      setImportData('');
      loadCustomers();

      setTimeout(() => {
        setShowImportModal(false);
        setImportStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error importing customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setImportData(text);
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportModal(true)} icon={<Upload className="w-4 h-4" />} variant="secondary">
            Import
          </Button>
          <Button onClick={() => handleOpenModal()} icon={<Plus className="w-4 h-4" />}>
            Add Customer
          </Button>
        </div>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full md:w-40 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white appearance-none pr-10"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" text="Loading..." />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No customers found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-gray-600 dark:text-gray-400 font-semibold">
                    <th className="pb-3 px-4">Name</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Notes</th>
                    <th className="pb-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            customer.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => handleToggleStatus(customer)}
                        >
                          {customer.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {customer.notes || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(customer)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter customer name"
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
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingCustomer ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Customers" size="lg">
        <div className="space-y-4">
          {importStatus ? (
            <div className="space-y-2">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-400 font-medium">
                  ✓ Successfully imported {importStatus.success} customer{importStatus.success !== 1 ? 's' : ''}
                </p>
                {importStatus.failed > 0 && (
                  <p className="text-orange-800 dark:text-orange-400 text-sm mt-2">
                    ⚠ {importStatus.failed} customer{importStatus.failed !== 1 ? 's' : ''} failed (may be duplicates)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paste customer names (one per line)
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="RINGSON&#10;RUKUNDURO&#10;MAKUMBIRO&#10;..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none h-40 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or upload a file
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileImport}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportCustomers} disabled={!importData.trim() || loading}>
                  {loading ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
