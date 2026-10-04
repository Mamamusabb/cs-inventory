'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminHistoryPage() {
  const router = useRouter();
  const [borrowLogs, setBorrowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function checkAdminAndFetchHistory() {
      setAuthChecking(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthorized(false);
        setAuthChecking(false);
        return;
      }

      const { data: adminData, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (error || !adminData) {
        setIsAuthorized(false);
        setAuthChecking(false);
        return;
      }

      setIsAuthorized(true);
      setAuthChecking(false);

      // ดึงข้อมูลประวัติการยืม-คืน
      const { data: logData, error: logError } = await supabase
        .from('borrow_logs')
        .select('*')
        .order('borrowed_at', { ascending: false });

      if (logError) {
        console.error('Error fetching borrow logs:', logError);
      } else {
        setBorrowLogs(logData || []);
      }

      setLoading(false);
    }

    checkAdminAndFetchHistory();
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-xs text-slate-500">
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-lg border border-slate-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
            ⛔
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-extrabold text-slate-900">ไม่มีสิทธิ์เข้าใช้งาน</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              บัญชี Google ของคุณไม่ได้รับอนุญาตให้เข้าถึงหน้าประวัติผู้ดูแลระบบ
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
          >
            ← กลับสู่หน้าหลัก
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ส่วนหัว */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">Admin Portal</span>
            <h1 className="text-2xl font-bold text-slate-900">ประวัติการยืม-คืนย้อนหลัง (History Log)</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            ← กลับไปหน้าจัดการคลังพัสดุ
          </button>
        </div>

        {/* ตารางประวัติ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 mb-1">📋 รายการธุรกรรมทั้งหมด ({borrowLogs.length})</h2>
          <p className="text-xs text-slate-400 mb-4">บันทึกประวัติการยืมและคืนอุปกรณ์ทุกรายการในระบบ</p>

          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">กำลังโหลดประวัติ...</div>
          ) : borrowLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">ยังไม่มีประวัติการยืม-คืนในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">ผู้ยืม (User)</th>
                    <th className="py-3 px-4">เวลาที่ยืม (Borrowed At)</th>
                    <th className="py-3 px-4 text-center">สถานะ (Status)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {borrowLogs.map((log) => {
                    const isReturned = log.status && log.status.trim().toUpperCase() === 'RETURNED';
                    return (
                      <tr key={log.id || log.borrowed_at} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600">{log.asset_id}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {log.user_name || log.user_email}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(log.borrowed_at).toLocaleString('th-TH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isReturned ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              RETURNED (คืนแล้ว)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              BORROWED (กำลังยืม)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}