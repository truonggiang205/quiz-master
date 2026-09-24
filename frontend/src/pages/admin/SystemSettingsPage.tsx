import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useUiStore } from '../../stores/ui.store';
import { Save, ShieldAlert, UserPlus } from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    allowRegistration: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUiStore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await adminService.getSettings();
        if (data) setSettings(data);
      } catch {
        addToast({ type: 'error', title: 'Lỗi tải cấu hình hệ thống' });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.updateSettings(settings);
      addToast({ type: 'success', title: 'Đã lưu cấu hình thành công!' });
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi lưu cấu hình' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500">Đang tải cấu hình...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cấu Hình Hệ Thống</h1>
        <p className="text-sm text-slate-500 mt-1">Điều chỉnh các tham số hoạt động chung của toàn bộ nền tảng.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-8">
        
        {/* Toggle Allow Registration */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cho phép đăng ký mới</h3>
              <p className="text-sm text-slate-500 mt-1">
                Khi tắt, Giáo viên và Học sinh sẽ không thể tạo tài khoản mới từ trang đăng ký.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.allowRegistration}
              onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Toggle Maintenance Mode */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Chế độ Bảo Trì (BETA)</h3>
              <p className="text-sm text-slate-500 mt-1">
                Chặn mọi quyền truy cập vào hệ thống ngoại trừ Admin. (Tính năng này đang là mô phỏng hiển thị)
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer mt-1">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? 'Đang lưu...' : <><Save className="w-4 h-4" /> Lưu cấu hình</>}
        </button>
      </div>
    </div>
  );
};
