'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [borrowLogs, setBorrowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ตัวกรอง & ค้นหา
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal สแกน QR Code
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    // 🧹 ล้าง Hash URL (#access_token=...) ที่ติดมาจาก Google OAuth ออกทันที
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }

    async function initData() {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      const { data: assetData } = await supabase
        .from('assets')
        .select('*')
        .order('asset_id', { ascending: true });

      if (assetData) setAssets(assetData);

      const { data: logData } = await supabase
        .from('borrow_logs')
        .select('*')
        .order('borrowed_at', { ascending: false });

      if (logData) setBorrowLogs(logData);

      setLoading(false);
    }

    initData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState(null, '', cleanUrl);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // กล้องสแกน QR Code ใน Modal
  useEffect(() => {
    if (!showScanner) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 220, height: 220 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        setShowScanner(false);
        
        if (decodedText.startsWith('http')) {
          window.location.href = decodedText;
        } else {
          router.push(`/asset/${decodedText}`);
        }
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [showScanner, router]);

  const handleLogin = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cs-inventory-six.vercel.app';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const categories = [
    { key: 'ALL', label: 'ทั้งหมด' },
    { key: 'AUDIO', label: 'AUDIO (เครื่องเสียง/ลำโพง)' },
    { key: 'MEDIA', label: 'MEDIA (กล้อง/ขาตั้ง)' },
    { key: 'OFF', label: 'OFF (อุปกรณ์สำนักงาน)' },
    { key: 'TOOL', label: 'TOOL (เครื่องมือช่าง/ช่างไฟ)' },
    { key: 'GENERAL', label: 'GENERAL (ทั่วไป)' },
  ];

  const statuses = [
    { key: 'ALL', label: 'ทั้งหมด' },
    { key: 'AVAILABLE', label: '✨ พร้อมใช้งาน' },
    { key: 'BORROWED', label: '📦 ถูกยืมแล้ว' },
    { key: 'MAINTENANCE', label: '🛠️ ส่งซ่อม' },
  ];

  const getAssetStatus = (assetId: string, isMaintenance: boolean) => {
    if (isMaintenance) return { code: 'MAINTENANCE', label: '🛠️ ส่งซ่อม', color: 'bg-rose-100 text-rose-800' };

    const activeLog = borrowLogs.find(
      (log) => log.asset_id === assetId && (log.status === 'BORROWED' || log.status === 'APPROVED' || log.status === 'PENDING')
    );

    if (!activeLog) return { code: 'AVAILABLE', label: '✨ พร้อมใช้งาน', color: 'bg-emerald-100 text-emerald-800' };
    if (activeLog.status === 'PENDING') return { code: 'BORROWED', label: '⏳ รออนุมัติ', color: 'bg-indigo-100 text-indigo-800' };
    return { code: 'BORROWED', label: '📦 ถูกยืมแล้ว', color: 'bg-amber-100 text-amber-800' };
  };

  const filteredAssets = assets.filter((item) => {
    const matchesSearch =
      item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.asset_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    const currentStatus = getAssetStatus(item.asset_id, item.is_maintenance);
    const matchesStatus = selectedStatus === 'ALL' || currentStatus.code === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      
      {/* 🎨 CSS ปรับแต่งปุ่มและ UI ภายใน HTML5-QRCode ให้เข้ากับธีม */}
      <style jsx global>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader__dashboard_section_csr button {
          background-color: #2563eb !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 12px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin: 6px 0 !important;
        }
        #qr-reader__dashboard_section_csr button:hover {
          background-color: #1d4ed8 !important;
        }
        #qr-reader__status_span {
          font-size: 11px !important;
          color: #64748b !important;
        }
        #qr-reader video {
          border-radius: 16px !important;
          object-fit: cover !important;
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">สโมสรนักศึกษา คณะวิทยาศาสตร์</span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">📦 ระบบยืม-คืน ครุภัณฑ์และวัสดุ</h1>
          </div>

          <div className="w-full md:w-auto flex justify-end">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-2xl border">
                <div className="text-right text-xs">
                  <p className="font-bold text-slate-900">{currentUser.user_metadata?.full_name || currentUser.email}</p>
                  <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                </div>
                <button onClick={handleLogout} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs py-2 px-3 rounded-xl font-semibold transition">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs py-3 px-5 rounded-2xl font-semibold shadow-md transition flex items-center justify-center gap-2">
                <span>🔑</span> เข้าสู่ระบบด้วย Google
              </button>
            )}
          </div>
        </div>

        {/* 🔍 ค้นหา, ปุ่มสแกน QR Code, ตัวกรองหมวดหมู่ และตัวกรองสถานะ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="🔍 ค้นหาชื่อพัสดุ, รหัสพัสดุ, หรือสถานที่เก็บ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3.5 pl-4 rounded-2xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-5 py-3.5 rounded-2xl shadow-sm flex items-center gap-2 whitespace-nowrap transition"
            >
              <span>📷</span> สแกน QR Code
            </button>
          </div>

          {/* ตัวกรองหมวดหมู่ */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="font-bold text-slate-400 text-[11px] mr-1 whitespace-nowrap">หมวดหมู่:</span>
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`py-2 px-4 rounded-xl font-semibold transition whitespace-nowrap ${
                  selectedCategory === cat.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ตัวกรองสถานะ */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs border-t pt-3">
            <span className="font-bold text-slate-400 text-[11px] mr-1 whitespace-nowrap">สถานะ:</span>
            {statuses.map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedStatus(st.key)}
                className={`py-1.5 px-3.5 rounded-xl text-[11px] font-semibold transition whitespace-nowrap ${
                  selectedStatus === st.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📦 รายการพัสดุทั้งหมด */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-base font-bold text-slate-900">รายการอุปกรณ์พัสดุ ({filteredAssets.length})</h2>
          </div>

          {loading ? (
            <div className="bg-white p-12 rounded-3xl text-center text-xs text-slate-400">กำลังโหลดรายการพัสดุ...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center text-xs text-slate-400 border border-slate-200">
              ไม่พบพัสดุที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((item) => {
                const status = getAssetStatus(item.asset_id, item.is_maintenance);
                return (
                  <div
                    key={item.id || item.asset_id}
                    onClick={() => router.push(`/asset/${item.asset_id}`)}
                    className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg">
                          {item.asset_id}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{item.item_name}</h3>
                      
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>📍 สถานที่: {item.location || '-'}</p>
                        <p>🏷️ หมวดหมู่: {item.category || '-'}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center text-xs">
                      <span className="text-slate-400 text-[10px]">
                        ค่าเสียหาย: {item.price ? `฿${Number(item.price).toLocaleString()}` : '-'}
                      </span>
                      <span className="text-blue-600 font-semibold hover:underline">รายละเอียด →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal สแกน QR Code ดีไซน์ใหม่ */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>📷</span> สแกน QR Code พัสดุ
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 p-1 px-2.5 rounded-lg transition"
              >
                ✕ ปิด
              </button>
            </div>

            <div id="qr-reader" className="overflow-hidden rounded-2xl bg-slate-50" />

            <p className="text-[11px] text-slate-400 pt-1">ส่องกล้องไปที่ QR Code เพื่อเปิดหน้าพัสดุโดยอัตโนมัติ</p>
          </div>
        </div>
      )}
    </main>
  );
}