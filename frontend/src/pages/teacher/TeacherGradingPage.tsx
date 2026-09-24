import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { submissionService } from '../../services/submission.service';
import { Submission, DetailedAnswerReview } from '../../types/submission';
import { useUiStore } from '../../stores/ui.store';
import { ArrowLeft, CheckCircle, XCircle, Save, HelpCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const TeacherGradingPage: React.FC = () => {
  const { quizId, submissionId } = useParams<{ quizId: string; submissionId: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<{ [questionId: string]: number }>({});

  useEffect(() => {
    if (!submissionId) return;
    const load = async () => {
      try {
        const data = await submissionService.getSubmissionById(submissionId);
        if (data) {
          setSubmission(data);
          const initialGrades: { [key: string]: number } = {};
          data.detailedAnswers?.forEach((ans) => {
            if (ans.questionType === 'ESSAY') {
              initialGrades[ans.questionId] = ans.scoreAwarded || 0;
            }
          });
          setGrades(initialGrades);
        }
      } catch {
        addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải chi tiết bài nộp' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [submissionId, addToast]);

  const handleGradeChange = (questionId: string, value: string, maxScore: number) => {
    let numVal = parseFloat(value);
    if (isNaN(numVal)) numVal = 0;
    if (numVal < 0) numVal = 0;
    if (numVal > maxScore) numVal = maxScore;
    
    // Ensure step of 0.25
    numVal = Math.round(numVal * 4) / 4;
    setGrades(prev => ({ ...prev, [questionId]: numVal }));
  };

  const handleSaveGrades = async () => {
    if (!submissionId) return;
    setSaving(true);
    addToast({ type: 'info', title: 'Đang lưu điểm số...', message: 'Hệ thống đang xử lý, vui lòng chờ trong giây lát' });
    try {
      const gradesArray = Object.keys(grades).map(qId => ({
        questionId: qId,
        scoreAwarded: grades[qId]
      }));
      await submissionService.gradeSubmission(submissionId, gradesArray);
      addToast({ type: 'success', title: 'Thành công', message: 'Đã lưu điểm và cập nhật kết quả!' });
      navigate(`/teacher/quizzes/${quizId}/results`);
    } catch (err) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể lưu điểm' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !submission) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { detailedAnswers } = submission;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div>
        <Link
          to={`/teacher/quizzes/${quizId}/results`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách kết quả
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Chấm bài: {submission.studentName}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {submission.quizTitle} • Đã nộp: {new Date(submission.submittedAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase">Tổng điểm hiện tại</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {submission.score} <span className="text-sm text-slate-400 font-normal">/ 10</span>
              </p>
            </div>
            <button
              onClick={handleSaveGrades}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Hoàn thành chấm bài'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {detailedAnswers?.map((ans, idx) => (
          <div key={ans.questionId} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                  {idx + 1}
                </div>
                {ans.questionType === 'ESSAY' ? (
                  <Badge variant="sky">Tự luận ({ans.score}đ)</Badge>
                ) : (
                  <Badge variant={ans.isCorrect ? 'mint' : 'rose'}>
                    Trắc nghiệm ({ans.scoreAwarded || 0}/{ans.score}đ)
                  </Badge>
                )}
              </div>
              
              {ans.questionType === 'ESSAY' && (
                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl">
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Chấm điểm:</span>
                  <input
                    type="number"
                    min={0}
                    max={ans.score}
                    step={0.25}
                    value={grades[ans.questionId] ?? 0}
                    onChange={(e) => handleGradeChange(ans.questionId, e.target.value, ans.score)}
                    className="w-20 text-center font-bold px-2 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-500">/ {ans.score}</span>
                </div>
              )}
            </div>

            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 mb-6 font-medium">
              <div dangerouslySetInnerHTML={{ __html: ans.questionContent }} />
              {ans.questionImageUrl && (
                <div className="mt-4">
                  <img src={ans.questionImageUrl.startsWith('http') ? ans.questionImageUrl : `http://localhost:3000${ans.questionImageUrl}`} alt="Đề bài" className="max-w-full rounded-xl border border-slate-200 dark:border-slate-700" style={{ maxHeight: '300px' }} />
                </div>
              )}
            </div>

            {ans.questionType === 'ESSAY' ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Bài làm của học sinh:</h4>
                {ans.essayImageUrl ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {ans.essayImageUrl.split('|||').map((url, i) => (
                      <img key={i} src={url.startsWith('http') ? url : `http://localhost:3000${url}`} alt={`Bài làm tự luận ${i+1}`} className="max-w-full rounded-xl object-contain border border-slate-200" style={{ maxHeight: '400px' }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Học sinh chưa nộp bài tự luận hoặc chỉ gửi đáp án văn bản (hiện tại hỗ trợ nộp ảnh).</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {ans.options?.map((opt) => {
                  const isSelected = ans.selectedOptionIds?.includes(opt.id);
                  const isCorrectAnswer = opt.isCorrect;

                  let optClass = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400';
                  let icon = null;

                  if (isCorrectAnswer) {
                    optClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium';
                    icon = <CheckCircle className="w-5 h-5 text-emerald-500" />;
                  } else if (isSelected && !isCorrectAnswer) {
                    optClass = 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium';
                    icon = <XCircle className="w-5 h-5 text-rose-500" />;
                  } else if (isSelected && isCorrectAnswer) {
                    // Handled by the first condition, just making sure logic flows clearly
                  } else {
                    optClass = 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60';
                  }

                  return (
                    <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border ${optClass}`}>
                      <div className="flex-1 text-sm">{opt.text}</div>
                      {icon}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
