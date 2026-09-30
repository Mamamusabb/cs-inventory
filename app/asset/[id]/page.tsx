'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.id as string;

  const [assetData, setAssetData] = useState<any>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [isBorrowed, setIsBorrowed] = useState(false);
  const [activeBorrowLog, setActiveBorrowLog] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // สถานะสำหรับเปิด/ปิด Modal แจ้งเตือนสำเร็จ หรือ UI บังคับ Login
  const [modalInfo, setModalInfo] = useState({ show: false, title: '', desc: '' });
  const [showLoginModal, setShowLoginModal] = useState(false); // UI สำหรับบังคับกด Login

  useEffect(() => {
    async function fetchAssetDetails() {
      if (!assetId) return;
      setLoadingAsset(true);

      // 1. ดึงข้อมูลนิ่งของพัสดุจากตาราง assets
      const { data: assetInfo } = await supabase
        .from('assets')
        .select('*')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (assetInfo) {
        setAssetData(assetInfo);
      } else {
        setAssetData({
          item_name: 'อุปกรณ์สโมสรนักศึกษา',
          category: 'GENERAL',
          brand: '-',
          model: '-',
          location: 'ห้องสโมสร',
          condition: 'GOOD',
          responsible_person: 'ทีมพัสดุสโมสร',
        });
      }

      // 2. ตรวจสอบสถานะจาก borrow_logs
      const { data: logData } = await supabase
        .from('borrow_logs')
        .select('*')
        .eq('asset_id', assetId)
        .order('borrowed_at', { ascending: false })
        .limit(1);

      if (logData && logData.length > 0) {
        const latestLog = logData[0];
        if (latestLog.status && latestLog.status.trim().toUpperCase() === 'BORROWED') {
          setIsBorrowed(true);
          setActiveBorrowLog(latestLog);
        } else {
          setIsBorrowed(false);
          setActiveBorrowLog(null);
        }
      } else {
        setIsBorrowed(false);
        setActiveBorrowLog(null);
      }

      setLoadingAsset(false);
    }

    fetchAssetDetails();
  }, [assetId]);

  // ฟังก์ชันกดปุ่ม ยืม / คืน
  const handleActionClick = async () => {
    setActionLoading(true);

    // เช็คว่าผู้ใช้ล็อกอินหรือยัง
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // ถ้ายังไม่ล็อกอิน ให้เปิด UI Modal บังคับล็อกอินแทนการเด้งออกทันที
      setActionLoading(false);
      setShowLoginModal(true);
      return;
    }

    const user = session.user;

    if (!isBorrowed) {
      // --- เช็คซ้ำกันอีกรอบเพื่อความชัวร์ ---
      const { data: latestCheck } = await supabase
        .from('borrow_logs')
        .select('*')
        .eq('asset_id', assetId)
        .order('borrowed_at', { ascending: false })
        .limit(1);

      if (latestCheck && latestCheck.length > 0 && latestCheck[0].status.trim().toUpperCase() === 'BORROWED') {
        alert('❌ อุปกรณ์ชิ้นนี้ถูกยืมไปแล้วโดยผู้อื่น ไม่สามารถยืมซ้ำได้');
        setIsBorrowed(true);
        setActiveBorrowLog(latestCheck[0]);
        setActionLoading(false);
        return;
      }

      // --- บันทึกการยืมใหม่ ---
      const { error } = await supabase.from('borrow_logs').insert([
        {
          asset_id: assetId,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email,
          borrowed_at: new Date().toISOString(),
          status: 'BORROWED',
        },
      ]);

      if (error) {
        console.error('Error borrowing:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลการยืม');
      } else {
        setModalInfo({
          show: true,
          title: 'ทำเรื่องยืมสำเร็จ!',
          desc: 'บันทึกข้อมูลการยืมด้วยบัญชี Google ของคุณเรียบร้อยแล้ว',
        });
        setIsBorrowed(true);
      }
    } else {
      // --- คืนอุปกรณ์ ---
      const { data, error } = await supabase
        .from('borrow_logs')
        .update({ status: 'RETURNED' })
        .eq('asset_id', assetId)
        .eq('status', 'BORROWED')
        .select();

      if (error || !data || data.length === 0) {
        console.error('Error returning:', error);
        alert('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูลการคืน');
      } else {
        setModalInfo({
          show: true,
          title: 'คืนอุปกรณ์สำเร็จ!',
          desc: 'ขอบคุณที่ส่งคืนอุปกรณ์ ข้อมูลถูกบันทึกเรียบร้อยแล้ว',
        });
        setIsBorrowed(false);
        setActiveBorrowLog(null);
      }
    }

    setActionLoading(false);
  };

  // ฟังก์ชันกดปุ่ม Login ด้วย Google จาก Modal
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });
  };

  if (loadingAsset) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-xs text-slate-500">
        กำลังโหลดข้อมูลพัสดุ...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      
      {/* ส่วนหัวแบรนด์ */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5">
          💻 CS Student Org. Inventory
        </span>
      </div>

      {/* การ์ดแสดงข้อมูลพัสดุ */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-lg border border-slate-200 p-8 space-y-6 relative overflow-hidden">
        
        <div className="text-center bg-blue-600 text-white py-4 px-4 rounded-2xl shadow-inner">
          <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">Asset ID</p>
          <h2 className="text-sm font-mono font-bold tracking-wide mt-0.5">{assetId}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase">ชื่ออุปกรณ์ (Item Name)</p>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{assetData?.item_name}</h1>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase">สถานะปัจจุบัน (Status)</p>
            <div className="mt-1 flex items-center gap-2">
              {isBorrowed ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  BORROWED (ถูกยืมอยู่)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  AVAILABLE (พร้อมใช้งาน)
                </span>
              )}
            </div>
            {isBorrowed && activeBorrowLog && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                ผู้ยืมล่าสุด: <span className="font-semibold text-slate-700">{activeBorrowLog.user_email}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">หมวดหมู่ (Category)</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{assetData?.category || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">แบรนด์ / รุ่น</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {assetData?.brand || '-'} {assetData?.model ? `/ ${assetData.model}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">สถานที่จัดเก็บ</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{assetData?.location || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase">สภาพ (Condition)</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">{assetData?.condition || 'GOOD'}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase">ผู้รับผิดชอบ (Responsible)</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{assetData?.responsible_person || '-'}</p>
          </div>
        </div>

        {/* ปุ่มทำรายการ */}
        <div className="pt-4 flex gap-3">
          <button
            onClick={handleActionClick}
            disabled={actionLoading}
            className={`flex-1 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md ${
              isBorrowed
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {actionLoading ? 'กำลังดำเนินการ...' : isBorrowed ? 'คืนอุปกรณ์ (Return)' : 'ยืมอุปกรณ์ (Borrow)'}
          </button>
          
          <button
            onClick={() => alert('ฟังก์ชันแจ้งซ่อมกำลังพัฒนา')}
            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold py-3 px-4 rounded-xl text-xs transition-all border border-rose-100"
          >
            แจ้งซ่อม (Repair)
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            ← กลับไปหน้าค้นหาหน้าแรก
          </button>
        </div>

      </div>

      {/* 🛑 UI Modal สำหรับบังคับ Login (โผล่ขึ้นมาเฉพาะตอนยังไม่ล็อกอินแล้วกดปุ่มยืม) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              🔐
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">กรุณายืนยันตัวตนก่อนยืมอุปกรณ์</h3>
              <p className="text-xs text-slate-500 mt-1">
                เพื่อความปลอดภัยและเก็บบันทึกประวัติการใช้งานของสโมสร โปรดเข้าสู่ระบบด้วยบัญชี Google
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎉 Modal แจ้งเตือนทำรายการสำเร็จ */}
      {modalInfo.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{modalInfo.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{modalInfo.desc}</p>
            </div>
            <button
              onClick={() => {
                setModalInfo({ show: false, title: '', desc: '' });
                window.location.reload(); // รีเฟรชหน้าเพื่ออัปเดตสถานะปุ่ม
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

    </main>
  );
}