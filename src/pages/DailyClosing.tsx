import { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';
import { supabase } from '../lib/supabase';

interface ClosingEntry {
  crateTypeId: string;
  crateTypeName: string;
  quantity: number;
}

export const DailyClosing = () => {
  const { selectedDepot, crateTypes } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<ClosingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingClosing, setExistingClosing] = useState(false);

  useEffect(() => {
    if (selectedDepot && crateTypes.length > 0) checkExistingClosing();
  }, [selectedDepot, selectedDate, crateTypes]);

  const checkExistingClosing = async () => {
    if (!selectedDepot) return;
    setLoading(true);
    try {
      const { data: closings } = await supabase
        .from('daily_closings')
        .select('*')
        .eq('depot_id', selectedDepot.id)
        .eq('closing_date', selectedDate);
      if (closings && closings.length > 0) {
        setExistingClosing(true);
        const loadedEntries = crateTypes.map((ct) => {
          const existing = closings.find((c) => c.crate_type_id === ct.id);
          return { crateTypeId: ct.id, crateTypeName: ct.name, quantity: existing?.quantity || 0 };
        });
        setEntries(loadedEntries);
      } else {
        setExistingClosing(false);
        setEntries(crateTypes.map((ct) => ({ crateTypeId: ct.id, crateTypeName: ct.name, quantity: 0 })));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (crateTypeId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEntries((prev) =>
      prev.map((entry) =>
        entry.crateTypeId === crateTypeId ? { ...entry, quantity: Math.max(0, numValue) } : entry
      )
    );
  };

  const handleSave = async () => {
    if (!selectedDepot) return;
    setSaving(true);
    setMessage(null);
    try {
      for (const entry of entries) {
        await supabase.from('daily_closings').upsert(
          {
            depot_id: selectedDepot.id,
            crate_type_id: entry.crateTypeId,
            closing_date: selectedDate,
            quantity: entry.quantity,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'depot_id,crate_type_id,closing_date' }
        );
      }
      setMessage({ type: 'success', text: 'Daily closing saved successfully!' });
      setExistingClosing(true);
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to save.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loading size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Daily Closing</h1>
      {existingClosing && <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4"><CheckCircle className="w-5 h-5 text-blue-600 inline mr-2" />Editing existing entry</div>}
      {message && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{message.text}</div>}
      <Card>
        <Input type="date" label="Date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <Input key={entry.crateTypeId} type="number" label={entry.crateTypeName} value={entry.quantity} onChange={(e) => handleQuantityChange(entry.crateTypeId, e.target.value)} min="0" />
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />Save</Button>
        </div>
      </Card>
    </div>
  );
};
