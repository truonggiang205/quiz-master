import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Download,
  Filter,
  CreditCard,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  X,
  FileSpreadsheet,
  Receipt,
  User,
  BookOpen,
} from 'lucide-react';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import type { TuitionRow, TuitionDetail, TuitionStatus, PaymentMethod } from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useSearchParams } from 'react-router-dom';

export const TeacherTuitionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || 'ALL';

  const [tuitionList, setTuitionList] = useState<TuitionRow[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [selectedTuition, setSelectedTuition] = useState<TuitionDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMethod: 'CASH' as PaymentMethod,
    note: '',
  });

  // Adjustment form state
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'SURCHARGE' as 'SURCHARGE' | 'DISCOUNT',
    amount: 0,
    reason: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load teacher classes
  useEffect(() => {
    ClassroomService.getTeacherClasses()
      .then((data) => setClasses(data))
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Fetch tuition list
  const fetchTuitionList = async () => {
    setLoading(true);
    try {
      const data = await TeachingService.getTuitionList({
        month: selectedMonth,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as TuitionStatus) : undefined,
      });
      setTuitionList(data);
    } catch (err) {
      console.error('Failed to fetch tuition list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTuitionList();
  }, [selectedMonth, selectedClassId, selectedStatus]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const total = tuitionList.reduce((acc, cur) => acc + cur.totalAmount, 0);
    const paid = tuitionList.reduce((acc, cur) => acc + cur.paidAmount, 0);
    const remaining = tuitionList.reduce((acc, cur) => acc + cur.remainingAmount, 0);
    const rate = total > 0 ? Number(((paid / total) * 100).toFixed(1)) : 100;
    return { total, paid, remaining, rate };
  }, [tuitionList]);

  // Open Details Modal
  const handleOpenDetail = async (rowId: string) => {
    try {
      const detail = await TeachingService.getTuitionDetail(rowId);
      setSelectedTuition(detail);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Failed to get tuition detail', err);
    }
  };

  // Open Payment Modal
  const handleOpenPayment = async (row: TuitionRow) => {
    setFormError(null);
    try {
      const detail = await TeachingService.getTuitionDetail(row.id);
      setSelectedTuition(detail);
      setPaymentForm({
        amount: row.remainingAmount,
        paymentDate: new Date().toISOString().substring(0, 10),
        paymentMethod: 'CASH',
        note: '',
      });
      setIsPaymentModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare payment', err);
    }
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTuition) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await TeachingService.recordPayment(selectedTuition.id, paymentForm);
      setIsPaymentModalOpen(false);
      fetchTuitionList();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Adjustment Modal
  const handleOpenAdjustment = async (row: TuitionRow) => {
    setFormError(null);
    try {
      const detail = await TeachingService.getTuitionDetail(row.id);
      setSelectedTuition(detail);
      setAdjustmentForm({
        type: 'SURCHARGE',
        amount: 50000,
        reason: '',
      });
      setIsAdjustmentModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare adjustment', err);
    }
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTuition) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await TeachingService.addAdjustment(selectedTuition.id, adjustmentForm);
      setIsAdjustmentModalOpen(false);
      fetchTuitionList();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi thêm điều chỉnh');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const blob = await TeachingService.exportTuition({
        month: selectedMonth,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as TuitionStatus) : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HocPhi_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export tuition', err);
      alert('Không thể xuất file Excel');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Học Phí</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Học phí được tính toán tự động dựa trên số buổi học, phụ thu, giảm trừ và lịch sử thanh toán
            </p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-emerald-500/20"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Tổng học phí</span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {kpiStats.total.toLocaleString()} đ
            </h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Đã thu</span>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {kpiStats.paid.toLocaleString()} đ
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Còn phải thu</span>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {kpiStats.remaining.toLocaleString()} đ
            </h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Tỷ lệ hoàn thành</span>
            <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {kpiStats.rate}%
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-3">
        {/* Month */}
        <div className="w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Class */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
          >
            <option value="ALL">Tất cả lớp học</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán đủ</option>
          </select>
        </div>
      </div>

      {/* Tuition Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tuitionList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Không có dữ liệu học phí tháng này</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Học phí sẽ tự động phát sinh khi giáo viên tạo buổi học có học phí cho lớp trong tháng {selectedMonth}.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4">STT</th>
                  <th className="py-3.5 px-4">Học Sinh</th>
                  <th className="py-3.5 px-4">Lớp</th>
                  <th className="py-3.5 px-4 text-center">Buổi / Giờ</th>
                  <th className="py-3.5 px-4 text-right">Học Phí Gốc</th>
                  <th className="py-3.5 px-4 text-right">Phụ Thu / Giảm</th>
                  <th className="py-3.5 px-4 text-right">Tổng Cộng</th>
                  <th className="py-3.5 px-4 text-right">Đã Thu</th>
                  <th className="py-3.5 px-4 text-right">Còn Lại</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {tuitionList.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{row.studentName}</div>
                      <div className="text-[11px] text-slate-400">{row.studentEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {row.className}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{row.lessonCount} buổi</span>
                      <span className="text-[11px] text-slate-400 block">({row.totalHours}h)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {row.baseAmount.toLocaleString()} đ
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {row.surcharge > 0 && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          +{row.surcharge.toLocaleString()}
                        </div>
                      )}
                      {row.discount > 0 && (
                        <div className="text-red-500 dark:text-red-400 font-medium text-[11px]">
                          -{row.discount.toLocaleString()}
                        </div>
                      )}
                      {row.surcharge === 0 && row.discount === 0 && (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {row.totalAmount.toLocaleString()} đ
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.paidAmount.toLocaleString()} đ
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                      {row.remainingAmount.toLocaleString()} đ
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          row.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : row.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                        }`}
                      >
                        {row.status === 'PAID'
                          ? 'Đã thu đủ'
                          : row.status === 'PARTIALLY_PAID'
                          ? 'Thu 1 phần'
                          : 'Chưa thu'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.remainingAmount > 0 && (
                          <button
                            onClick={() => handleOpenPayment(row)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 font-semibold text-[11px] transition-colors"
                            title="Ghi nhận thanh toán"
                          >
                            Thu tiền
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenAdjustment(row)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Thêm phụ thu / giảm trừ"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(row.id)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="Xem chi tiết & lịch sử thanh toán"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedTuition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Ghi Nhận Thanh Toán</h3>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1">
                <div>
                  <span className="text-slate-400">Học sinh:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTuition.student?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Lớp học:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTuition.class?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Số tiền còn lại:</span>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {Number(selectedTuition.remainingAmount).toLocaleString()} đ
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tiền thanh toán (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max={Number(selectedTuition.remainingAmount)}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ngày nộp
                    </label>
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Hình thức
                    </label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    >
                      <option value="CASH">Tiền mặt</option>
                      <option value="BANK_TRANSFER">Chuyển khoản</option>
                      <option value="MOMO">Ví MoMo</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    placeholder="VD: Phụ huynh chuyển khoản qua Vietcombank"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Xác Nhận Nộp Tiền'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADJUSTMENT MODAL */}
      <AnimatePresence>
        {isAdjustmentModalOpen && selectedTuition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Thêm Phụ Thu / Giảm Trừ</h3>
                <button
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAdjustment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại điều chỉnh
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentForm({ ...adjustmentForm, type: 'SURCHARGE' })}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                        adjustmentForm.type === 'SURCHARGE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      + Phụ thu thêm
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentForm({ ...adjustmentForm, type: 'DISCOUNT' })}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                        adjustmentForm.type === 'DISCOUNT'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      - Giảm trừ học phí
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số tiền điều chỉnh (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lý do điều chỉnh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                    placeholder="VD: Phụ thu tiền photo tài liệu / Học bổng khuyến khích"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAdjustmentModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu Điều Chỉnh'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL & PAYMENT HISTORY MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedTuition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Lịch Sử & Chi Tiết Học Phí</h3>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student & Class Info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs space-y-1">
                <div>
                  <span className="text-slate-400">Học sinh:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTuition.student?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Lớp:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTuition.class?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Tổng học phí:</span>{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Number(selectedTuition.totalAmount).toLocaleString()} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Đã thanh toán:</span>{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {Number(selectedTuition.paidAmount).toLocaleString()} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Còn lại:</span>{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {Number(selectedTuition.remainingAmount).toLocaleString()} đ
                  </span>
                </div>
              </div>

              {/* Payments History List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Lịch Sử Các Đợt Thanh Toán ({selectedTuition.payments?.length || 0})
                </h4>
                {selectedTuition.payments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có giao dịch thanh toán nào</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTuition.payments?.map((pay) => (
                      <div
                        key={pay.id}
                        className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-emerald-700 dark:text-emerald-400">
                            +{Number(pay.amount).toLocaleString()} đ
                          </div>
                          <div className="text-[10px] text-slate-400">{pay.paymentDate} • {pay.paymentMethod}</div>
                          {pay.note && <div className="text-[10px] text-slate-500 italic mt-0.5">{pay.note}</div>}
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Adjustments List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Các Khoản Điều Chỉnh ({selectedTuition.adjustments?.length || 0})
                </h4>
                {selectedTuition.adjustments?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có phụ thu hay giảm trừ nào</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTuition.adjustments?.map((adj) => (
                      <div
                        key={adj.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          adj.type === 'SURCHARGE'
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30'
                            : 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30'
                        }`}
                      >
                        <div>
                          <span className={`font-bold ${adj.type === 'SURCHARGE' ? 'text-blue-600' : 'text-red-500'}`}>
                            {adj.type === 'SURCHARGE' ? '+' : '-'}{Number(adj.amount).toLocaleString()} đ
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{adj.reason}</p>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {adj.type === 'SURCHARGE' ? 'Phụ thu' : 'Giảm trừ'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
