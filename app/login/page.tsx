'use client';

import { createClient } from '@supabase/supabase-js';

// สร้าง Supabase Client ฝั่ง Client Component
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/scan`, // ล็อกอินเสร็จเด้งไปหน้าสแกนต่อทันที
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">🔐 เข้าสู่ระบบ</h1>
        <p className="text-sm text-slate-500 mb-6">กรุณาเข้าสู่ระบบด้วย Google Account เพื่อทำรายการยืม-คืนอุปกรณ์</p>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl border border-slate-300 shadow-sm transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.31 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.18C.43 8.12 0 9.85 0 12s.43 3.88 1.18 5.4l4.09-3.16z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.69 1.18 6.6l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          <span>เข้าสู่ระบบด้วย Google</span>
        </button>
      </div>
    </div>
  );
}