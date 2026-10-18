import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { User } from '../../types/user';
import { useUiStore } from '../../stores/ui.store';
import { Badge } from '../../components/common/Badge';
import { Search, Lock, Unlock, KeyRound } from 'lucide-react';
import { formatUserName } from '../../utils/user.utils';
import { UserAvatar } from '../../components/common/UserAvatar';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const { addToast, confirm } = useUiStore();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers(roleFilter, searchTerm);
      setUsers(data);
    } catch {
      addToast({ type: 'error', title: 'Lỗi tải danh sách người dùng' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // debounce search
    const delay = setTimeout(() => {
      loadUsers();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchTerm, roleFilter]);

  const handleToggleStatus = async (id: string, currentStatus: boolean, role: string) => {
    if (role === 'ADMIN') {
      addToast({ type: 'error', title: 'Không thể khóa Admin' });
      return;
    }
    const action = currentStatus ? 'Khóa' : 'Mở khóa';
    const confirmed = await confirm({
      title: `${action} tài khoản`,
      description: `Bạn có chắc muốn ${action} tài khoản này?`,
      variant: currentStatus ? 'danger' : 'success',
      confirmText: action
    });
    if (!confirmed) return;

    try {
      await adminService.toggleUserStatus(id);
      addToast({ type: 'success', title: `Đã ${action} tài khoản thành công` });
      loadUsers();
    } catch {
      addToast({ type: 'error', title: `Lỗi khi ${action} tài khoản` });
    }
  };

  const handleResetPassword = async (id: string, role: string) => {
    if (role === 'ADMIN') {
      addToast({ type: 'error', title: 'Không thể reset mật khẩu Admin' });
      return;
    }
    const newPass = window.prompt('Nhập mật khẩu mới (để trống sẽ mặc định là 123456):', '123456');
    if (newPass === null) return; // Cancelled

    try {
      await adminService.resetUserPassword(id, newPass);
      addToast({ type: 'success', title: 'Đã đặt lại mật khẩu thành công' });
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi đặt lại mật khẩu' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản Lý Người Dùng</h1>
        <p className="text-sm text-slate-500 mt-1">Danh sách tất cả giáo viên và học sinh trên hệ thống.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Tất cả vai trò</option>
          <option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày đăng ký</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Không tìm thấy người dùng nào.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{formatUserName(u)}</span>
                          <span className="text-xs text-slate-500">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === 'TEACHER' ? 'lavender' : u.role === 'ADMIN' ? 'rose' : 'sky'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold">
                          <Unlock className="w-3 h-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md text-xs font-semibold">
                          <Lock className="w-3 h-3" /> Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(u.createdAt!).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleResetPassword(u.id, u.role)}
                        disabled={u.role === 'ADMIN'}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u.id, u.isActive !== false, u.role)}
                        disabled={u.role === 'ADMIN'}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          u.isActive !== false
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title={u.isActive !== false ? 'Khóa tài khoản' : 'Mở khóa'}
                      >
                        {u.isActive !== false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
