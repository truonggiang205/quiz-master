import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { submissionService } from '../../services/submission.service';
import { appealService } from '../../services/appeal.service';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { Submission } from '../../types/submission';
import { ResultOverview } from '../../components/student/ResultOverview';
import { AnswerReleaseCountdown } from '../../components/quiz/AnswerReleaseCountdown';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, BookOpen, AlertCircle, X, Clock } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import Latex from 'react-latex-next';
import { resolveImageUrl } from '../../utils/image.util';

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
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
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
              <BookOpen className="w-5 h-5 text-sky-500" />
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
                      <span className="text-sm font-black text-sky-600 dark:text-sky-400">
                         Câu {idx + 1}
                       </span>
                      {item.isCorrect === true ? (
                        <Badge variant="mint" size="sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Chính xác (+{((item.scoreAwarded || 0) / 100).toFixed(2)} điểm)
                        </Badge>
                      ) : item.isCorrect === false ? (
                        <Badge variant="rose" size="sm">
                          <XCircle className="w-3.5 h-3.5" />
                          Chưa chính xác (0 điểm)
                        </Badge>
                      ) : (
                        <Badge variant="amber" size="sm">
                          <Clock className="w-3.5 h-3.5" />
                          Chờ giáo viên chấm điểm
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-white leading-relaxed">
                    <Latex>{item.questionContent}</Latex>
                  </p>
                  
                  {item.questionImageUrl && (
                    <div className="mt-3">
                      <img
                        src={resolveImageUrl(item.questionImageUrl)}
                        alt="Đề bài"
                        className="w-full max-h-[800px] rounded-xl object-contain border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"
                      />
                    </div>
                  )}

                  {/* Options with colored feedback or Essay Image/Text */}
                  <div className="space-y-2 pt-1">
                    {item.questionType === 'ESSAY' && (item.essayImageUrl || item.essayText) ? (
                      <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-4">
                        {item.essayText && (
                          <div>
                            <span className="text-xs font-bold text-slate-500 mb-2 block">Câu trả lời văn bản:</span>
                            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                              {item.essayText}
                            </div>
                          </div>
                        )}
                        {item.essayImageUrl && (
                          <div>
                            <span className="text-xs font-bold text-slate-500 mb-2 block">Ảnh bài làm của bạn:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                              {item.essayImageUrl.split('|||').map((url, i) => (
                                <img key={i} src={resolveImageUrl(url)} alt={`Bài làm tự luận ${i+1}`} className="w-full max-h-[800px] rounded-lg object-contain border border-slate-300 dark:border-slate-600" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : item.options?.map((opt, optIdx) => {
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
                              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md">
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
                    <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs">
                      <span className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                        Lời giải thích chi tiết:
                      </span>
                      <p className="text-sky-900 dark:text-sky-300 leading-relaxed">
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
      <Modal
        isOpen={showAppealModal}
        onClose={() => setShowAppealModal(false)}
        title="Yêu cầu phúc khảo"
        icon={
          <div className="p-2 bg-orange-50 dark:bg-orange-950/60 text-orange-500 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAppealModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAppealSubmit}
              disabled={submittingAppeal || !appealReason.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {submittingAppeal ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Nếu bạn cảm thấy điểm số không chính xác, hãy viết rõ lý do và gửi cho giáo viên xem xét lại.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Lý do phúc khảo
            </label>
            <textarea
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              aria-label="Lý do phúc khảo"
              rows={4}
              className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white dark:placeholder-slate-500 transition-colors resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
