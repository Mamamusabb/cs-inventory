'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params.id as string;

  const [assetData, setAssetData] = useState<any>(null);
  const [isBorrowed, setIsBorrowed] = useState<boolean>(false);
  const [activeBorrowLog, setActiveBorrowLog] = useState<any>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ show: boolean; title: string; desc: string }>({
    show: false,
    title: '',
    desc: '',
  });

  useEffect(() => {
    async function fetchAssetDetails() {
      setLoadingAsset(true);

      // 🔍 เช็คดูว่ารหัส assetId ที่ส่งเข้ามาหน้าเว็บคืออะไร
      console.log("กำลังค้นหารหัสพัสดุ (Asset ID):", assetId);

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

      // 2. ตรวจสอบสถานะจาก borrow_logs (พร้อมปริ้นผลลัพธ์ออก Console)
      const { data: logData, error: logError } = await supabase
        .from('borrow_logs')
        .select('*')
        .eq('asset_id', assetId)
        .order('borrowed_at', { ascending: false })
        .limit(1);

      console.log("ผลลัพธ์จากตาราง borrow_logs:", logData);
      console.log("Error (ถ้ามี):", logError);

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

    if (assetId) {
      fetchAssetDetails();
    }
  }, [assetId]);

  const handleActionClick = async () => {
    setActionLoading(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });
      return;
    }

    const user = session.user;

    if (!isBorrowed) {
      // --- ทำเรื่องยืม: เพิ่มข้อมูลใหม่ลง borrow_logs ---
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
      // --- คืนอุปกรณ์: อัปเดตสถานะรายการที่ค้างอยู่ให้เป็น RETURNED ---
      const { error } = await supabase
        .from('borrow_logs')
        .update({ status: 'RETURNED' })
        .eq('asset_id', assetId)
        .eq('status', 'BORROWED');

      if (error) {
        console.error('Error returning:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลการคืน');
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

  if (loadingAsset) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
        กำลังโหลดข้อมูลอุปกรณ์...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800 relative">
      
      <div className="mb-4 text-center">
        <span className="text-xs font-medium text-slate-600">💻 CS Student Org. Inventory</span>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        <div className="bg-blue-600 text-white p-6 text-center">
          <p className="text-xs font-medium text-blue-200 tracking-wider mb-1">Asset ID</p>
          <h1 className="text-lg font-mono font-bold tracking-tight">{assetId}</h1>
        </div>

        <div className="p-6 space-y-5">
          
          <div>
            <p className="text-xs text-slate-400 mb-1">ชื่ออุปกรณ์ (Item Name)</p>
            <h2 className="text-xl font-bold text-slate-900">{assetData?.item_name || '-'}</h2>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1.5">สถานะปัจจุบัน (Status)</p>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                !isBorrowed 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${!isBorrowed ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {!isBorrowed ? 'AVAILABLE (พร้อมใช้งาน)' : 'BORROWED (ถูกยืมอยู่)'}
              </span>
            </div>
            {activeBorrowLog && (
              <p className="text-[11px] text-slate-500 mt-2">
                ผู้ยืมล่าสุด: <span className="font-semibold text-slate-700">{activeBorrowLog.user_email}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">หมวดหมู่ (Category)</p>
              <p className="text-sm font-semibold text-slate-800">{assetData?.category || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">แบรนด์ / รุ่น</p>
              <p className="text-sm font-semibold text-slate-800">
                {assetData?.brand || '-'} / {assetData?.model || '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">สถานที่จัดเก็บ</p>
              <p className="text-sm font-semibold text-slate-800">{assetData?.location || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">สภาพ (Condition)</p>
              <p className="text-sm font-semibold text-slate-800">{assetData?.condition || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้รับผิดชอบ (Responsible)</p>
            <p className="text-sm font-semibold text-slate-800">{assetData?.responsible_person || '-'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleActionClick}
              disabled={actionLoading}
              className={`w-full font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1 text-white ${
                !isBorrowed 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionLoading ? 'กำลังดำเนินการ...' : !isBorrowed ? 'ทำเรื่องยืม (Borrow)' : 'คืนอุปกรณ์ (Return)'}
            </button>
            <button
              onClick={() => alert('ฟังก์ชันแจ้งซ่อม')}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 px-4 rounded-xl text-xs transition-all border border-red-100 flex items-center justify-center gap-1"
            >
              แจ้งซ่อม (Repair)
            </button>
          </div>

        </div>
      </div>

      {modalInfo.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-100">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-1">{modalInfo.title}</h3>
            <p className="text-xs text-slate-500 mb-6">{modalInfo.desc}</p>

            <button
              onClick={() => router.push('/scan')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
            >
              สแกนอุปกรณ์ชิ้นถัดไป
            </button>
          </div>
        </div>
      )}

    </div>
  );
}