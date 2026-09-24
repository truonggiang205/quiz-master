import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/auth.store';
import { formatUserName } from '../utils/user.utils';
import { ChevronDown, User, LogOut } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white font-sans text-black selection:bg-black selection:text-white">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          muted
          playsInline
          autoPlay
          loop
          className="w-full h-full object-cover"
        />
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-8 max-w-7xl mx-auto w-full">
        <Link to="/" className="text-2xl md:text-3xl tracking-tight font-instrument-serif text-black">
          QuizMaster®
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/" className="text-black hover:text-black/70 transition-colors">Trang chủ</Link>
          <a href="#features" className="text-[#6F6F6F] hover:text-black transition-colors">Tính năng</a>
          <a href="#about" className="text-[#6F6F6F] hover:text-black transition-colors">Về chúng tôi</a>
          <a href="#contact" className="text-[#6F6F6F] hover:text-black transition-colors">Liên hệ</a>
        </div>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {formatUserName(user)}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  {user.role === 'TEACHER' ? 'Giáo Viên' : 'Học Sinh'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatUserName(user)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <Link
                  to={user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard'}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  {user.role === 'TEACHER' ? 'Bảng điều khiển' : 'Bàn học tập'}
                </Link>
                <Link
                  to={user.role === 'TEACHER' ? '/teacher/profile' : '/student/profile'}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Hồ sơ cá nhân
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-black transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="rounded-full px-5 py-2 text-sm font-semibold bg-black text-white hover:scale-105 transition-transform duration-300 shadow-sm"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <main 
        className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full"
        style={{ paddingTop: 'calc(8rem - 30px)', paddingBottom: '10rem' }}
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl sm:text-7xl md:text-[6rem] font-normal font-instrument-serif leading-[0.95] tracking-[-2.46px] text-black animate-fade-rise">
            Vượt qua giới hạn, <br className="hidden md:block" />
            <span className="text-[#6F6F6F] italic">kiến tạo tri thức.</span>
          </h1>

          <p className="mt-8 mx-auto text-base sm:text-lg max-w-2xl leading-relaxed text-slate-700 animate-fade-rise-delay font-semibold drop-shadow-sm">
            Xây dựng nền tảng khảo thí cho những giáo viên tâm huyết và những học sinh không ngại thử thách. Vượt qua những rào cản truyền thống, chúng tôi kiến tạo không gian số tối ưu cho sự tập trung và tư duy sâu sắc.
          </p>

          <div className="animate-fade-rise-delay-2 flex justify-center mt-12">
            <Link
              to={user ? (user.role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard') : '/login'}
              className="rounded-full px-12 py-4 text-base font-semibold bg-black text-white hover:scale-105 transition-transform duration-300 shadow-lg"
            >
              Bắt đầu hành trình
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
