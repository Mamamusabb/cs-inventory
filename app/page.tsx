'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 📷 โหลดรายชื่อกล้องเมื่อเปิด Modal สแกน
  useEffect(() => {
    if (!showScanner) return;

    Html5Qrcode.getCameras().then((devices) => {
      if (devices && devices.length > 0) {
        setCameras(devices);
        setSelectedCamera(devices[0].id);
      }
    }).catch(() => {
      setErrorMsg('ไม่สามารถเข้าถึงกล้องได้');
    });

    return () => {
      if (scannerInstance && scannerInstance.isScanning) {
        scannerInstance.stop().catch(() => {});
      }
    };
  }, [showScanner]);

  // เริ่มต้นสแกนด้วยกล้องที่เลือก
  useEffect(() => {
    if (!showScanner || !selectedCamera) return;

    const html5QrCode = new Html5Qrcode("reader-view-home");
    setScannerInstance(html5QrCode);

    html5QrCode.start(
      selectedCamera,
      {
        fps: 10,
        qrbox: { width: 220, height: 220 },
      },
      (decodedText) => {
        html5QrCode.stop().then(() => {
          setShowScanner(false);
          if (decodedText.startsWith('http')) {
            window.location.href = decodedText;
          } else {
            router.push(`/asset/${decodedText}`);
          }
        }).catch(() => {});
      },
      () => {}
    ).catch(() => {
      setErrorMsg('ไม่สามารถเปิดใช้งานกล้องนี้ได้');
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [selectedCamera, showScanner, router]);

  // ฟังก์ชันอัปโหลดรูป QR Code จากเครื่องใน Modal
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const html5QrCode = new Html5Qrcode("reader-view-home");
      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        setShowScanner(false);
        if (decodedText.startsWith('http')) {
          window.location.href = decodedText;
        } else {
          router.push(`/asset/${decodedText}`);
        }
      } catch (err) {
        alert('❌ ไม่พบ QR Code ในรูปภาพนี้ กรุณาลองใหม่อีกครั้ง');
      }
    }
  };

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
      
      {/* 🎨 CSS ล็อกสัดส่วนวิดีโอในกล้องให้อยู่ในกรอบพอดีเป๊ะ ไม่ล้น */}
      <style jsx global>{`
        #reader-view-home video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
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

      {/* 📷 Modal สแกน QR Code ดีไซน์สไตล์เดิมที่คุณต้องการ */}
      {showScanner && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center space-y-4">
            
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>🔲</span> สแกน QR Code อุปกรณ์
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-100 p-1 px-3 rounded-lg transition"
              >
                ✕ ปิด
              </button>
            </div>

            <p className="text-[11px] text-slate-400">หันกล้องไปที่ QR Code หรืออัปโหลดรูปภาพเพื่อดูข้อมูล</p>

            {/* กล้องสแกนพร้อมกรอบเล็งเป้า */}
            <div className="relative w-full h-64 bg-slate-900 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center border-4 border-slate-100">
              <div id="reader-view-home" className="w-full h-full object-cover" />
              
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-44 h-44 border-2 border-white/80 rounded-2xl relative shadow-2xl">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                </div>
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-500 font-semibold">{errorMsg}</p>}

            {/* เลือกกล้อง */}
            {cameras.length > 1 && (
              <div className="flex items-center justify-between bg-slate-50 p-2.5 px-3 rounded-2xl border text-xs">
                <span className="font-semibold text-slate-500">📷 เลือกกล้อง:</span>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="bg-white border rounded-xl p-1 text-xs text-slate-700 focus:outline-none max-w-[180px]"
                >
                  {cameras.map((cam) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `กล้อง (${cam.id.slice(0, 5)}...)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ปุ่มอัปโหลดรูปภาพจากเครื่อง */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-3 px-4 rounded-2xl border border-emerald-200 shadow-sm transition flex items-center justify-center gap-2 text-xs"
            >
              <span>🖼️</span> อัปโหลดรูปภาพ QR Code จากเครื่อง
            </button>

          </div>
        </div>
      )}
    </main>
  );
}