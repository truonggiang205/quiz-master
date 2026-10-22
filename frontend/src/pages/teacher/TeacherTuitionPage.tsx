import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Minus,
  X,
  FileSpreadsheet,
  Receipt,
  User,
  Users,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Printer,
  QrCode,
  Edit3,
  Trash2,
  Building2,
  Sparkles,
  CheckCheck,
  Search,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import { Modal } from '../../components/common/Modal';
import { TuitionReceiptBuilderModal } from '../../components/teacher/tuition-receipt';
import { UserAvatar } from '../../components/common/UserAvatar';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { withNotification } from '../../utils/notification.util';
import type {
  TuitionRow,
  TuitionDetail,
  TuitionStatus,
  PaymentMethod,
  TeacherBankInfo,
} from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useSearchParams, useNavigate } from 'react-router-dom';

const POPULAR_BANKS = [
  { code: 'MB', name: 'MBBank (Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'TIMO', name: 'Timo' },
];

export const TeacherTuitionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || 'ALL';
  const { user } = useAuthStore();
  const { addToast } = useUiStore();

  const [tuitionList, setTuitionList] = useState<TuitionRow[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Month navigation: default to current year-month
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Accordion state: set of expanded class IDs
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());

  // Trend toggle
  const [showTrend, setShowTrend] = useState<boolean>(true);

  // Status dropdown toggle: active tuition ID
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);

  const classMap = useMemo(() => {
    const map = new Map<string, Classroom>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const isClassOneOnOne = (className?: string, classId?: string): boolean => {
    if (classId) {
      const cls = classMap.get(classId);
      if (cls?.isPrivate !== undefined) return cls.isPrivate;
    }
    if (!className) return false;
    const lower = className.toLowerCase();
    return lower.includes('kèm 1-1') || lower.includes('kèm 1:1') || lower.includes('1-1') || lower.includes('1:1');
  };

  // Teacher Bank Info (persisted in localStorage)
  const [bankInfo, setBankInfo] = useState<TeacherBankInfo>(() => {
    try {
      const saved = localStorage.getItem('quizmaster_teacher_bank_info');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      bankName: 'MBBank',
      bankCode: 'MB',
      accountNumber: '713072005',
      accountHolder: user?.name || 'GIAO VIEN',
    };
  });
  const [isBankSetupOpen, setIsBankSetupOpen] = useState(false);

  // Modals state
  const [selectedTuition, setSelectedTuition] = useState<TuitionDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Invoice Receipt Modal State
  const [invoiceStudent, setInvoiceStudent] = useState<TuitionRow | null>(null);

  // Single payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMethod: 'CASH' as PaymentMethod,
    note: '',
  });

  // Adjustment form state
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'SURCHARGE' as 'SURCHARGE' | 'DISCOUNT',
    mode: 'FIXED' as 'FIXED' | 'PERCENT',
    amount: 50000,
    percent: 10,
    reason: '',
    selectedTuitionIds: [] as string[],
  });

  // Bulk Payment state
  const [bulkPaymentSelectedIds, setBulkPaymentSelectedIds] = useState<string[]>([]);
  const [bulkPaymentDate, setBulkPaymentDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [bulkPaymentNote, setBulkPaymentNote] = useState<string>('Thanh toán hàng loạt');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Save bank info to localStorage
  const handleSaveBankInfo = (info: TeacherBankInfo) => {
    setBankInfo(info);
    try {
      localStorage.setItem('quizmaster_teacher_bank_info', JSON.stringify(info));
      addToast({ type: 'success', title: 'Đã lưu thông tin tài khoản ngân hàng' });
    } catch {
      // ignore
    }
    setIsBankSetupOpen(false);
  };

  // Load teacher classes
  useEffect(() => {
    ClassroomService.getTeacherClasses()
      .then((data) => setClasses(data))
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Fetch tuition list
  const fetchTuitionList = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await TeachingService.getTuitionList({
        month: selectedMonth,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        status: selectedStatus !== 'ALL' ? (selectedStatus as TuitionStatus) : undefined,
      });
      setTuitionList(data);

      // By default expand all unique class IDs found in the list
      const allClassIds = new Set(data.map((r) => r.classId));
      setExpandedClassIds(allClassIds);
    } catch (err) {
      console.error('Failed to fetch tuition list', err);
      setFetchError('Không thể tải dữ liệu học phí. Vui lòng thử lại sau.');
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

  // Group tuition rows by class
  const groupedTuition = useMemo(() => {
    const map = new Map<string, { className: string; rows: TuitionRow[] }>();
    for (const row of tuitionList) {
      if (!map.has(row.classId)) {
        map.set(row.classId, { className: row.className || 'Chưa phân lớp', rows: [] });
      }
      map.get(row.classId)!.rows.push(row);
    }
    return Array.from(map.entries()).map(([classId, data]) => ({
      classId,
      className: data.className,
      rows: data.rows,
    }));
  }, [tuitionList]);

  // Month navigation helpers
  const handleShiftMonth = (offset: number) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + offset;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    const newMonth = `${year}-${String(month).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const formattedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    return `Tháng ${parseInt(month, 10)}/${year}`;
  }, [selectedMonth]);

  const dateRangeDisplay = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    return `01/${month}/${year} - ${daysInMonth}/${month}/${year}`;
  }, [selectedMonth]);

  // Real Trend Data loaded from database
  const [trendData, setTrendData] = useState<
    { month: string; label: string; total: number; paid: number; unpaid: number }[]
  >([]);

  useEffect(() => {
    TeachingService.getTuitionTrend({ month: selectedMonth })
      .then((data) => setTrendData(data))
      .catch((err) => console.error('Failed to load real tuition trend', err));
  }, [selectedMonth, tuitionList]);

  const monthDiffText = useMemo(() => {
    if (trendData.length < 2) return 'Ổn định so với tháng trước';
    const prev = trendData[trendData.length - 2]?.total || 0;
    const curr = trendData[trendData.length - 1]?.total || 0;
    const diff = curr - prev;
    if (prev === 0 && curr > 0) return `Tăng ${curr.toLocaleString()} đ so với tháng trước`;
    if (diff > 0) return `Tăng ${diff.toLocaleString()} đ so với tháng trước`;
    if (diff < 0) return `Giảm ${Math.abs(diff).toLocaleString()} đ so với tháng trước`;
    return 'Ổn định so với tháng trước';
  }, [trendData]);


  // Toggle class accordion
  const toggleClassExpansion = (classId: string) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  // Quick Status update directly from dropdown
  const handleQuickStatusChange = async (tuitionId: string, status: TuitionStatus) => {
    setActiveStatusDropdownId(null);
    try {
      await withNotification(
        {
          actionKey: `tuition-status-${tuitionId}`,
          loadingTitle: 'Đang cập nhật trạng thái...',
          successTitle: 'Cập nhật trạng thái thành công',
          errorTitle: 'Không thể cập nhật trạng thái',
        },
        async () => {
          await TeachingService.updateTuitionStatus(tuitionId, status);
          await fetchTuitionList();
        }
      );
    } catch (err: any) {
      // Error handled by withNotification
    }
  };

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
    setActiveStatusDropdownId(null);
    setFormError(null);
    try {
      const detail = await TeachingService.getTuitionDetail(row.id);
      setSelectedTuition(detail);
      setPaymentForm({
        amount: row.remainingAmount > 0 ? row.remainingAmount : row.totalAmount,
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
    if (!selectedTuition || submitting) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await withNotification(
        {
          actionKey: `tuition-payment-${selectedTuition.id}`,
          loadingTitle: 'Đang ghi nhận thanh toán...',
          loadingMessage: 'Hệ thống đang xử lý giao dịch, vui lòng chờ trong giây lát',
          successTitle: 'Ghi nhận thanh toán thành công',
          errorTitle: 'Không thể ghi nhận thanh toán',
        },
        async () => {
          await TeachingService.recordPayment(selectedTuition.id, paymentForm);
          setIsPaymentModalOpen(false);
          await fetchTuitionList();
        }
      );
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Adjustment Modal from toolbar
  const handleOpenAdjustmentFromToolbar = (type: 'SURCHARGE' | 'DISCOUNT') => {
    setAdjustmentForm({
      type,
      mode: 'FIXED',
      amount: type === 'SURCHARGE' ? 50000 : 100000,
      percent: 10,
      reason: '',
      selectedTuitionIds: tuitionList.map((r) => r.id),
    });
    setIsAdjustmentModalOpen(true);
  };

  // Open Adjustment Modal for single student
  const handleOpenSingleAdjustment = (row: TuitionRow) => {
    setAdjustmentForm({
      type: 'SURCHARGE',
      mode: 'FIXED',
      amount: 50000,
      percent: 10,
      reason: '',
      selectedTuitionIds: [row.id],
    });
    setIsAdjustmentModalOpen(true);
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (adjustmentForm.selectedTuitionIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất một học sinh');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      await withNotification(
        {
          actionKey: 'tuition-adjustment-submit',
          loadingTitle: 'Đang lưu điều chỉnh học phí...',
          loadingMessage: 'Vui lòng chờ trong giây lát',
          successTitle: 'Đã áp dụng điều chỉnh học phí thành công',
          errorTitle: 'Có lỗi xảy ra khi lưu điều chỉnh',
        },
        async () => {
          await TeachingService.bulkAdjustment({
            tuitionIds: adjustmentForm.selectedTuitionIds,
            type: adjustmentForm.type,
            amount: adjustmentForm.amount,
            reason: adjustmentForm.reason || (adjustmentForm.type === 'SURCHARGE' ? 'Phụ thu' : 'Giảm trừ'),
          });
          setIsAdjustmentModalOpen(false);
          await fetchTuitionList();
        }
      );
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu điều chỉnh');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Adjustment
  const handleDeleteAdjustment = async (adjustmentId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa khoản điều chỉnh này không?')) return;
    try {
      await withNotification(
        {
          actionKey: `tuition-delete-adjustment-${adjustmentId}`,
          loadingTitle: 'Đang xóa khoản điều chỉnh...',
          successTitle: 'Đã xóa khoản điều chỉnh',
          errorTitle: 'Không thể xóa khoản điều chỉnh',
        },
        async () => {
          await TeachingService.deleteAdjustment(adjustmentId);
          if (selectedTuition) {
            const updated = await TeachingService.getTuitionDetail(selectedTuition.id);
            setSelectedTuition(updated);
          }
          await fetchTuitionList();
        }
      );
    } catch (err) {
      // Error handled by withNotification
    }
  };

  // Open Bulk Payment Modal
  const handleOpenBulkPayment = () => {
    const unpaidRows = tuitionList.filter((r) => r.remainingAmount > 0);
    setBulkPaymentSelectedIds(unpaidRows.map((r) => r.id));
    setBulkPaymentDate(new Date().toISOString().substring(0, 10));
    setBulkPaymentMethod('BANK_TRANSFER');
    setBulkPaymentNote('Thanh toán hàng loạt');
    setIsBulkPaymentModalOpen(true);
  };

  // Submit Bulk Payment
  const handleSubmitBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (bulkPaymentSelectedIds.length === 0) {
      setFormError('Vui lòng chọn ít nhất một học sinh');
      return;
    }
    setSubmitting(true);
    try {
      await withNotification(
        {
          actionKey: 'tuition-bulk-payment-submit',
          loadingTitle: 'Đang ghi nhận thanh toán hàng loạt...',
          loadingMessage: `Đang xử lý ${bulkPaymentSelectedIds.length} học sinh, vui lòng chờ trong giây lát`,
          successTitle: 'Đã ghi nhận thanh toán hàng loạt thành công',
          errorTitle: 'Có lỗi xảy ra khi ghi nhận thanh toán hàng loạt',
        },
        async () => {
          await TeachingService.bulkPayment({
            tuitionIds: bulkPaymentSelectedIds,
            paymentDate: bulkPaymentDate,
            paymentMethod: bulkPaymentMethod,
            note: bulkPaymentNote,
          });
          setIsBulkPaymentModalOpen(false);
          await fetchTuitionList();
        }
      );
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi ghi nhận thanh toán hàng loạt');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receipt Modal
  const handleOpenReceiptModal = (row: TuitionRow) => {
    setInvoiceStudent(row);
    setIsInvoiceModalOpen(true);
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      await withNotification(
        {
          actionKey: `tuition-export-excel-${selectedMonth}`,
          loadingTitle: 'Đang xuất file Excel...',
          loadingMessage: 'Hệ thống đang tổng hợp dữ liệu học phí, vui lòng chờ trong giây lát',
          successTitle: 'Xuất file Excel thành công!',
          errorTitle: 'Không thể xuất file Excel',
        },
        async () => {
          const blob = await TeachingService.exportTuition({
            month: selectedMonth,
            classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
            status: selectedStatus !== 'ALL' ? (selectedStatus as TuitionStatus) : undefined,
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `BaoCao_HocPhi_${selectedMonth}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      );
    } catch (err) {
      console.error('Failed to export tuition', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* ==================== 1. TOP HEADER & MONTH NAVIGATOR ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 font-bold">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Học Phí
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Xem thông tin và theo dõi ghi nhận học phí của tất cả học sinh
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector Pill */}
        <div className="flex items-center gap-1 self-start md:self-auto bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs">
          <button
            onClick={() => handleShiftMonth(-1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 py-1 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{formattedMonthLabel}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="opacity-0 absolute w-6 cursor-pointer"
              title="Chọn tháng"
            />
          </div>
          <button
            onClick={() => handleShiftMonth(1)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            title="Tháng tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ==================== 2. TOP 3 KPI CARDS ==================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: ĐÃ XÁC NHẬN THU (Emerald / Green) */}
        <div className="bg-[#ECFDF5] dark:bg-emerald-950/20 rounded-2xl p-5 sm:p-6 border border-[#A7F3D0] dark:border-emerald-800/50 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#047857] dark:text-emerald-400 tracking-wider uppercase">
              <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-emerald-400" />
              <span>ĐÃ XÁC NHẬN THU</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#047857] dark:text-emerald-300 mt-2 tracking-tight">
              {kpiStats.paid.toLocaleString('vi-VN')} đ
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/40 text-[#059669] dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: CÒN PHẢI THU (Soft Rose) */}
        <div className="bg-[#FFF1F2] dark:bg-rose-950/20 rounded-2xl p-5 sm:p-6 border border-[#FECDD3] dark:border-rose-800/50 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#BE123C] dark:text-rose-400 tracking-wider uppercase">
              <Clock className="w-4 h-4 text-[#DC2626] dark:text-rose-400" />
              <span>CÒN PHẢI THU</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#BE123C] dark:text-rose-300 mt-2 tracking-tight">
              {kpiStats.remaining.toLocaleString('vi-VN')} đ
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100/70 dark:bg-rose-900/40 text-[#DC2626] dark:text-rose-300 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: TỔNG HỌC PHÍ (Soft Indigo - NO Black/Navy) */}
        <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] dark:from-indigo-950/30 dark:to-purple-950/20 rounded-2xl p-5 sm:p-6 border border-[#C7D2FE] dark:border-indigo-800/50 shadow-xs flex items-center justify-between transition-all hover:shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4338CA] dark:text-indigo-300 tracking-wider uppercase">
              <DollarSign className="w-4 h-4 text-[#4F46E5] dark:text-indigo-400" />
              <span>TỔNG HỌC PHÍ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#312E81] dark:text-indigo-200 mt-2 tracking-tight">
              {kpiStats.total.toLocaleString('vi-VN')} đ
            </h2>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#E0E7FF] dark:bg-indigo-900/40 text-[#4F46E5] dark:text-indigo-300 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ==================== 3. MONTHLY TREND BANNER ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div
          onClick={() => setShowTrend(!showTrend)}
          className="p-4 sm:px-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              Biến động theo tháng
            </span>
            <span className="text-xs text-slate-400 font-normal">
              (6 tháng gần nhất)
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              {monthDiffText}
            </span>
          </div>

          <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
            {showTrend ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Trend Area Chart (Collapsible) */}
        <AnimatePresence>
          {showTrend && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800"
            >
              <div className="h-44 w-full">
                {trendData.length === 0 || trendData.every((m) => m.total === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Chưa có học phí phát sinh trong các tháng này.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="#94A3B8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${Number(val).toLocaleString()} đ`, 'Học phí']}
                        labelFormatter={(label) => `Tháng: ${label}`}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E8EDF5',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
                          color: '#0F172A',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#4F46E5">
                        {trendData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === trendData.length - 1 ? '#4F46E5' : '#C7D2FE'}
                            className="transition-colors hover:opacity-90"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================== 4. CONTROLS & ACTION TOOLBAR ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Date Range Navigation */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>&lt; {dateRangeDisplay} &gt;</span>
        </div>

        {/* Quick Actions Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Phụ thu */}
          <button
            onClick={() => handleOpenAdjustmentFromToolbar('SURCHARGE')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4338CA] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Phụ thu</span>
          </button>

          {/* Giảm học phí */}
          <button
            onClick={() => handleOpenAdjustmentFromToolbar('DISCOUNT')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 transition-colors shadow-2xs"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Giảm học phí</span>
          </button>

          {/* Thanh toán hàng loạt */}
          <button
            onClick={handleOpenBulkPayment}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#047857] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 transition-colors shadow-2xs"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Thanh toán hàng loạt</span>
          </button>

          {/* Cấu hình STK ngân hàng */}
          <button
            onClick={() => setIsBankSetupOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-[#F8FAFC] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 transition-colors shadow-2xs"
            title="Cài đặt thông tin tài khoản ngân hàng & QR"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>STK Ngân hàng</span>
          </button>

          {/* Xuất Báo Cáo Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* ==================== 5. CLASS FILTER PILL TABS ==================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedClassId('ALL')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
            selectedClassId === 'ALL'
              ? 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] font-bold dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
              : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
          }`}
        >
          Tất cả lớp ({tuitionList.length})
        </button>

        {classes.map((cls) => {
          const count = tuitionList.filter((r) => r.classId === cls.id).length;
          const isSelected = selectedClassId === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-2xs ${
                isSelected
                  ? 'bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] font-bold dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {cls.name} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* ==================== 6. ACCORDION TUITION TABLE ==================== */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-3xl p-8 text-center border border-rose-200/80 dark:border-rose-800/50 shadow-xs">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
            {fetchError}
          </h3>
          <p className="text-xs text-rose-600/80 dark:text-rose-400 mt-1 max-w-sm mx-auto">
            Hệ thống không thể tải bảng tổng hợp học phí. Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
          <button
            onClick={() => fetchTuitionList()}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Thử lại
          </button>
        </div>
      ) : tuitionList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Chưa phát sinh học phí trong khoảng thời gian này
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Học phí được tính toán tự động từ các buổi học hợp lệ trên Lịch dạy trong {formattedMonthLabel}.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-slate-800/50 text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider border-b border-[#E8EDF5] dark:border-slate-800 whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">STT</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">HỌC SINH</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">LỚP</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">SỐ BUỔI</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">SỐ GIỜ</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">TỔNG</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">ĐÃ XÁC NHẬN THU</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">CÒN LẠI</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">TRẠNG THÁI</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {groupedTuition.map((group) => {
                  const isExpanded = expandedClassIds.has(group.classId);
                  return (
                    <React.Fragment key={group.classId}>
                      {/* Accordion Class Group Header */}
                      <tr
                        onClick={() => toggleClassExpansion(group.classId)}
                        className="bg-[#F8FAFC] dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 cursor-pointer transition-colors border-y border-[#E8EDF5] dark:border-slate-800 font-semibold"
                      >
                        <td colSpan={10} className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 uppercase tracking-wider text-xs font-bold">
                              <span>{group.className}</span>
                              <span className="text-[11px] text-[#64748B] font-normal lowercase">
                                ({group.rows.length} học sinh)
                              </span>
                            </div>
                            <span className="text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Student Rows in this Class */}
                      {isExpanded &&
                        group.rows.map((row, idx) => {
                          const isDropdownOpen = activeStatusDropdownId === row.id;
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30 transition-colors border-b border-[#F1F5F9] dark:border-slate-800/60"
                            >
                              {/* STT */}
                              <td className="py-3.5 px-4 text-center font-medium text-[#94A3B8]">
                                {idx + 1}
                              </td>

                              {/* Student Name & Avatar */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <UserAvatar
                                    user={{
                                      name: row.studentName,
                                      avatar: row.studentAvatar,
                                    }}
                                    name={row.studentName}
                                    size="sm"
                                  />
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                      {row.studentName}
                                    </div>
                                    <div className="text-[11px] text-[#94A3B8] font-normal">
                                      {row.studentEmail}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Class */}
                              <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                {isClassOneOnOne(row.className, row.classId) ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/50 whitespace-nowrap"
                                    title={row.className}
                                  >
                                    <User className="w-3 h-3 shrink-0" />
                                    <span>Kèm 1-1</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/50 whitespace-nowrap"
                                    title={row.className}
                                  >
                                    <Users className="w-3 h-3 shrink-0" />
                                    <span>Lớp học chung</span>
                                  </span>
                                )}
                              </td>

                              {/* Sessions: Clickable Link to Schedule */}
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/teacher/schedule?classId=${row.classId}&studentId=${row.studentId}&date=${row.month}-01`,
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-[#4338CA] bg-[#EEF2FF] hover:bg-[#E0E7FF] border border-[#C7D2FE] dark:text-indigo-300 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 transition-all cursor-pointer group shadow-2xs whitespace-nowrap shrink-0"
                                  title="Bấm để xem các buổi học này trên Lịch dạy"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-[#4F46E5] group-hover:scale-110 transition-transform shrink-0" />
                                  <span className="whitespace-nowrap">{row.lessonCount} buổi</span>
                                </button>
                              </td>

                              {/* Hours */}
                              <td className="py-3.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {row.totalHours}h
                              </td>

                              {/* Total Amount */}
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {row.totalAmount.toLocaleString('vi-VN')} đ
                              </td>

                              {/* Paid Amount */}
                              <td className="py-3.5 px-4 text-right font-semibold text-[#047857] dark:text-emerald-400 whitespace-nowrap">
                                {row.paidAmount.toLocaleString('vi-VN')} đ
                              </td>

                              {/* Remaining Amount */}
                              <td className="py-3.5 px-4 text-right font-semibold text-[#BE123C] dark:text-rose-400 whitespace-nowrap">
                                {row.remainingAmount.toLocaleString('vi-VN')} đ
                              </td>

                              {/* Status Dropdown Pill (Interactive) */}
                              <td className="py-3.5 px-4 text-center relative">
                                <div className="inline-block relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveStatusDropdownId(isDropdownOpen ? null : row.id);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all shadow-2xs ${
                                      row.status === 'PAID'
                                        ? 'bg-[#ECFDF5] text-[#047857] hover:bg-emerald-100/70 dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800/50'
                                        : row.status === 'PARTIALLY_PAID'
                                        ? 'bg-[#FFFBEB] text-[#B45309] hover:bg-amber-100/70 dark:bg-amber-950/60 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800/50'
                                        : 'bg-[#FFF1F2] text-[#BE123C] hover:bg-rose-100/70 dark:bg-rose-950/60 dark:text-rose-300 border border-[#FECDD3] dark:border-rose-800/50'
                                    }`}
                                  >
                                    {row.status === 'PAID' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                                    ) : row.status === 'PARTIALLY_PAID' ? (
                                      <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                                    ) : (
                                      <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                                    )}
                                    <span>
                                      {row.status === 'PAID'
                                        ? 'Đã hoàn tất'
                                        : row.status === 'PARTIALLY_PAID'
                                        ? 'Đã thu một phần'
                                        : 'Chưa thu'}
                                    </span>
                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {isDropdownOpen && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute z-30 left-1/2 -translate-x-1/2 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-[#E8EDF5] dark:border-slate-700 p-1.5 text-left text-xs"
                                    >
                                      <button
                                        onClick={() => handleQuickStatusChange(row.id, 'PAID')}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#ECFDF5] dark:hover:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 font-semibold flex items-center gap-2"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                                        <span>Đã hoàn tất</span>
                                      </button>
                                      <button
                                        onClick={() => handleQuickStatusChange(row.id, 'UNPAID')}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#FFF1F2] dark:hover:bg-rose-950/40 text-[#BE123C] dark:text-rose-400 font-semibold flex items-center gap-2"
                                      >
                                        <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                                        <span>Chưa thu</span>
                                      </button>
                                      <button
                                        onClick={() => handleOpenPayment(row)}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/40 text-[#4338CA] dark:text-indigo-400 font-semibold flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 mt-1"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 text-[#4F46E5]" />
                                        <span>Ghi nhận thu tiền...</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Receipt / Invoice & History Actions */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Xuất phiếu button */}
                                  <button
                                    onClick={() => handleOpenReceiptModal(row)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium text-[11px] transition-colors flex items-center gap-1.5"
                                    title="Tạo phiếu học phí gửi phụ huynh"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Xuất phiếu</span>
                                  </button>

                                  {/* History button */}
                                  <button
                                    onClick={() => handleOpenDetail(row.id)}
                                    className="p-1.5 text-slate-400 hover:text-[#4F46E5] dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                                    title="Lịch sử thanh toán & điều chỉnh"
                                  >
                                    <History className="w-4 h-4" />
                                  </button>

                                  {/* Single student adjustment */}
                                  <button
                                    onClick={() => handleOpenSingleAdjustment(row)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Thêm phụ thu / giảm trừ cho học sinh này"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== 7. MODAL: TẠO PHIẾU HỌC PHÍ CHUYÊN NGHIỆP ==================== */}
      <TuitionReceiptBuilderModal
        isOpen={isInvoiceModalOpen && !!invoiceStudent}
        onClose={() => setIsInvoiceModalOpen(false)}
        student={invoiceStudent}
        selectedMonth={selectedMonth}
        bankInfo={bankInfo}
        onOpenBankSetup={() => setIsBankSetupOpen(true)}
      />

      {/* ==================== 8. MODAL: PHỤ THU & GIẢM HỌC PHÍ ==================== */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={adjustmentForm.type === 'SURCHARGE' ? 'Thêm Phụ Thu Học Phí' : 'Giảm Trừ Học Phí'}
        maxWidth="lg"
        onSubmit={handleSubmitAdjustment}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                adjustmentForm.type === 'SURCHARGE'
                  ? 'bg-[#4F46E5] hover:bg-[#4338CA]'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C]'
              }`}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Đang lưu...' : 'Lưu Khoản Điều Chỉnh'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Loại điều chỉnh
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentForm({ ...adjustmentForm, type: 'SURCHARGE' })}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  adjustmentForm.type === 'SURCHARGE'
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Phụ thu</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentForm({ ...adjustmentForm, type: 'DISCOUNT' })}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  adjustmentForm.type === 'DISCOUNT'
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span>Giảm học phí</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {adjustmentForm.type === 'SURCHARGE' ? 'Mức phụ thu (VNĐ) *' : 'Mức giảm (VNĐ) *'}
            </label>
            <input
              type="number"
              min="1000"
              step="5000"
              value={adjustmentForm.amount}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: Number(e.target.value) })}
              required
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Khoản điều chỉnh / Lý do *
            </label>
            <input
              type="text"
              value={adjustmentForm.reason}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
              aria-label="Khoản điều chỉnh hoặc lý do"
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Applied Students Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Học sinh áp dụng ({adjustmentForm.selectedTuitionIds.length}/{tuitionList.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  const allSelected = adjustmentForm.selectedTuitionIds.length === tuitionList.length;
                  setAdjustmentForm({
                    ...adjustmentForm,
                    selectedTuitionIds: allSelected ? [] : tuitionList.map((r) => r.id),
                  });
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                {adjustmentForm.selectedTuitionIds.length === tuitionList.length
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              {groupedTuition.map((g) => (
                <div key={g.classId} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    {g.className}
                  </div>
                  {g.rows.map((row) => {
                    const isChecked = adjustmentForm.selectedTuitionIds.includes(row.id);
                    return (
                      <label
                        key={row.id}
                        className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...adjustmentForm.selectedTuitionIds, row.id]
                                : adjustmentForm.selectedTuitionIds.filter((id) => id !== row.id);
                              setAdjustmentForm({ ...adjustmentForm, selectedTuitionIds: next });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <UserAvatar
                            user={{
                              name: row.studentName,
                              avatar: row.studentAvatar,
                            }}
                            name={row.studentName}
                            size="xs"
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {row.studentName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {row.totalAmount.toLocaleString()} đ
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================== 9. MODAL: THANH TOÁN HÀNG LOẠT ==================== */}
      <Modal
        isOpen={isBulkPaymentModalOpen}
        onClose={() => setIsBulkPaymentModalOpen(false)}
        title="Thanh Toán Học Phí Hàng Loạt"
        maxWidth="md"
        onSubmit={handleSubmitBulkPayment}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsBulkPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Đang lưu...' : 'Xác Nhận Thu Tiền'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày nộp
              </label>
              <input
                type="date"
                value={bulkPaymentDate}
                onChange={(e) => setBulkPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hình thức
              </label>
              <select
                value={bulkPaymentMethod}
                onChange={(e) => setBulkPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Chuyển khoản</option>
                <option value="CASH">Tiền mặt</option>
                <option value="MOMO">Ví MoMo</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú chung
            </label>
            <input
              type="text"
              value={bulkPaymentNote}
              onChange={(e) => setBulkPaymentNote(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Student selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Học sinh cần thu ({bulkPaymentSelectedIds.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  const unpaid = tuitionList.filter((r) => r.remainingAmount > 0);
                  const allUnpaidSelected = bulkPaymentSelectedIds.length === unpaid.length;
                  setBulkPaymentSelectedIds(allUnpaidSelected ? [] : unpaid.map((r) => r.id));
                }}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                Chọn tất cả
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
              {tuitionList
                .filter((r) => r.remainingAmount > 0)
                .map((row) => {
                  const isChecked = bulkPaymentSelectedIds.includes(row.id);
                  return (
                    <label
                      key={row.id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...bulkPaymentSelectedIds, row.id]
                              : bulkPaymentSelectedIds.filter((id) => id !== row.id);
                            setBulkPaymentSelectedIds(next);
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <UserAvatar
                          user={{
                            name: row.studentName,
                            avatar: row.studentAvatar,
                          }}
                          name={row.studentName}
                          size="xs"
                        />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {row.studentName}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isClassOneOnOne(row.className, row.classId) ? 'Kèm 1-1' : 'Lớp học chung'}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {row.remainingAmount.toLocaleString()} đ
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================== 10. MODAL: GHI NHẬN THANH TOÁN ĐƠN LẺ ==================== */}
      <Modal
        isOpen={isPaymentModalOpen && !!selectedTuition}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Ghi Nhận Thanh Toán"
        maxWidth="md"
        onSubmit={handleSubmitPayment}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Đang lưu...' : 'Xác Nhận Nộp Tiền'}
            </button>
          </div>
        }
      >
        {selectedTuition && (
          <div className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Học sinh:</span>
                <div className="flex items-center gap-2">
                  <UserAvatar
                    user={selectedTuition.student}
                    name={selectedTuition.student?.name}
                    size="xs"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedTuition.student?.name}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Lớp học:</span>{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedTuition.class?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Số tiền còn lại:</span>{' '}
                <span className="font-black text-rose-600 dark:text-rose-400">
                  {Number(selectedTuition.remainingAmount).toLocaleString()} đ
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Số tiền thanh toán (VNĐ) *
              </label>
              <input
                type="number"
                min="1000"
                max={Number(selectedTuition.remainingAmount) || undefined}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày nộp
                </label>
                <input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hình thức
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                  <option value="MOMO">Ví MoMo</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú
              </label>
              <input
                type="text"
                value={paymentForm.note}
                onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                aria-label="Ghi chú thanh toán"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== 11. MODAL: LỊCH SỬ THANH TOÁN & CHI TIẾT ==================== */}
      <Modal
        isOpen={isDetailModalOpen && !!selectedTuition}
        onClose={() => setIsDetailModalOpen(false)}
        title="Lịch Sử Học Phí & Sổ Cái"
        maxWidth="lg"
        footer={
          <button
            type="button"
            onClick={() => setIsDetailModalOpen(false)}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
          >
            Đóng
          </button>
        }
      >
        {selectedTuition && (
          <div className="space-y-5 text-xs">
            {/* Student card info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl space-y-1.5 border border-slate-100 dark:border-slate-700/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Học sinh:</span>
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <UserAvatar
                    user={selectedTuition.student}
                    name={selectedTuition.student?.name}
                    size="xs"
                  />
                  <span>{selectedTuition.student?.name}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Lớp:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedTuition.class?.name}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700">
                <span className="text-slate-500">Tổng học phí:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {Number(selectedTuition.totalAmount).toLocaleString()} đ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Đã xác nhận thu:</span>
                <span className="font-bold text-[#047857] dark:text-emerald-400">
                  {Number(selectedTuition.paidAmount).toLocaleString()} đ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Còn lại:</span>
                <span className="font-bold text-[#BE123C] dark:text-rose-400">
                  {Number(selectedTuition.remainingAmount).toLocaleString()} đ
                </span>
              </div>
            </div>

            {/* Payments List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Lịch sử thanh toán ({selectedTuition.payments?.length || 0})
                </h4>
                {Number(selectedTuition.remainingAmount) > 0 && (
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenPayment({
                        id: selectedTuition.id,
                        studentId: selectedTuition.studentId,
                        studentName: selectedTuition.student?.name || (selectedTuition.student as any)?.fullName || 'Học sinh',
                        studentEmail: selectedTuition.student?.email || '',
                        studentAvatar: selectedTuition.student?.avatar,
                        classId: selectedTuition.classId,
                        className: selectedTuition.class?.name || '',
                        month: selectedTuition.month,
                        lessonCount: 0,
                        totalHours: 0,
                        baseAmount: Number(selectedTuition.baseAmount),
                        surcharge: Number(selectedTuition.surcharge),
                        discount: Number(selectedTuition.discount),
                        totalAmount: Number(selectedTuition.totalAmount),
                        paidAmount: Number(selectedTuition.paidAmount),
                        remainingAmount: Number(selectedTuition.remainingAmount),
                        status: selectedTuition.status,
                        adjustmentsCount: 0,
                        paymentsCount: 0,
                      });
                    }}
                    className="text-[#059669] dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thu thêm tiền</span>
                  </button>
                )}
              </div>

              {selectedTuition.payments?.length === 0 ? (
                <p className="text-slate-400 italic">Chưa có giao dịch thanh toán nào</p>
              ) : (
                <div className="space-y-2">
                  {selectedTuition.payments?.map((pay) => (
                    <div
                      key={pay.id}
                      className={`p-3 border rounded-2xl flex items-center justify-between ${
                        (pay as any).status === 'REFUNDED'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/30'
                          : (pay as any).status === 'VOIDED'
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 opacity-60'
                          : 'bg-[#ECFDF5] dark:bg-emerald-950/20 border-[#A7F3D0] dark:border-emerald-900/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm ${
                              (pay as any).status === 'REFUNDED'
                                ? 'text-[#BE123C] dark:text-rose-400'
                                : (pay as any).status === 'VOIDED'
                                ? 'text-slate-400 dark:text-slate-500 line-through'
                                : 'text-[#047857] dark:text-emerald-400'
                            }`}
                          >
                            {(pay as any).status === 'REFUNDED' ? '-' : '+'}
                            {Number(pay.amount).toLocaleString()} đ
                          </span>
                          {(pay as any).status && (pay as any).status !== 'COMPLETED' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {(pay as any).status === 'REFUNDED' ? 'Đã hoàn trả' : 'Đã hủy (Void)'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {pay.paymentDate} • {pay.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : pay.paymentMethod === 'CASH' ? 'Tiền mặt' : pay.paymentMethod}
                        </div>
                        {pay.note && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">{pay.note}</div>
                        )}
                      </div>
                      {(pay as any).status === 'REFUNDED' ? (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      ) : (pay as any).status === 'VOIDED' ? (
                        <X className="w-5 h-5 text-slate-400" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Adjustments List */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                Các khoản điều chỉnh ({selectedTuition.adjustments?.length || 0})
              </h4>
              {selectedTuition.adjustments?.length === 0 ? (
                <p className="text-slate-400 italic">Không có phụ thu hay giảm trừ nào</p>
              ) : (
                <div className="space-y-2">
                  {selectedTuition.adjustments?.map((adj) => (
                    <div
                      key={adj.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        adj.type === 'SURCHARGE'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30'
                          : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30'
                      }`}
                    >
                      <div>
                        <span
                          className={`font-black text-sm ${
                            adj.type === 'SURCHARGE' ? 'text-indigo-600' : 'text-rose-600'
                          }`}
                        >
                          {adj.type === 'SURCHARGE' ? '+' : '-'}
                          {Number(adj.amount).toLocaleString()} đ
                        </span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                          {adj.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {adj.type === 'SURCHARGE' ? 'Phụ thu' : 'Giảm trừ'}
                        </span>
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="p-1 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                          title="Xóa khoản điều chỉnh này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== 12. MODAL: CÀI ĐẶT STK NGÂN HÀNG & QR ==================== */}
      <Modal
        isOpen={isBankSetupOpen}
        onClose={() => setIsBankSetupOpen(false)}
        title="Cài Đặt Tài Khoản Nhận Học Phí (VietQR)"
        maxWidth="md"
        footer={null}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const bankCode = String(formData.get('bankCode'));
            const bankObj = POPULAR_BANKS.find((b) => b.code === bankCode);
            handleSaveBankInfo({
              bankCode,
              bankName: bankObj?.name || bankCode,
              accountNumber: String(formData.get('accountNumber')).trim(),
              accountHolder: String(formData.get('accountHolder')).trim().toUpperCase(),
            });
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ngân hàng
            </label>
            <select
              name="bankCode"
              defaultValue={bankInfo.bankCode}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Số tài khoản (STK) *
            </label>
            <input
              type="text"
              name="accountNumber"
              defaultValue={bankInfo.accountNumber}
              required
              aria-label="Số tài khoản (STK)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tên chủ tài khoản (in hoa không dấu) *
            </label>
            <input
              type="text"
              name="accountHolder"
              defaultValue={bankInfo.accountHolder}
              required
              aria-label="Tên chủ tài khoản"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBankSetupOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs"
            >
              Lưu Thông Tin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
