import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { useUiStore } from '../../stores/ui.store';
import { Badge } from '../../components/common/Badge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  BarChart2,
  Globe,
  Lock,
} from 'lucide-react';

export const TeacherQuizListPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);

  const { addToast } = useUiStore();

  const loadQuizzes = async () => {
    try {
      const data = await quizService.getQuizzes();
      setQuizzes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      if (quiz.status === 'PUBLISHED') {
        await quizService.unpublishQuiz(quiz.id);
        addToast({ type: 'info', title: 'Đã chuyển đề thi về bản thảo' });
      } else {
        await quizService.publishQuiz(quiz.id);
        addToast({ type: 'success', title: 'Đã xuất bản đề thi thành công' });
      }
      loadQuizzes();
    } catch {
      addToast({ type: 'error', title: 'Thao tác thất bại' });
    }
  };

  const handleDelete = async () => {
    if (!deleteQuizId) return;
    addToast({ type: 'info', title: 'Đang xóa bài thi...', message: 'Hệ thống đang xử lý, vui lòng chờ trong giây lát' });
    try {
      await quizService.deleteQuiz(deleteQuizId);
      addToast({ type: 'success', title: 'Đã xóa đề thi thành công' });
      setDeleteQuizId(null);
      loadQuizzes();
    } catch {
      addToast({ type: 'error', title: 'Xóa bài thi thất bại' });
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Quản Lý Bài Kiểm Tra
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tạo mới, chỉnh sửa, xuất bản và theo dõi kết quả thi của học sinh
          </p>
        </div>

        <Link
          to="/teacher/quizzes/create"
          id="create-new-quiz-btn"
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-200 dark:shadow-none transition-all duration-200 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo bài thi mới</span>
        </Link>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bài thi hoặc môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-2xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tất cả ({quizzes.length})
          </button>
          <button
            onClick={() => setStatusFilter('PUBLISHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'PUBLISHED'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Đang mở ({quizzes.filter((q) => q.status === 'PUBLISHED').length})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'DRAFT'
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Bản thảo ({quizzes.filter((q) => q.status === 'DRAFT').length})
          </button>
        </div>
      </div>

      {/* Quizzes List Cards */}
      <div className="space-y-4">
        {filteredQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="p-5 md:p-6 bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <Badge variant={quiz.status === 'PUBLISHED' ? 'mint' : 'slate'} size="sm">
                  {quiz.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Bản thảo'}
                </Badge>
                <span className="text-xs font-semibold text-slate-400">
                  {quiz.subject}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-400">
                  {quiz.durationMinutes} phút
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-400 font-semibold">
                  {quiz.questionCount} câu hỏi ({quiz.totalScore} điểm)
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {quiz.title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                {quiz.description || 'Chưa có phần mô tả.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
              <button
                onClick={() => handleTogglePublish(quiz)}
                title={quiz.status === 'PUBLISHED' ? 'Gỡ bài về bản thảo' : 'Xuất bản bài thi'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  quiz.status === 'PUBLISHED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-emerald-300'
                }`}
              >
                {quiz.status === 'PUBLISHED' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{quiz.status === 'PUBLISHED' ? 'Đang mở' : 'Xuất bản'}</span>
              </button>

              <Link
                to={`/teacher/quizzes/${quiz.id}/results`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <BarChart2 className="w-3.5 h-3.5 text-sky-500" />
                <span>Kết quả</span>
              </Link>

              <Link
                to={`/teacher/quizzes/${quiz.id}/preview`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-sky-500" />
                <span>Xem trước</span>
              </Link>

              <Link
                to={`/teacher/quizzes/${quiz.id}/edit`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </Link>

              <button
                onClick={() => setDeleteQuizId(quiz.id)}
                className="p-2 rounded-xl text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Xóa bài thi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredQuizzes.length === 0 && !loading && (
          <div className="p-12 text-center bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Không tìm thấy bài kiểm tra nào phù hợp với bộ lọc.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteQuizId}
        onClose={() => setDeleteQuizId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa bài kiểm tra"
        description="Bạn có chắc chắn muốn xóa bài kiểm tra này? Thao tác này sẽ xóa toàn bộ câu hỏi và kết quả bài nộp của học sinh."
        confirmText="Xóa vĩnh viễn"
        variant="danger"
      />
    </div>
  );
};
