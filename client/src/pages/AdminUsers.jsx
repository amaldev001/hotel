import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Table from '../components/common/Table';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Search, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

export const AdminUsers = () => {
  const { user: currentAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Confirm Toggle Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const fetchUsers = (page = 1) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (roleFilter) params.set('role', roleFilter);
    if (activeFilter) params.set('isActive', activeFilter);
    params.set('page', page.toString());
    params.set('limit', '15');

    api
      .get(`/admin/users?${params.toString()}`)
      .then((res) => {
        setUsers(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, totalPages: 1 });
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch users');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, activeFilter]);

  const handleToggleClick = (u) => {
    if (u._id.toString() === currentAdmin._id.toString()) {
      showToast('Cannot deactivate your own admin account', 'error');
      return;
    }
    setTargetUser(u);
    setConfirmModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!targetUser) return;
    try {
      const nextState = !targetUser.isActive;
      await api.patch(`/admin/users/${targetUser._id}/status`, {
        isActive: nextState,
      });
      showToast(
        `User ${targetUser.name} ${nextState ? 'activated' : 'deactivated'} successfully`,
        'success'
      );
      fetchUsers(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update user status', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchUsers(1);
              }}
              placeholder="Search by name, email..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 py-2 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="restaurant">Restaurant Owner</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-3 py-2 text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40" count={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="No user accounts match the selected filters." />
      ) : (
        <>
          <Table headers={['User Info', 'Role', 'Status', 'Actions']}>
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3 sm:px-6">
                  <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email} &bull; {u.phone}</p>
                </td>
                <td className="px-4 py-3 sm:px-6 uppercase font-semibold text-xs text-slate-600 dark:text-slate-300">
                  {u.role}
                </td>
                <td className="px-4 py-3 sm:px-6">
                  <StatusBadge status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                </td>
                <td className="px-4 py-3 sm:px-6">
                  <button
                    onClick={() => handleToggleClick(u)}
                    disabled={u._id.toString() === currentAdmin._id.toString()}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-touch ${
                      u.isActive
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-950/30'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30'
                    }`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => fetchUsers(p)}
          />
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmToggle}
        title={targetUser?.isActive ? 'Deactivate Account?' : 'Activate Account?'}
        message={
          targetUser?.role === 'restaurant' && targetUser?.isActive
            ? `Deactivating restaurant owner "${targetUser?.name}" will automatically suspend their assigned restaurant. Are you sure?`
            : `Are you sure you want to ${targetUser?.isActive ? 'deactivate' : 'activate'} "${targetUser?.name}"?`
        }
        confirmLabel={targetUser?.isActive ? 'Deactivate' : 'Activate'}
        isDanger={targetUser?.isActive}
      />
    </div>
  );
};

export default AdminUsers;
