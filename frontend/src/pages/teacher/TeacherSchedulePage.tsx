import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  FileText,
  Award,
  DollarSign,
  Repeat,
  X,
  Check,
  Search,
  Sparkles,
  Layers,
} from 'lucide-react';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import type { Lesson, LessonParticipant, CreateLessonPayload, UpdateLessonPayload } from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useNavigate } from 'react-router-dom';

// Modern pastel palettes for lessons (inspired by NTTClass & modern calendars)
const CLASS_PALETTES = [
  {
    bg: 'bg-emerald-100/90 dark:bg-emerald-950/70',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-950 dark:text-emerald-100',
    timeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBg: 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-emerald-200/50 dark:hover:shadow-emerald-950/60',
    indicator: 'bg-emerald-500',
  },
  {
    bg: 'bg-rose-100/90 dark:bg-rose-950/70',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-950 dark:text-rose-100',
    timeText: 'text-rose-800 dark:text-rose-300',
    badgeBg: 'bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-rose-200/50 dark:hover:shadow-rose-950/60',
    indicator: 'bg-rose-500',
  },
  {
    bg: 'bg-teal-100/90 dark:bg-teal-950/70',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-950 dark:text-teal-100',
    timeText: 'text-teal-800 dark:text-teal-300',
    badgeBg: 'bg-teal-200/80 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-teal-200/50 dark:hover:shadow-teal-950/60',
    indicator: 'bg-teal-500',
  },
  {
    bg: 'bg-amber-100/90 dark:bg-amber-950/70',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-950 dark:text-amber-100',
    timeText: 'text-amber-800 dark:text-amber-300',
    badgeBg: 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-amber-200/50 dark:hover:shadow-amber-950/60',
    indicator: 'bg-amber-500',
  },
  {
    bg: 'bg-purple-100/90 dark:bg-purple-950/70',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-950 dark:text-purple-100',
    timeText: 'text-purple-800 dark:text-purple-300',
    badgeBg: 'bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-purple-200/50 dark:hover:shadow-purple-950/60',
    indicator: 'bg-purple-500',
  },
  {
    bg: 'bg-sky-100/90 dark:bg-sky-950/70',
    border: 'border-sky-300 dark:border-sky-700',
    text: 'text-sky-950 dark:text-sky-100',
    timeText: 'text-sky-800 dark:text-sky-300',
    badgeBg: 'bg-sky-200/80 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200',
    hoverShadow: 'hover:shadow-lg hover:shadow-sky-200/50 dark:hover:shadow-sky-950/60',
    indicator: 'bg-sky-500',
  },
];

const getLessonPalette = (classId?: string) => {
  if (!classId) return CLASS_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < classId.length; i++) {
    hash = (hash << 5) - hash + classId.charCodeAt(i);
    hash |= 0;
  }
  return CLASS_PALETTES[Math.abs(hash) % CLASS_PALETTES.length];
};

