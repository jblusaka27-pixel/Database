import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Depot, CrateType } from '../types';

interface AppContextType {
  depots: Depot[];
  crateTypes: CrateType[];
  selectedDepot: Depot | null;
  setSelectedDepot: (depot: Depot) => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [crateTypes, setCrateTypes] = useState<CrateType[]>([]);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [depotsRes, crateTypesRes] = await Promise.all([
        supabase.from('depots').select('*').order('name'),
        supabase.from('crate_types').select('*').order('sort_order'),
      ]);

      if (depotsRes.data) {
        setDepots(depotsRes.data);
        if (depotsRes.data.length > 0) {
          setSelectedDepot(depotsRes.data[0]);
        }
      }

      if (crateTypesRes.data) {
        setCrateTypes(crateTypesRes.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        depots,
        crateTypes,
        selectedDepot,
        setSelectedDepot,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
