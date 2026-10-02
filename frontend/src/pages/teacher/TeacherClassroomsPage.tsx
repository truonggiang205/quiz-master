import React, { useState, useEffect } from 'react';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom } from '../../types/classroom';
import { PlusCircle, Users, Copy, Check, BookOpen, User, X, GraduationCap, ChevronRight } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type FilterTab = 'all' | 'class' | 'private';

const tabConfig: { value: FilterTab; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'Tất cả', icon: <BookOpen className="w-4 h-4" />, color: 'sky' },
  { value: 'class', label: 'Lớp học nhóm', icon: <Users className="w-4 h-4" />, color: 'sky' },
  { value: 'private', label: 'Kèm 1-1', icon: <User className="w-4 h-4" />, color: 'amber' },
];

export const TeacherClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({ name: '', description: '', subject: '', isPrivate: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchClassrooms(); }, []);

  const fetchClassrooms = async () => {
    try {
      const data = await ClassroomService.getTeacherClasses();
      setClassrooms(data);
    } catch {
      addToast({ type: 'error', title: 'Không thể tải danh sách lớp học' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ClassroomService.createClass(formData.name, formData.description, formData.subject, formData.isPrivate);
      addToast({ type: 'success', title: formData.isPrivate ? 'Đã tạo lớp kèm 1-1!' : 'Đã tạo lớp học nhóm!' });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', subject: '', isPrivate: false });
      fetchClassrooms();
    } catch {
      addToast({ type: 'error', title: 'Không thể tạo lớp học' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({ type: 'info', title: `Đã sao chép mã: ${code}` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filtered = classrooms.filter(c => {
    if (activeTab === 'class') return !c.isPrivate;
    if (activeTab === 'private') return c.isPrivate;
    return true;
  });

  const groupCount = classrooms.filter(c => !c.isPrivate).length;
  const privateCount = classrooms.filter(c => c.isPrivate).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Khóa Học của tôi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý cả lớp nhóm và lớp kèm 1-1 tại đây
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl transition-colors font-semibold shadow-md shadow-sky-200 dark:shadow-none text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Tạo mới
        </button>
      </div>

      {/* Stats + Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabConfig.map((tab) => {
          const count = tab.value === 'all' ? classrooms.length : tab.value === 'class' ? groupCount : privateCount;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-200 dark:shadow-none'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-14 text-center border border-slate-100 dark:border-slate-800"
        >
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {activeTab === 'private' ? <User className="w-8 h-8 text-amber-500" /> : <Users className="w-8 h-8 text-sky-500" />}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            {activeTab === 'private' ? 'Chưa có lớp kèm 1-1' : 'Chưa có lớp học nhóm'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs mx-auto">
            {activeTab === 'private'
              ? 'Tạo lớp kèm 1-1 để dạy riêng cho từng học sinh với chương trình cá nhân hóa.'
              : 'Tạo lớp học nhóm để mời nhiều học sinh tham gia cùng một lúc.'}
          </p>
          <button
            onClick={() => { setFormData(f => ({ ...f, isPrivate: activeTab === 'private' })); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 bg-sky-600 text-white hover:bg-sky-700 px-5 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow-md shadow-sky-200"
          >
            <PlusCircle className="w-4 h-4" />
            Tạo ngay
          </button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((cls) => (
              <motion.div
                key={cls.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Card Banner */}
                <div className={`h-20 relative overflow-hidden ${
                  cls.isPrivate
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-sky-400 to-sky-600'
                }`}>
                  <div className="absolute top-0 right-0 opacity-10">
                    {cls.isPrivate
                      ? <User className="w-28 h-28 text-white -mr-4 -mt-4" />
                      : <BookOpen className="w-28 h-28 text-white -mr-4 -mt-4" />
                    }
                  </div>
                  {/* Type tag */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm ${
                      cls.isPrivate
                        ? 'bg-white/25 text-white border border-white/30'
                        : 'bg-white/20 text-white border border-white/25'
                    }`}>
                      {cls.isPrivate ? <><User className="w-3 h-3" />Kèm 1-1</> : <><Users className="w-3 h-3" />Lớp nhóm</>}
                    </span>
                  </div>
                  {/* Class name */}
                  <div className="absolute bottom-3 left-4 right-16">
                    <h3 className="text-base font-black text-white truncate leading-tight">{cls.name}</h3>
                    <p className="text-[11px] text-white/80 truncate">{cls.subject}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Info row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      {cls.isPrivate ? 'Dạy riêng' : `${cls.students?.length ?? 0} học sinh`}
                    </span>
                    {!cls.isPrivate && cls.inviteCode && (
                      <span className="flex items-center gap-1.5">
                        Mã:
                        <code className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md">
                          {cls.inviteCode}
                        </code>
                        <button
                          onClick={(e) => { e.preventDefault(); handleCopyCode(cls.inviteCode); }}
                          className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors relative flex items-center justify-center w-4 h-4"
                          title="Copy mã"
                        >
                          <AnimatePresence mode="wait">
                            {copiedCode === cls.inviteCode ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                <Check className="w-4 h-4 text-emerald-500" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="copy"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  {!cls.isPrivate ? (
                    <Link
                      to={`/teacher/classrooms/${cls.id}`}
                      className="flex items-center justify-between w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-800 text-sky-800 dark:text-sky-100 hover:text-sky-700 dark:hover:text-sky-300 rounded-xl text-sm font-semibold transition-all group"
                    >
                      Quản lý lớp
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <div className="flex items-center justify-between w-full py-2.5 px-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Lớp kèm 1-1
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">Private</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">Tạo khóa học mới</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">Loại khóa học</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, isPrivate: false }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        !formData.isPrivate
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!formData.isPrivate ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Lớp nhóm</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">Nhiều học sinh</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(f => ({ ...f, isPrivate: true }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        formData.isPrivate
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.isPrivate ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Kèm 1-1</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">Dạy riêng cá nhân</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Tên khóa học *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.isPrivate ? 'VD: Kèm Toán - Bé An' : 'VD: Lớp 10A1 - Toán nâng cao'}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Môn học</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="VD: Toán học, Tiếng Anh..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Mô tả (Tùy chọn)</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả ngắn về khóa học này..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors text-sm">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-2.5 px-4 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm shadow-md ${
                      formData.isPrivate
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
                        : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200 dark:shadow-none'
                    }`}
                  >
                    {isSubmitting ? 'Đang tạo...' : formData.isPrivate ? 'Tạo lớp kèm 1-1' : 'Tạo lớp nhóm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