export const TeacherSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // Real-time clock for current-time indicator line
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calendar view mode: 'WEEK' | 'MONTH'
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH'>('WEEK');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for creating lesson
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    date: new Date().toISOString().substring(0, 10),
    startTime: '18:00',
    endTime: '19:30',
    feePerLesson: 100000,
    content: '',
    homework: '',
    notes: '',
    isRecurring: false,
    recurringDays: [1, 3, 5], // Mon, Wed, Fri
    recurringEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    selectedStudentIds: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load teacher's classes
  useEffect(() => {
    ClassroomService.getTeacherClasses()
      .then((data) => {
        setClasses(data);
        if (data.length > 0 && !formData.classId) {
          setFormData((prev) => ({ ...prev, classId: data[0].id }));
        }
      })
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Load lessons whenever currentDate or selectedClassId changes
  const fetchLessons = async () => {
    setLoading(true);
    try {
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const monthStr = `${yyyy}-${mm}`;

      const data = await TeachingService.getLessons({
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        month: viewMode === 'MONTH' ? monthStr : undefined,
      });
      setLessons(data);
    } catch (err) {
      console.error('Failed to fetch schedule lessons', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [currentDate, selectedClassId, viewMode]);

  // Handle class selection change in Create form to auto-select students
  const activeClassForForm = useMemo(() => {
    return classes.find((c) => c.id === formData.classId);
  }, [classes, formData.classId]);

  useEffect(() => {
    if (activeClassForForm && Array.isArray(activeClassForForm.students)) {
      setFormData((prev) => ({
        ...prev,
        selectedStudentIds: (activeClassForForm.students || []).map((s) => s.id),
      }));
    }
  }, [activeClassForForm]);

  // Date Navigation Helpers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'WEEK') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'WEEK') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Week View Calculations: Monday to Sunday
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    // In JS: 0=Sun, 1=Mon, ..., 6=Sat.
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diff));

    const days: { date: Date; dateStr: string; dayName: string }[] = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push({
        date: d,
        dateStr: `${yyyy}-${mm}-${dd}`,
        dayName: dayNames[i],
      });
    }
    return days;
  }, [currentDate]);

  // Month View Calculations
  const monthMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const matrix: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Find starting day of week for the 1st
    let startDayOfWeek = firstDay.getDay(); // 0 is Sun
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 is Mon

    // Leading days from previous month
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      const yyyy = prevDate.getFullYear();
      const mm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dd = String(prevDate.getDate()).padStart(2, '0');
      matrix.push({
        date: prevDate,
        dateStr: `${yyyy}-${mm}-${dd}`,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const curDate = new Date(year, month, d);
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      matrix.push({
        date: curDate,
        dateStr: `${yyyy}-${mm}-${dd}`,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to complete the grid (up to 35 or 42 cells)
    const remaining = 35 - matrix.length > 0 ? 35 - matrix.length : 42 - matrix.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      matrix.push({
        date: nextDate,
        dateStr: `${yyyy}-${mm}-${dd}`,
        isCurrentMonth: false,
      });
    }

    return matrix;
  }, [currentDate]);

  // Header display string
  const periodLabel = useMemo(() => {
    if (viewMode === 'MONTH') {
      return `Tháng ${currentDate.getMonth() + 1} / ${currentDate.getFullYear()}`;
    }
    const dStart = weekDays[0]?.date;
    const dEnd = weekDays[6]?.date;
    if (!dStart || !dEnd) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dStart.getDate())}/${pad(dStart.getMonth() + 1)} - ${pad(dEnd.getDate())}/${pad(dEnd.getMonth() + 1)}/${dEnd.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  // Dynamic hours range (defaults to 7:00 -> 22:00, expands if lessons outside)
  const START_DEFAULT = 7;
  const END_DEFAULT = 22;
  const HOUR_HEIGHT = 68;

  const { startHour, endHour, hours } = useMemo(() => {
    let minH = START_DEFAULT;
    let maxH = END_DEFAULT;
    for (const l of lessons) {
      if (l.startTime) {
        const h = parseInt(l.startTime.split(':')[0], 10);
        if (!isNaN(h)) minH = Math.min(minH, h);
      }
      if (l.endTime) {
        const h = parseInt(l.endTime.split(':')[0], 10);
        if (!isNaN(h)) maxH = Math.max(maxH, h + 1);
      }
    }
    const sH = Math.max(0, minH);
    const eH = Math.min(24, Math.max(END_DEFAULT, maxH));
    const hArr: number[] = [];
    for (let h = sH; h <= eH; h++) {
      hArr.push(h);
    }
    return { startHour: sH, endHour: eH, hours: hArr };
  }, [lessons]);

  // Weekly KPI stats (Tổng buổi, Tổng giờ, Lớp/Học sinh, Tổng tiền)
  const weekStats = useMemo(() => {
    const weekDateSet = new Set(weekDays.map((d) => d.dateStr));
    const weekLessons = lessons.filter((l) => weekDateSet.has(l.date));

    const totalLessons = weekLessons.length;
    const totalHours = weekLessons.reduce((acc, l) => acc + Number(l.duration || 0), 0);
    const totalFees = weekLessons.reduce((acc, l) => acc + Number(l.feePerLesson || 0), 0);
    const distinctClasses = new Set(weekLessons.map((l) => l.classId)).size;
    const totalStudents = weekLessons.reduce((acc, l) => acc + (l.participants?.length || 0), 0);

    return {
      totalLessons,
      totalHours: Number(totalHours.toFixed(1)),
      classStudentLabel: `${distinctClasses}/${totalStudents}`,
      totalFees,
    };
  }, [lessons, weekDays]);

  // Daily Fee calculation for headers
  const dayFeeMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of weekDays) {
      const dayLessons = lessons.filter((l) => l.date === d.dateStr);
      map[d.dateStr] = dayLessons.reduce((acc, l) => acc + Number(l.feePerLesson || 0), 0);
    }
    return map;
  }, [lessons, weekDays]);

  // Quick slot click to create lesson at selected date and time
  const handleSlotClick = (dateStr: string, hour: number) => {
    const startH = String(hour).padStart(2, '0');
    const endH = String(Math.min(23, hour + 1)).padStart(2, '0');
    setFormData((prev) => ({
      ...prev,
      date: dateStr,
      startTime: `${startH}:00`,
      endTime: `${endH}:30`,
    }));
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Create lesson submit handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const payload: CreateLessonPayload = {
        classId: formData.classId,
        title: formData.title || undefined,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        feePerLesson: Number(formData.feePerLesson),
        content: formData.content,
        homework: formData.homework,
        notes: formData.notes,
        studentIds: formData.selectedStudentIds,
        recurring: formData.isRecurring
          ? {
              daysOfWeek: formData.recurringDays,
              endDate: formData.recurringEndDate,
            }
          : undefined,
      };

      await TeachingService.createLesson(payload);
      setIsCreateModalOpen(false);
      fetchLessons();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo buổi học');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Lesson Details
  const handleOpenDetail = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsDetailModalOpen(true);
  };

  // Update participant attendance in Detail modal
  const handleToggleAttendance = async (participant: LessonParticipant, newStatus: 'ATTENDED' | 'ABSENT' | 'EXCUSED') => {
    if (!selectedLesson) return;
    try {
      const updatedParts = (selectedLesson.participants || []).map((p) =>
        p.id === participant.id ? { ...p, attendanceStatus: newStatus } : p,
      );

      const res = await TeachingService.updateLesson(selectedLesson.id, {
        participants: updatedParts.map((p) => ({
          studentId: p.studentId,
          attendanceStatus: p.attendanceStatus,
          feeAmount: p.feeAmount,
        })),
      });

      setSelectedLesson(res);
      fetchLessons();
    } catch (err) {
      console.error('Failed to update attendance', err);
    }
  };

  // Delete lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa buổi học này không?')) return;
    try {
      await TeachingService.deleteLesson(lessonId);
      setIsDetailModalOpen(false);
      fetchLessons();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa buổi học');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lịch Dạy & Buổi Học</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Xếp lịch giảng dạy, theo dõi thời lượng, điểm danh và quản lý các buổi học
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="relative">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-xl px-4 py-2.5 pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả lớp học</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('WEEK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'WEEK'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'MONTH'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tháng
            </button>
          </div>

          {/* Create Button */}
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Buổi Học</span>
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 rounded-2xl px-6 py-4 shadow-sm border border-slate-200/80 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Trước đó"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Hôm nay
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Kế tiếp"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{periodLabel}</h2>

        <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
          Tổng số: <span className="font-semibold text-blue-600 dark:text-blue-400">{lessons.length}</span> buổi học
        </div>
      </div>

      {/* Weekly KPI Summary Pill Cards */}
      {viewMode === 'WEEK' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Buổi</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white mt-0.5 block">{weekStats.totalLessons}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Giờ</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5 block">{weekStats.totalHours}h</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lớp / Học Sinh</span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">{weekStats.classStudentLabel}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tiền Tuần</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{weekStats.totalFees.toLocaleString()} đ</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar Views */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-7 gap-3 animate-pulse">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-96 bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : viewMode === 'WEEK' ? (
        /* WEEK VIEW - Modern Timetable Schedule Grid */
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[880px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 sticky top-0 z-20 backdrop-blur-md">
                {/* Time corner header */}
                <div className="p-3 text-center border-r border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>

                {/* 7 Day Headers */}
                {weekDays.map((day) => {
                  const isToday = day.dateStr === new Date().toISOString().substring(0, 10);
                  const dayFee = dayFeeMap[day.dateStr] || 0;

                  return (
                    <div
                      key={day.dateStr}
                      className={`p-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0 transition-colors ${
                        isToday ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {day.dayName} · {day.date.getDate()}/{day.date.getMonth() + 1}
                        </span>
                        {isToday && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                        {dayFee > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {dayFee.toLocaleString()} đ
                          </span>
                        ) : (
                          <span>0 đ</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timetable Body (Hourly grid + Absolutely positioned lesson cards) */}
              <div
                className="grid grid-cols-[64px_repeat(7,1fr)] relative"
                style={{ height: `${hours.length * HOUR_HEIGHT}px` }}
              >
                {/* Left Column: Time Axis Labels */}
                <div className="border-r border-slate-100 dark:border-slate-800 select-none bg-slate-50/30 dark:bg-slate-900/30">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="relative text-[11px] font-semibold text-slate-400 text-center"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                    >
                      <span className="-top-2.5 relative block bg-white dark:bg-slate-900 px-1 mx-auto w-fit text-[11px]">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* 7 Day Columns */}
                {weekDays.map((day) => {
                  const isToday = day.dateStr === new Date().toISOString().substring(0, 10);
                  const dayLessons = lessons.filter((l) => l.date === day.dateStr);

                  return (
                    <div
                      key={day.dateStr}
                      className={`relative border-r border-slate-100 dark:border-slate-800 last:border-r-0 ${
                        isToday ? 'bg-blue-50/[0.08] dark:bg-blue-950/[0.08]' : ''
                      }`}
                    >
                      {/* Horizontal Grid lines for each hour */}
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          onClick={() => handleSlotClick(day.dateStr, hour)}
                          className="group/slot border-b border-slate-100 dark:border-slate-800/80 relative cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          style={{ height: `${HOUR_HEIGHT}px` }}
                        >
                          {/* Subtle 30-min dashed line */}
                          <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-100 dark:border-slate-800/40 pointer-events-none" />

                          {/* Quick Add Button on Slot Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-xs border border-blue-200 dark:border-blue-900">
                              <Plus className="w-3 h-3" /> {hour}:00
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Red Current Time Line if isToday */}
                      {isToday && now.getHours() >= startHour && now.getHours() <= endHour && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                          style={{
                            top: `${(((now.getHours() * 60 + now.getMinutes()) - startHour * 60) / 60) * HOUR_HEIGHT}px`,
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-sm ring-2 ring-white animate-pulse" />
                          <div className="flex-1 h-[2px] bg-red-500 shadow-sm" />
                        </div>
                      )}

                      {/* Lessons positioned at their exact start/end time */}
                      {dayLessons.map((l) => {
                        const palette = getLessonPalette(l.classId);
                        const [sH, sM] = (l.startTime || '00:00').split(':').map(Number);
                        const [eH, eM] = (l.endTime || '00:00').split(':').map(Number);
                        const startMins = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
                        const endMins = (isNaN(eH) ? 0 : eH) * 60 + (isNaN(eM) ? 0 : eM);
                        const durationMins = Math.max(30, endMins - startMins);

                        const top = ((startMins - startHour * 60) / 60) * HOUR_HEIGHT;
                        const height = (durationMins / 60) * HOUR_HEIGHT;

                        return (
                          <motion.div
                            key={l.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, y: -2, zIndex: 30 }}
                            transition={{ duration: 0.15 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(l);
                            }}
                            className={`absolute left-1 right-1 rounded-2xl p-2.5 border shadow-xs cursor-pointer overflow-hidden transition-all flex flex-col justify-between group/card ${palette.bg} ${palette.border} ${palette.hoverShadow}`}
                            style={{
                              top: `${Math.max(2, top + 2)}px`,
                              height: `${Math.max(48, height - 4)}px`,
                            }}
                          >
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-bold mb-0.5">
                                <span className={`flex items-center gap-1 truncate ${palette.timeText}`}>
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {l.startTime} - {l.endTime}
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${palette.badgeBg}`}>
                                  {l.duration}h
                                </span>
                              </div>

                              <h4 className="text-xs font-bold line-clamp-1 tracking-tight text-slate-900 dark:text-white group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                                {l.title}
                              </h4>

                              <div className="text-[11px] font-medium opacity-80 truncate text-slate-600 dark:text-slate-300">
                                {l.class?.name}
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-semibold mt-1 pt-1 border-t border-black/5 dark:border-white/10">
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {Number(l.feePerLesson || 0).toLocaleString()} đ
                              </span>
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Users className="w-3 h-3" />
                                {l.participants?.length || 0}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MONTH VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-3 bg-slate-50/50 dark:bg-slate-800/40">
            <div>Thứ 2</div>
            <div>Thứ 3</div>
            <div>Thứ 4</div>
            <div>Thứ 5</div>
            <div>Thứ 6</div>
            <div>Thứ 7</div>
            <div>Chủ Nhật</div>
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {monthMatrix.map((cell, idx) => {
              const cellLessons = lessons.filter((l) => l.date === cell.dateStr);
              const isToday = cell.dateStr === new Date().toISOString().substring(0, 10);

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/40 dark:bg-slate-950/40 text-slate-300 dark:text-slate-600'
                  } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {cellLessons.length > 0 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                        {cellLessons.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1 overflow-y-auto max-h-[70px]">
                    {cellLessons.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => handleOpenDetail(l)}
                        className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium truncate cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        title={`${l.title} (${l.startTime} - ${l.endTime})`}
                      >
                        {l.startTime} {l.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE LESSON MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tạo Buổi Học Mới</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp Học <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.subject || 'Tổng hợp'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Buổi Học
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="VD: Ôn tập Hàm số & Đạo hàm"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ngày Học <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Giờ Bắt Đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Giờ Kết Thúc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Học Phí / Buổi (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={formData.feePerLesson}
                    onChange={(e) => setFormData({ ...formData, feePerLesson: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Recurring Schedule Checkbox */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-blue-500" />
                      Lặp lại hàng tuần theo thứ
                    </span>
                  </label>

                  {formData.isRecurring && (
                    <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { val: 1, label: 'Thứ 2' },
                          { val: 2, label: 'Thứ 3' },
                          { val: 3, label: 'Thứ 4' },
                          { val: 4, label: 'Thứ 5' },
                          { val: 5, label: 'Thứ 6' },
                          { val: 6, label: 'Thứ 7' },
                          { val: 0, label: 'Chủ Nhật' },
                        ].map((d) => {
                          const isChecked = formData.recurringDays.includes(d.val);
                          return (
                            <button
                              key={d.val}
                              type="button"
                              onClick={() => {
                                const newDays = isChecked
                                  ? formData.recurringDays.filter((x) => x !== d.val)
                                  : [...formData.recurringDays, d.val];
                                setFormData({ ...formData, recurringDays: newDays });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                isChecked
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Lặp lại đến ngày
                        </label>
                        <input
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => setFormData({ ...formData, recurringEndDate: e.target.value })}
                          className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo Buổi Học'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LESSON DETAILS MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {selectedLesson.class?.name}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedLesson.title}
                  </h3>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400">Ngày học</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{selectedLesson.date}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400">Thời gian</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                    {selectedLesson.startTime} - {selectedLesson.endTime}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400">Thời lượng</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{selectedLesson.duration} giờ</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-400">Học phí / buổi</span>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {Number(selectedLesson.feePerLesson).toLocaleString()} đ
                  </p>
                </div>
              </div>

              {/* Attendance Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Danh Sách Điểm Danh ({selectedLesson.participants?.length || 0})
                  </h4>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedLesson.participants?.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.student?.name}</p>
                        <p className="text-[11px] text-slate-400">{p.student?.email}</p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleAttendance(p, 'ATTENDED')}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            p.attendanceStatus === 'ATTENDED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          onClick={() => handleToggleAttendance(p, 'EXCUSED')}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            p.attendanceStatus === 'EXCUSED'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Phép
                        </button>
                        <button
                          onClick={() => handleToggleAttendance(p, 'ABSENT')}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            p.attendanceStatus === 'ABSENT'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          Vắng
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons to Jump to other 3 modules */}
              <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">
                  Thao tác nhanh cho buổi học:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate(`/teacher/learning-logs?lessonId=${selectedLesson.id}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:text-blue-600 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    Nhật ký
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate(`/teacher/scores?lessonId=${selectedLesson.id}&classId=${selectedLesson.classId}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:text-amber-600 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Nhập điểm
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate(`/teacher/tuition?classId=${selectedLesson.classId}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:text-emerald-600 transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Xem học phí
                  </button>
                </div>
              </div>

              {/* Delete Button */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleDeleteLesson(selectedLesson.id)}
                  className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa buổi học
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
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
