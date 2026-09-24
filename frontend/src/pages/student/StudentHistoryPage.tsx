import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  LayoutDashboard,
  Award,
  BookOpen
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { submissionService } from '../../services/submission.service';
import { Submission } from '../../types/submission';

export const StudentHistoryPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'QUIZ' | 'PRACTICE'>('QUIZ');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const data = await submissionService.getMySubmissions();
      setSubmissions(data || []);
    } catch (error) {
      console.error('Failed to fetch submissions', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => (sub.quizType || 'QUIZ') === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">Bài Đã Làm</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Xem lại kết quả các bài kiểm tra và bài ôn tập của bạn</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveTab('QUIZ')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'QUIZ'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Bài thi
        </button>
        <button
          onClick={() => setActiveTab('PRACTICE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'PRACTICE'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Ôn tập
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Chưa có bài đã làm</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Bạn chưa hoàn thành bài {activeTab === 'QUIZ' ? 'thi' : 'ôn tập'} nào.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredSubmissions.map((sub, index) => {
              const formattedDate = new Date(sub.submittedAt).toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
              });
              
              const formatTime = (seconds: number) => {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                return `${m}p ${s}s`;
              };

              const isFullyGraded = sub.isFullyGraded ?? true;

              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg line-clamp-2">
                      {sub.quizTitle}
                    </h3>
                    <Badge variant={isFullyGraded ? 'mint' : 'amber'}>
                      {isFullyGraded ? 'Đã chấm' : 'Chờ chấm'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-600 dark:text-slate-400 mb-6 flex-grow">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{formatTime(sub.timeUsedSeconds)}</span>
                    </div>
                    {isFullyGraded && (
                      <div className="flex items-center gap-1.5 col-span-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400">Đúng {sub.correctCount} câu</span>
                        <span className="mx-1">•</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                        <span className="text-rose-700 dark:text-rose-400">Sai {sub.wrongCount} câu</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 flex flex-col items-center justify-center">
                        <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-0.5" />
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase leading-none">Điểm</span>
                      </div>
                      <div>
                        {isFullyGraded ? (
                          <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                            {sub.score}<span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/{sub.maxScore || 10}</span>
                          </div>
                        ) : (
                          <div className="text-2xl font-black text-amber-600 dark:text-amber-500 leading-none">
                            ...<span className="text-sm font-semibold text-slate-500 dark:text-slate-400">/{sub.maxScore || 10}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/student/quizzes/${sub.quizId}/result`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Chi tiết
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
