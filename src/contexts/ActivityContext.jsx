import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const ActivityContext = createContext(null);

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    console.log('ActivityContext: Fetching activities...');
    setLoading(true);
    try {
      // Fetch activities with attendance count
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          activity_attendance(count)
        `)
        .order('activity_date', { ascending: false });
      
      if (error) throw error;
      
      // Map database fields to frontend expected format
      const mappedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        date: item.activity_date,
        startTime: item.start_time,
        endTime: item.end_time,
        location: item.location,
        attendees: item.activity_attendance?.[0]?.count || 0,
        createdAt: item.created_at
      }));
      
      setActivities(mappedData);
      console.log('ActivityContext: Activities loaded:', mappedData.length);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendance = useCallback(async (activityId) => {
    try {
      const { data, error } = await supabase
        .from('activity_attendance')
        .select(`
          *,
          employees(first_name, last_name, employee_code, departments(name))
        `)
        .eq('activity_id', activityId)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    
    // Try realtime subscription
    try {
      const activitySub = supabase
        .channel('activities_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => {
          console.log('Realtime: activities changed, refetching...');
          fetchActivities();
        })
        .subscribe();

      const attendanceSub = supabase
        .channel('attendance_channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_attendance' }, () => {
          console.log('Realtime: attendance changed, refetching...');
          fetchActivities();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(activitySub);
        supabase.removeChannel(attendanceSub);
      };
    } catch (err) {
      console.log('Realtime not available:', err);
    }
  }, [fetchActivities]);

  const addActivity = async (activity) => {
    try {
      const dbActivity = {
        name: activity.name,
        description: activity.description,
        activity_date: activity.date,
        start_time: activity.startTime,
        end_time: activity.endTime,
        location: activity.location
      };

      const { data, error } = await supabase
        .from('activities')
        .insert([dbActivity])
        .select();

      if (error) throw error;
      await fetchActivities();
      return { success: true, data };
    } catch (error) {
      console.error('Error adding activity:', error);
      return { success: false, error };
    }
  };

  const updateActivity = async (id, activity) => {
    try {
      const dbActivity = {
        name: activity.name,
        description: activity.description,
        activity_date: activity.date,
        start_time: activity.startTime,
        end_time: activity.endTime,
        location: activity.location
      };

      const { error } = await supabase
        .from('activities')
        .update(dbActivity)
        .eq('id', id);

      if (error) throw error;
      await fetchActivities();
      return { success: true };
    } catch (error) {
      console.error('Error updating activity:', error);
      return { success: false, error };
    }
  };

  const deleteActivity = async (id) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchActivities();
      return { success: true };
    } catch (error) {
      console.error('Error deleting activity:', error);
      return { success: false, error };
    }
  };

  // Record employee attendance for an activity
  const recordAttendance = async (activityId, employeeId, method = 'QR') => {
    try {
      console.log('Recording attendance:', { activityId, employeeId, method });
      
      const { data, error } = await supabase
        .from('activity_attendance')
        .insert([{
          activity_id: activityId,
          employee_id: employeeId,
          check_in_method: method
        }])
        .select();

      if (error) {
        // Check if already checked in (duplicate key error)
        if (error.code === '23505') {
          return { success: false, error: 'พนักงานนี้เช็คอินแล้ว', alreadyCheckedIn: true };
        }
        throw error;
      }

      await fetchActivities(); // Refresh to update count
      console.log('Attendance recorded successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error recording attendance:', error);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาด' };
    }
  };

  // Check if employee already checked in
  const checkIfAttended = async (activityId, employeeId) => {
    try {
      const { data, error } = await supabase
        .from('activity_attendance')
        .select('id')
        .eq('activity_id', activityId)
        .eq('employee_id', employeeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      return !!data;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  };

  return (
    <ActivityContext.Provider value={{
      activities,
      loading,
      addActivity,
      updateActivity,
      deleteActivity,
      recordAttendance,
      checkIfAttended,
      fetchAttendance,
      refetch: fetchActivities
    }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider');
  }
  return context;
}
