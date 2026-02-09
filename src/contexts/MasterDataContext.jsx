import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const MasterDataContext = createContext(null);

export function MasterDataProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    console.log('MasterData: Fetching all data...');
    setLoading(true);
    try {
      const [branchesRes, departmentsRes, positionsRes, employeesRes] = await Promise.all([
        supabase.from('branches').select('*').order('name'),
        supabase.from('departments').select('*, branches(name)').order('name'),
        supabase.from('positions').select('*').order('level'),
        supabase.from('employees').select('*, branches(name), departments(name), positions(name)').order('first_name')
      ]);

      setBranches(branchesRes.data || []);
      setDepartments(departmentsRes.data || []);
      setPositions(positionsRes.data || []);
      setEmployees(employeesRes.data || []);
      console.log('MasterData: Data loaded successfully');
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Try to set up realtime subscriptions (may fail if not enabled)
    try {
      const channels = ['branches', 'departments', 'positions', 'employees'].map(table => {
        return supabase
          .channel(`${table}_channel`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            console.log(`Realtime: ${table} changed, refetching...`);
            fetchData();
          })
          .subscribe((status) => {
            console.log(`Realtime subscription ${table}:`, status);
          });
      });

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    } catch (err) {
      console.log('Realtime subscriptions not available:', err);
    }
  }, [fetchData]);

  // CRUD Functions with manual refetch after success

  const addBranch = async (name, address, phone) => {
    const { error } = await supabase.from('branches').insert([{ name, address, phone }]);
    if (!error) {
      await fetchData(); // Refetch after success
    }
    return { success: !error, error };
  };

  const updateBranch = async (id, name, address, phone) => {
    const { error } = await supabase.from('branches').update({ name, address, phone }).eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const deleteBranch = async (id) => {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const addDepartment = async (name, branchId) => {
    const { error } = await supabase.from('departments').insert([{ name, branch_id: branchId }]);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const updateDepartment = async (id, name, branchId) => {
    const { error } = await supabase.from('departments').update({ name, branch_id: branchId }).eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const deleteDepartment = async (id) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const addPosition = async (name, level) => {
    const { error } = await supabase.from('positions').insert([{ name, level }]);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const updatePosition = async (id, name, level) => {
    const { error } = await supabase.from('positions').update({ name, level }).eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const deletePosition = async (id) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const addEmployee = async (employeeData) => {
    const dbData = {
      employee_code: employeeData.code,
      first_name: employeeData.firstName,
      last_name: employeeData.lastName,
      email: employeeData.email,
      phone: employeeData.phone,
      branch_id: employeeData.branchId,
      department_id: employeeData.departmentId,
      position_id: employeeData.positionId,
      photo_url: employeeData.photo || null
    };
    const { error } = await supabase.from('employees').insert([dbData]);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const updateEmployee = async (id, employeeData) => {
    const dbData = {
      employee_code: employeeData.code,
      first_name: employeeData.firstName,
      last_name: employeeData.lastName,
      email: employeeData.email,
      phone: employeeData.phone,
      branch_id: employeeData.branchId,
      department_id: employeeData.departmentId,
      position_id: employeeData.positionId,
      photo_url: employeeData.photo || null
    };
    const { error } = await supabase.from('employees').update(dbData).eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  const deleteEmployee = async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (!error) {
      await fetchData();
    }
    return { success: !error, error };
  };

  return (
    <MasterDataContext.Provider value={{
      branches, departments, positions, employees, loading, refetch: fetchData,
      addBranch, updateBranch, deleteBranch,
      addDepartment, updateDepartment, deleteDepartment,
      addPosition, updatePosition, deletePosition,
      addEmployee, updateEmployee, deleteEmployee
    }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within MasterDataProvider');
  }
  return context;
}
