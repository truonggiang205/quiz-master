import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { TeacherLayout } from '../layouts/TeacherLayout';
import { StudentLayout } from '../layouts/StudentLayout';

// Guards
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

// Pages (Lazy Loaded)
const LandingPage = React.lazy(() => import('../pages/LandingPage').then(module => ({ default: module.LandingPage })));
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../pages/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));

// Teacher Pages (Lazy Loaded)
const TeacherDashboard = React.lazy(() => import('../pages/teacher/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const TeacherClassroomsPage = React.lazy(() => import('../pages/teacher/TeacherClassroomsPage').then(module => ({ default: module.TeacherClassroomsPage })));
const TeacherClassroomDetailPage = React.lazy(() => import('../pages/teacher/TeacherClassroomDetailPage').then(module => ({ default: module.TeacherClassroomDetailPage })));
const TeacherStudentsPage = React.lazy(() => import('../pages/teacher/TeacherStudentsPage').then(module => ({ default: module.TeacherStudentsPage })));
const TeacherStudentDetailPage = React.lazy(() => import('../pages/teacher/TeacherStudentDetailPage').then(module => ({ default: module.TeacherStudentDetailPage })));
const TeacherQuizListPage = React.lazy(() => import('../pages/teacher/TeacherQuizListPage').then(module => ({ default: module.TeacherQuizListPage })));
const TeacherQuizCreateEditPage = React.lazy(() => import('../pages/teacher/TeacherQuizCreateEditPage').then(module => ({ default: module.TeacherQuizCreateEditPage })));
const TeacherQuizResultsPage = React.lazy(() => import('../pages/teacher/TeacherQuizResultsPage').then(module => ({ default: module.TeacherQuizResultsPage })));
const TeacherGradingPage = React.lazy(() => import('../pages/teacher/TeacherGradingPage').then(module => ({ default: module.TeacherGradingPage })));
const TeacherQuizPreviewPage = React.lazy(() => import('../pages/teacher/TeacherQuizPreviewPage').then(module => ({ default: module.TeacherQuizPreviewPage })));
const TeacherProfilePage = React.lazy(() => import('../pages/teacher/TeacherProfilePage').then(module => ({ default: module.TeacherProfilePage })));
const TeacherAppealsPage = React.lazy(() => import('../pages/teacher/TeacherAppealsPage').then(module => ({ default: module.TeacherAppealsPage })));
const TeacherQuestionBankPage = React.lazy(() => import('../pages/teacher/TeacherQuestionBankPage').then(module => ({ default: module.TeacherQuestionBankPage })));
const TeacherSchedulePage = React.lazy(() => import('../pages/teacher/TeacherSchedulePage').then(module => ({ default: module.TeacherSchedulePage })));
const TeacherLearningLogsPage = React.lazy(() => import('../pages/teacher/TeacherLearningLogsPage').then(module => ({ default: module.TeacherLearningLogsPage })));
const TeacherTuitionPage = React.lazy(() => import('../pages/teacher/TeacherTuitionPage').then(module => ({ default: module.TeacherTuitionPage })));
const TeacherScoresPage = React.lazy(() => import('../pages/teacher/TeacherScoresPage').then(module => ({ default: module.TeacherScoresPage })));
const ReportBugPage = React.lazy(() => import('../pages/ReportBugPage').then(module => ({ default: module.ReportBugPage })));

// Student Pages (Lazy Loaded)
const StudentDashboard = React.lazy(() => import('../pages/student/StudentDashboard').then(module => ({ default: module.StudentDashboard })));
const StudentClassroomsPage = React.lazy(() => import('../pages/student/StudentClassroomsPage').then(module => ({ default: module.StudentClassroomsPage })));
const StudentClassroomDetailPage = React.lazy(() => import('../pages/student/StudentClassroomDetailPage').then(module => ({ default: module.StudentClassroomDetailPage })));
const StudentAcceptInvitePage = React.lazy(() => import('../pages/student/StudentAcceptInvitePage').then(module => ({ default: module.StudentAcceptInvitePage })));
const StudentQuizListPage = React.lazy(() => import('../pages/student/StudentQuizListPage').then(module => ({ default: module.StudentQuizListPage })));
const StudentQuizDetailPage = React.lazy(() => import('../pages/student/StudentQuizDetailPage').then(module => ({ default: module.StudentQuizDetailPage })));
const StudentQuizTakingPage = React.lazy(() => import('../pages/student/StudentQuizTakingPage').then(module => ({ default: module.StudentQuizTakingPage })));
const StudentQuizResultPage = React.lazy(() => import('../pages/student/StudentQuizResultPage').then(module => ({ default: module.StudentQuizResultPage })));
const StudentHistoryPage = React.lazy(() => import('../pages/student/StudentHistoryPage').then(module => ({ default: module.StudentHistoryPage })));
const StudentProfilePage = React.lazy(() => import('../pages/student/StudentProfilePage').then(module => ({ default: module.StudentProfilePage })));

// Admin Pages (Lazy Loaded)
import { AdminLayout } from '../layouts/AdminLayout';
const AdminDashboard = React.lazy(() => import('../pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const UserManagementPage = React.lazy(() => import('../pages/admin/UserManagementPage').then(module => ({ default: module.UserManagementPage })));
const ContentManagementPage = React.lazy(() => import('../pages/admin/ContentManagementPage').then(module => ({ default: module.ContentManagementPage })));
const SystemSettingsPage = React.lazy(() => import('../pages/admin/SystemSettingsPage').then(module => ({ default: module.SystemSettingsPage })));
const AdminReportsPage = React.lazy(() => import('../pages/admin/AdminReportsPage').then(module => ({ default: module.AdminReportsPage })));

export const AppRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes location={location} key={location.pathname}>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Admin Routes (Protected + Role Guard) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRole="ADMIN" />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/content" element={<ContentManagementPage />} />
                <Route path="/admin/settings" element={<SystemSettingsPage />} />
                <Route path="/admin/reports" element={<AdminReportsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Teacher Routes (Protected + Role Guard) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRole="TEACHER" />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/schedule" element={<TeacherSchedulePage />} />
                <Route path="/teacher/learning-logs" element={<TeacherLearningLogsPage />} />
                <Route path="/teacher/tuition" element={<TeacherTuitionPage />} />
                <Route path="/teacher/scores" element={<TeacherScoresPage />} />
                <Route path="/teacher/students" element={<TeacherStudentsPage />} />
                <Route path="/teacher/students/:id" element={<TeacherStudentDetailPage />} />
                <Route path="/teacher/classes" element={<TeacherClassroomsPage />} />
                <Route path="/teacher/classes/:id" element={<TeacherClassroomDetailPage />} />
                <Route path="/teacher/classrooms" element={<TeacherClassroomsPage />} />
                <Route path="/teacher/classrooms/:id" element={<TeacherClassroomDetailPage />} />
                <Route path="/teacher/quizzes" element={<TeacherQuizListPage />} />
                <Route path="/teacher/quizzes/create" element={<TeacherQuizCreateEditPage />} />
                <Route path="/teacher/quizzes/:id/edit" element={<TeacherQuizCreateEditPage />} />
                <Route path="/teacher/quizzes/:id/preview" element={<TeacherQuizPreviewPage />} />
                <Route path="/teacher/quizzes/:id/results" element={<TeacherQuizResultsPage />} />
                <Route path="/teacher/quizzes/:quizId/grade/:submissionId" element={<TeacherGradingPage />} />
                <Route path="/teacher/bank" element={<TeacherQuestionBankPage />} />
                <Route path="/teacher/appeals" element={<TeacherAppealsPage />} />
                <Route path="/teacher/profile" element={<TeacherProfilePage />} />
                <Route path="/teacher/report" element={<ReportBugPage />} />
              </Route>
            </Route>
          </Route>

          {/* Student Routes (Protected + Role Guard) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleGuard allowedRole="STUDENT" />}>
              <Route element={<StudentLayout />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/accept-invite" element={<StudentAcceptInvitePage />} />
                <Route path="/student/classrooms" element={<StudentClassroomsPage />} />
                <Route path="/student/classrooms/:id" element={<StudentClassroomDetailPage />} />
                <Route path="/student/quizzes" element={<StudentQuizListPage />} />
                <Route path="/student/quizzes/:id" element={<StudentQuizDetailPage />} />
                <Route path="/student/quizzes/:id/take" element={<StudentQuizTakingPage />} />
                <Route path="/student/quizzes/:id/result" element={<StudentQuizResultPage />} />
                <Route path="/student/history" element={<StudentHistoryPage />} />
                <Route path="/student/profile" element={<StudentProfilePage />} />
                <Route path="/student/report" element={<ReportBugPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </AnimatePresence>
  );
};
