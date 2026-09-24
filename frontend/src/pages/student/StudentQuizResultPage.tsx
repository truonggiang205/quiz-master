import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { submissionService } from '../../services/submission.service';
import { appealService } from '../../services/appeal.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { Submission } from '../../types/submission';
import { ResultOverview } from '../../components/student/ResultOverview';
import { AnswerReleaseCountdown } from '../../components/quiz/AnswerReleaseCountdown';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, BookOpen, AlertCircle, X } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import Latex from 'react-latex-next';

export const StudentQuizResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submissionId');

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuthStore();
  const { addToast } = useUiStore();
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const loadSubmission = async () => {
    try {
      if (submissionId) {
        const data = await submissionService.getSubmissionById(submissionId);
        if (data) setSubmission(data);
      } else {
        // Fallback: get last submission for this student
        const list = await submissionService.getMySubmissions();
        const found = list.find((s) => s.quizId === id) || list[0];
        if (found) {
          const detail = await submissionService.getSubmissionById(found.id);
          if (detail) setSubmission(detail);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, [id, submissionId]);

  const handleAppealSubmit = async () => {
    if (!appealReason) {
      addToast({ type: 'error', title: 'Vui lòng nhập lý do phúc khảo' });
      return;
    }
    setSubmittingAppeal(true);
    try {
      await appealService.createAppeal(submission!.id, appealReason);
      addToast({ type: 'success', title: 'Đã gửi yêu cầu phúc khảo thành công!' });
      setShowAppealModal(false);
      setAppealReason('');
    } catch (err: any) {
      addToast({ type: 'error', title: err.response?.data?.message || 'Có lỗi xảy ra' });
    } finally {
      setSubmittingAppeal(false);
    }
  };

  if (loading || !submission) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải kết quả thi của bạn...</span>
        </div>
      </div>
    );
  }

  const isReleased = submission.isAnswerReleased;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/student/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại bàn học
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAppealModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/50 dark:text-orange-400 dark:hover:bg-orange-900/50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            Yêu cầu phúc khảo
          </button>
          <span className="text-xs text-slate-400">
            Nộp lúc: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
          </span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Kết Quả Bài Thi: {submission.quizTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Xem lại thống kê điểm số và lời giải chi tiết
        </p>
      </div>

      {/* Score Overview Banner */}
      <ResultOverview submission={submission} />

      {/* Answer Release Countdown Banner */}
      {submission.answerReleaseAt && (
        <AnswerReleaseCountdown
          releaseDateString={submission.answerReleaseAt}
          onReleased={loadSubmission}
        />
      )}

      {/* Detailed Question Reviews */}
      {isReleased && submission.detailedAnswers && (
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Chi tiết câu hỏi & Lời giải
            </h3>
            <span className="text-xs text-slate-400">
              {submission.detailedAnswers.length} câu hỏi
            </span>
          </div>

          <div className="space-y-5">
            {submission.detailedAnswers.map((item, idx) => {
              const letters = ['A', 'B', 'C', 'D', 'E'];

              return (
                <div
                  key={item.questionId || idx}
                  className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        Câu {idx + 1}
                      </span>
                      {item.isCorrect ? (
                        <Badge variant="mint" size="sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Chính xác (+{item.scoreAwarded} điểm)
                        </Badge>
                      ) : (
                        <Badge variant="rose" size="sm">
                          <XCircle className="w-3.5 h-3.5" />
                          Chưa chính xác (0 điểm)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-white leading-relaxed">
                    <Latex>{item.questionContent}</Latex>
                  </p>
                  
                  {item.questionImageUrl && (
                    <img src={item.questionImageUrl.startsWith('http') ? item.questionImageUrl : `http://localhost:3000${item.questionImageUrl}`} alt="Đề bài" className="max-h-64 rounded-xl object-contain border border-slate-200 dark:border-slate-700" />
                  )}

                  {/* Options with colored feedback or Essay Image */}
                  <div className="space-y-2 pt-1">
                    {item.questionType === 'ESSAY' && item.essayImageUrl ? (
                      <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-500 mb-2">Ảnh bài làm của bạn:</span>
                        <img src={item.essayImageUrl} alt="Bài làm tự luận" className="max-h-64 rounded-lg object-contain border border-slate-300 dark:border-slate-600" />
                      </div>
                    ) : item.options.map((opt, optIdx) => {
                      const isStudentSelected = (item.selectedOptionIds || []).includes(opt.id);
                      const isActuallyCorrect = opt.isCorrect;

                      let style = 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                      if (isActuallyCorrect) {
                        style = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-semibold';
                      } else if (isStudentSelected && !isActuallyCorrect) {
                        style = 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-2xl border text-xs md:text-sm flex items-center justify-between gap-3 transition-colors ${style}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 font-bold text-xs flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {letters[optIdx] || optIdx + 1}
                            </span>
                            <span><Latex>{opt.text}</Latex></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isStudentSelected && (
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                                Bạn đã chọn
                              </span>
                            )}
                            {isActuallyCorrect && (
                              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Note */}
                  {item.explanation && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                      <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Lời giải thích chi tiết:
                      </span>
                      <p className="text-indigo-900 dark:text-indigo-300 leading-relaxed">
                        <Latex>{item.explanation}</Latex>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-800 dark:text-white text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Yêu cầu phúc khảo
              </h3>
              <button 
                onClick={() => setShowAppealModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full p-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Nếu bạn cảm thấy điểm số không chính xác, hãy viết rõ lý do và gửi cho giáo viên xem xét lại.
              </p>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="VD: Câu 3 em chọn đáp án đúng nhưng hệ thống ghi nhận sai..."
                className="w-full h-32 px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors resize-none"
              />
              <button
                onClick={handleAppealSubmit}
                disabled={submittingAppeal}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
              >
                {submittingAppeal ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
