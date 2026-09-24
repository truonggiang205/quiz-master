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

// Pages
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Teacher Pages
import { TeacherDashboard } from '../pages/teacher/TeacherDashboard';
import { TeacherClassroomsPage } from '../pages/teacher/TeacherClassroomsPage';
import { TeacherClassroomDetailPage } from '../pages/teacher/TeacherClassroomDetailPage';
import { TeacherStudentsPage } from '../pages/teacher/TeacherStudentsPage';
import { TeacherQuizListPage } from '../pages/teacher/TeacherQuizListPage';
import { TeacherQuizCreateEditPage } from '../pages/teacher/TeacherQuizCreateEditPage';
import { TeacherQuizResultsPage } from '../pages/teacher/TeacherQuizResultsPage';
import { TeacherQuizPreviewPage } from '../pages/teacher/TeacherQuizPreviewPage';
import { TeacherProfilePage } from '../pages/teacher/TeacherProfilePage';
import { TeacherAppealsPage } from '../pages/teacher/TeacherAppealsPage';
import { TeacherQuestionImportUploadPage } from '../pages/teacher/question-import/TeacherQuestionImportUploadPage';
import { TeacherQuestionImportPreviewPage } from '../pages/teacher/question-import/TeacherQuestionImportPreviewPage';

// Student Pages
import { StudentDashboard } from '../pages/student/StudentDashboard';
import { StudentClassroomsPage } from '../pages/student/StudentClassroomsPage';
import { StudentClassroomDetailPage } from '../pages/student/StudentClassroomDetailPage';
import { StudentAcceptInvitePage } from '../pages/student/StudentAcceptInvitePage';
import { StudentQuizListPage } from '../pages/student/StudentQuizListPage';
import { StudentQuizDetailPage } from '../pages/student/StudentQuizDetailPage';
import { StudentQuizTakingPage } from '../pages/student/StudentQuizTakingPage';
import { StudentQuizResultPage } from '../pages/student/StudentQuizResultPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';

// Admin
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { UserManagementPage } from '../pages/admin/UserManagementPage';
import { ContentManagementPage } from '../pages/admin/ContentManagementPage';
import { SystemSettingsPage } from '../pages/admin/SystemSettingsPage';

export const AppRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
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
          </Route>
        </Route>
      </Route>

      {/* Teacher Routes (Protected + Role Guard) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGuard allowedRole="TEACHER" />}>
          <Route element={<TeacherLayout />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/students" element={<TeacherStudentsPage />} />
            <Route path="/teacher/classrooms" element={<TeacherClassroomsPage />} />
            <Route path="/teacher/classrooms/:id" element={<TeacherClassroomDetailPage />} />
            <Route path="/teacher/quizzes" element={<TeacherQuizListPage />} />
            <Route path="/teacher/quizzes/create" element={<TeacherQuizCreateEditPage />} />
            <Route path="/teacher/quizzes/:id/edit" element={<TeacherQuizCreateEditPage />} />
            <Route path="/teacher/quizzes/:id/preview" element={<TeacherQuizPreviewPage />} />
            <Route path="/teacher/quizzes/:id/results" element={<TeacherQuizResultsPage />} />
            <Route path="/teacher/import" element={<TeacherQuestionImportUploadPage />} />
            <Route path="/teacher/import/:id/preview" element={<TeacherQuestionImportPreviewPage />} />
            <Route path="/teacher/appeals" element={<TeacherAppealsPage />} />
            <Route path="/teacher/profile" element={<TeacherProfilePage />} />
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
            <Route path="/student/profile" element={<StudentProfilePage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AnimatePresence>
  );
};
