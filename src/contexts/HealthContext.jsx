import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const HealthContext = createContext(null);

export function HealthProvider({ children }) {
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHealthRecords = useCallback(async () => {
    console.log('HealthContext: Fetching health records...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_code,
            departments (name)
          )
        `)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      setHealthRecords(data || []);
      console.log('HealthContext: Records loaded:', (data || []).length);
    } catch (error) {
      console.error('Error fetching health records:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchHealthRecords();
    }

    // Try realtime subscription
    try {
      const subscription = supabase
        .channel('health_records_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'health_records' }, () => {
          console.log('Realtime: health_records changed, refetching...');
          fetchHealthRecords();
        })
        .subscribe((status) => {
          console.log('Health records realtime subscription:', status);
        });

      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (err) {
      console.log('Health realtime not available:', err);
    }
  }, [user, fetchHealthRecords]);

  const addHealthRecord = async (record) => {
    try {
      // Create timestamp from recordDate or use current time
      const recordedAt = record.recordDate 
        ? new Date(record.recordDate + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()
        : new Date().toISOString();
      
      const dbRecord = {
        employee_id: record.employeeId,
        blood_pressure_systolic: record.bpSystolic,
        blood_pressure_diastolic: record.bpDiastolic,
        heart_rate: record.heartRate,
        blood_sugar: record.bloodSugar || null,
        weight: record.weight,
        height: record.height,
        notes: record.notes || null,
        recorded_at: recordedAt
      };

      const { data, error } = await supabase
        .from('health_records')
        .insert([dbRecord])
        .select();

      if (error) throw error;
      await fetchHealthRecords(); // Refetch after success
      return { success: true, data };
    } catch (error) {
      console.error('Error adding health record:', error);
      return { success: false, error };
    }
  };

  const updateHealthRecord = async (id, record) => {
    try {
      const dbRecord = {
        employee_id: record.employeeId,
        blood_pressure_systolic: record.bpSystolic,
        blood_pressure_diastolic: record.bpDiastolic,
        heart_rate: record.heartRate,
        blood_sugar: record.bloodSugar,
        weight: record.weight,
        height: record.height,
        notes: record.notes
      };

      const { error } = await supabase
        .from('health_records')
        .update(dbRecord)
        .eq('id', id);

      if (error) throw error;
      await fetchHealthRecords(); // Refetch after success
      return { success: true };
    } catch (error) {
      console.error('Error updating health record:', error);
      return { success: false, error };
    }
  };

  const deleteHealthRecord = async (id) => {
    try {
      const { error } = await supabase
        .from('health_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchHealthRecords(); // Refetch after success
      return { success: true };
    } catch (error) {
      console.error('Error deleting health record:', error);
      return { success: false, error };
    }
  };

  return (
    <HealthContext.Provider value={{
      healthRecords,
      loading,
      addHealthRecord,
      updateHealthRecord,
      deleteHealthRecord,
      refetch: fetchHealthRecords
    }}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within HealthProvider');
  }
  return context;
}
