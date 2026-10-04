'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';

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
  const [activeBorrowLog, setActiveBorrowLog] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal Login & Profile Check
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // State ฟอร์มลงทะเบียนโปรไฟล์นิสิต
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    department: 'วิทยาการคอมพิวเตอร์',
    major: '',
    phone_number: '',
    social_media: '',
  });

  // State ยืม/คืน
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [agreedToDamagePolicy, setAgreedToDamagePolicy] = useState(false);
  const sigCanvasRef = useRef<any>(null);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState<string>('');
  const [backPhoto, setBackPhoto] = useState<string>('');

  const [modalInfo, setModalInfo] = useState({ show: false, title: '', desc: '' });

  useEffect(() => {
    async function fetchDetails() {
      if (!assetId) return;
      setLoadingAsset(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUser(session.user);
        
        // เช็คว่าเป็นแอดมินหรือไม่
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();
        if (adminRecord) setIsAdmin(true);

        // ดึงข้อมูลโปรไฟล์นิสิต
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_email', session.user.email)
          .maybeSingle();
        if (profile) setUserProfile(profile);
      }

      // ดึงข้อมูลพัสดุ
      const { data: assetInfo } = await supabase
        .from('assets')
        .select('*')
        .eq('asset_id', assetId)
        .maybeSingle();

      if (assetInfo) setAssetData(assetInfo);

      // ดึงประวัติการยืมล่าสุด
      const { data: logData } = await supabase
        .from('borrow_logs')
        .select('*')
        .eq('asset_id', assetId)
        .order('borrowed_at', { ascending: false })
        .limit(1);

      if (logData && logData.length > 0) setActiveBorrowLog(logData[0]);
      setLoadingAsset(false);
    }

    fetchDetails();
  }, [assetId]);

  // เมื่อผู้ใช้กดปุ่ม ทำรายการยืม หรือ คืน
  const handleActionClick = async () => {
    if (assetData?.is_maintenance) {
      setModalInfo({ show: true, title: 'ไม่สามารถทำรายการได้', desc: 'อุปกรณ์ชิ้นนี้กำลังส่งซ่อม' });
      return;
    }

    // 1. ตรวจสอบว่า Login หรือยัง?
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setShowLoginModal(true);
      return;
    }

    // 2. ตรวจสอบว่ากรอกข้อมูลโปรไฟล์เรียบร้อยหรือยัง?
    if (!userProfile) {
      setShowProfileModal(true);
      return;
    }

    const currentStatus = activeBorrowLog?.status?.trim().toUpperCase();

    if (assetData?.requires_approval && (!currentStatus || currentStatus === 'RETURNED' || currentStatus === 'REJECTED')) {
      setShowApprovalModal(true);
      return;
    }

    if (currentStatus === 'APPROVED' || currentStatus === 'BORROWED') {
      const isOwner = activeBorrowLog && activeBorrowLog.user_email === session.user.email;
      if (!isOwner && !isAdmin) {
        setModalInfo({ show: true, title: 'ไม่มีสิทธิ์คืนอุปกรณ์', desc: 'คุณไม่ใช่ผู้ที่ยืมอุปกรณ์ชิ้นนี้' });
        return;
      }
      setShowReturnModal(true);
      return;
    }

    executeBorrowOrReturn(session.user, null, null, null, null);
  };

  // บันทึกข้อมูลโปรไฟล์นิสิต
  const handleSaveProfile = async () => {
    if (!profileForm.first_name || !profileForm.last_name || !profileForm.student_id || !profileForm.phone_number) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setActionLoading(true);
    const { data, error } = await supabase.from('user_profiles').insert([
      {
        user_email: currentUser.email,
        ...profileForm,
      },
    ]).select().single();

    if (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: ' + error.message);
    } else {
      setUserProfile(data);
      setShowProfileModal(false);
      alert('✅ บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!');
    }
    setActionLoading(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'front') setFrontPhoto(reader.result as string);
        else setBackPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeBorrowOrReturn = async (user: any, signatureData: string | null, loanPurpose: string | null, frontImg: string | null, backImg: string | null) => {
    setActionLoading(true);
    const currentStatus = activeBorrowLog?.status?.trim().toUpperCase();

    if (!currentStatus || currentStatus === 'RETURNED' || currentStatus === 'REJECTED') {
      const isApprovalNeeded = assetData?.requires_approval;
      const initialStatus = isApprovalNeeded ? 'PENDING' : 'BORROWED';

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const fullName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : user.email;

      const { error } = await supabase.from('borrow_logs').insert([
        {
          asset_id: assetId,
          user_email: user.email,
          user_name: fullName,
          borrowed_at: new Date().toISOString(),
          due_date: dueDate.toISOString(),
          status: initialStatus,
          request_status: initialStatus,
          purpose: loanPurpose || '-',
          borrower_signature: signatureData || '-',
        },
      ]);

      if (error) {
        setModalInfo({ show: true, title: 'เกิดข้อผิดพลาด', desc: 'ไม่สามารถบันทึกข้อมูลได้' });
      } else {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'NEW_BORROW',
            userName: fullName,
            userEmail: user.email,
            assetId: assetId,
            itemName: assetData?.item_name || assetId,
            purpose: loanPurpose || '-',
          }),
        }).catch((err) => console.error(err));

        setModalInfo({
          show: true,
          title: isApprovalNeeded ? 'ส่งใบยืมครุภัณฑ์สำเร็จ!' : 'ทำเรื่องยืมสำเร็จ!',
          desc: isApprovalNeeded ? 'ระบบได้ส่งใบยืมของคุณให้แอดมินตรวจสอบแล้ว' : 'บันทึกข้อมูลการยืมเรียบร้อยแล้ว',
        });
      }
    } else if (currentStatus === 'APPROVED' || currentStatus === 'BORROWED') {
      const { error } = await supabase
        .from('borrow_logs')
        .update({
          status: 'RETURNED',
          request_status: 'RETURNED',
          return_photo_front: frontImg || '-',
          return_photo_back: backImg || '-',
        })
        .eq('id', activeBorrowLog.id);

      if (error) {
        setModalInfo({ show: true, title: 'เกิดข้อผิดพลาด', desc: 'ไม่สามารถบันทึกข้อมูลการคืนได้' });
      } else {
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'NEW_RETURN',
            userName: userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : user.email,
            userEmail: user.email,
            assetId: assetId,
            itemName: assetData?.item_name || assetId,
          }),
        }).catch((err) => console.error(err));

        setModalInfo({ show: true, title: 'ส่งคืนอุปกรณ์สำเร็จ!', desc: 'บันทึกการส่งคืนเรียบร้อยแล้ว' });
      }
    }

    setActionLoading(false);
    setShowApprovalModal(false);
    setShowReturnModal(false);
  };

  if (loadingAsset) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">กำลังโหลดข้อมูล...</div>;
  }

  const currentStatus = activeBorrowLog?.status?.trim().toUpperCase();
  const isMaintenance = assetData?.is_maintenance === true;
  const isPending = currentStatus === 'PENDING';
  const isApprovedOrBorrowed = currentStatus === 'APPROVED' || currentStatus === 'BORROWED';
  const isOwner = currentUser && activeBorrowLog && activeBorrowLog.user_email === currentUser.email;

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-lg border border-slate-200 p-8 space-y-6">
        
        {/* Header Asset ID */}
        <div className="text-center bg-blue-600 text-white py-4 px-4 rounded-2xl shadow-inner">
          <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">ASSET ID</p>
          <h2 className="text-sm font-mono font-bold tracking-wide mt-0.5">{assetId}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase">ชื่ออุปกรณ์</p>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">{assetData?.item_name || 'พัสดุสโมสร'}</h1>
          </div>

          {/* 📌 ตารางรายละเอียดข้อมูลพัสดุ (นำกลับมาครบถ้วน) */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <p className="text-slate-400 uppercase text-[10px]">หมวดหมู่</p>
              <p className="font-bold text-slate-700 mt-0.5">{assetData?.category || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">สถานที่เก็บ</p>
              <p className="font-bold text-slate-700 mt-0.5">{assetData?.location || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">แบรนด์ / รุ่น</p>
              <p className="font-bold text-slate-700 mt-0.5">{assetData?.brand || '-'} {assetData?.model || ''}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[10px]">สภาพอุปกรณ์</p>
              <p className="font-bold text-slate-700 mt-0.5">{assetData?.condition || 'GOOD'}</p>
            </div>
          </div>

          {/* 📌 กล่องแสดงมูลค่าประเมิน (ค่าเสียหาย) */}
          <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100 text-xs space-y-1">
            <p className="font-bold text-slate-700">📌 มูลค่าประเมิน (ค่าเสียหาย):</p>
            <p className="text-rose-600 font-extrabold text-sm">
              {assetData?.price ? `฿ ${Number(assetData.price).toLocaleString()} บาท` : '฿ 1,500 บาท'}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase">สถานะปัจจุบัน</p>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {isMaintenance ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">🛠️️ กำลังส่งซ่อม</span>
              ) : isPending ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">⏳ รอแอดมินอนุมัติ</span>
              ) : isApprovedOrBorrowed ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">📦 ถูกยืมแล้ว</span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">✨ พร้อมใช้งาน</span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          {isMaintenance ? (
            <div className="w-full bg-rose-50 text-rose-600 font-semibold py-3 px-4 rounded-xl text-xs text-center border">🛠 งดให้บริการ</div>
          ) : isPending ? (
            <div className="w-full bg-indigo-50 text-indigo-600 font-semibold py-3 px-4 rounded-xl text-xs text-center border">⏳ รอการพิจารณาใบยืม</div>
          ) : isApprovedOrBorrowed && !isOwner && !isAdmin ? (
            <div className="w-full bg-slate-100 text-slate-400 font-semibold py-3 px-4 rounded-xl text-xs text-center border">🔒 ถูกยืมโดยผู้อื่น</div>
          ) : (
            <button
              onClick={handleActionClick}
              disabled={actionLoading}
              className={`w-full text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md ${
                isApprovedOrBorrowed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {actionLoading ? 'กำลังดำเนินการ...' : isApprovedOrBorrowed ? 'คืนอุปกรณ์และถ่ายรูปสภาพ' : assetData?.requires_approval ? '📄 กรอกใบยืมครุภัณฑ์' : 'ยืมอุปกรณ์'}
            </button>
          )}
        </div>

        <div className="text-center pt-2">
          <button onClick={() => router.push('/')} className="text-xs text-slate-400 hover:text-slate-600 underline">← กลับหน้าแรก</button>
        </div>
      </div>

      {/* 🔐 Modal 1: แจ้งเตือนเข้าสู่ระบบ */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-slate-900">🔐 จำเป็นต้องเข้าสู่ระบบ</h3>
            <p className="text-xs text-slate-500 leading-relaxed">ท่านต้องเข้าสู่ระบบด้วย Google ก่อนทำรายการยืม หรือส่งคืนพัสดุ</p>
            <button
              onClick={async () => {
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.href },
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-xs shadow"
            >
              🔑 เข้าสู่ระบบด้วย Google
            </button>
            <button onClick={() => setShowLoginModal(false)} className="text-xs text-slate-400 underline block mx-auto">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* 📝 Modal 2: บังคับกรอกข้อมูลส่วนตัวเมื่อยืมครั้งแรก */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 my-8 text-xs font-sans">
            <div className="text-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">📝 ลงทะเบียนข้อมูลส่วนตัวนิสิต</h3>
              <p className="text-slate-500 text-[11px] mt-1">กรุณากรอกข้อมูลจริงเพื่อใช้ประกอบสัญญาการยืมพัสดุ (กรอกครั้งแรกครั้งเดียว)</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อจริง *</label>
                  <input type="text" value={profileForm.first_name} onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300" placeholder="สมชาย" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">นามสกุล *</label>
                  <input type="text" value={profileForm.last_name} onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300" placeholder="ใจดี" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">รหัสนักศึกษา *</label>
                <input type="text" value={profileForm.student_id} onChange={(e) => setProfileForm({ ...profileForm, student_id: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300 font-mono" placeholder="66xxxxxxxx" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ภาควิชา *</label>
                  <input type="text" value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">สาขาวิชา *</label>
                  <input type="text" value={profileForm.major} onChange={(e) => setProfileForm({ ...profileForm, major: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300" placeholder="วิทยาการคอมพิวเตอร์" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์ติดต่อ *</label>
                <input type="tel" value={profileForm.phone_number} onChange={(e) => setProfileForm({ ...profileForm, phone_number: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300 font-mono" placeholder="0812345678" />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Social Media (Line ID / FB) *</label>
                <input type="text" value={profileForm.social_media} onChange={(e) => setProfileForm({ ...profileForm, social_media: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-300" placeholder="Line ID: somchai_cs" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowProfileModal(false)} className="flex-1 bg-slate-100 py-2.5 rounded-xl">ยกเลิก</button>
              <button onClick={handleSaveProfile} disabled={actionLoading} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold shadow">✓ บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: ฟอร์มยืมพัสดุ */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 my-8 font-serif text-slate-900">
            <div className="text-center border-b pb-3 space-y-1">
              <h3 className="text-base font-bold">ใบยืมครุภัณฑ์ / วัสดุคงทน</h3>
              <p className="text-xs text-slate-600 font-sans">ผู้ยืม: {userProfile?.first_name} {userProfile?.last_name} ({userProfile?.student_id})</p>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">วัตถุประสงค์ / โครงการที่นำไปใช้ *</label>
                <textarea rows={2} placeholder="ระบุวัตถุประสงค์..." value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300" />
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                <p className="text-[11px] text-slate-700 leading-relaxed font-serif">
                  "หากเกิดกรณีชำรุดเสียหายหรือสูญหาย ข้าพเจ้ายินดีชดใช้ตามมูลค่าความเสียหาย <b>฿{Number(assetData?.price || 1500).toLocaleString()} บาท</b>"
                </p>
                <div className="flex items-start gap-2 pt-1 border-t border-amber-200/60">
                  <input type="checkbox" id="damagePolicyCheck" checked={agreedToDamagePolicy} onChange={(e) => setAgreedToDamagePolicy(e.target.checked)} className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 cursor-pointer" />
                  <label htmlFor="damagePolicyCheck" className="text-xs font-bold text-slate-900 cursor-pointer">ข้าพเจ้ายินยอมชดใช้ค่าเสียหายตามเงื่อนไขดังกล่าว</label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ลงลายมือชื่อผู้ยืม *</label>
                <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white">
                  <SignatureCanvas ref={sigCanvasRef} canvasProps={{ className: 'w-full h-32 cursor-crosshair' }} />
                </div>
                <button type="button" onClick={() => sigCanvasRef.current?.clear()} className="text-[11px] text-rose-600 mt-1 font-medium">🗑 ล้างลายเซ็น</button>
              </div>
            </div>

            <div className="flex gap-2 pt-2 font-sans">
              <button onClick={() => setShowApprovalModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-xl text-xs">ยกเลิก</button>
              <button onClick={() => {
                if (!purpose.trim()) { alert('กรุณากรอกวัตถุประสงค์'); return; }
                if (!agreedToDamagePolicy) { alert('กรุณาติ๊กยอมรับเงื่อนไขค่าเสียหาย'); return; }
                if (sigCanvasRef.current?.isEmpty()) { alert('กรุณาลงลายเซ็น'); return; }
                const sigUrl = sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png');
                executeBorrowOrReturn(currentUser, sigUrl, purpose, null, null);
              }} className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-xs">📄 ส่งใบยืม</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: ฟอร์มถ่ายรูปตอนคืนอุปกรณ์ */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 my-8 font-sans text-xs">
            <h3 className="text-base font-bold text-slate-900">📸 ถ่ายรูปสภาพพัสดุก่อนส่งคืน</h3>
            <p className="text-slate-500">กรุณาอัปโหลดรูปถ่ายสภาพอุปกรณ์ด้านหน้าและด้านหลัง</p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">1. รูปถ่ายสภาพด้านหน้า *</label>
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'front')} className="w-full text-xs p-2 border rounded-xl" />
                {frontPhoto && <img src={frontPhoto} alt="Front" className="h-24 mt-2 object-contain mx-auto border rounded-xl" />}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">2. รูปถ่ายสภาพด้านหลัง *</label>
                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'back')} className="w-full text-xs p-2 border rounded-xl" />
                {backPhoto && <img src={backPhoto} alt="Back" className="h-24 mt-2 object-contain mx-auto border rounded-xl" />}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowReturnModal(false)} className="flex-1 bg-slate-100 py-2.5 rounded-xl">ยกเลิก</button>
              <button onClick={() => {
                if (!frontPhoto || !backPhoto) { alert('กรุณาอัปโหลดรูปถ่ายทั้งด้านหน้าและด้านหลัง'); return; }
                executeBorrowOrReturn(currentUser, null, null, frontPhoto, backPhoto);
              }} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold">📦 ยืนยันส่งคืนพัสดุ</button>
            </div>
          </div>
        </div>
      )}

      {modalInfo.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold">{modalInfo.title}</h3>
            <p className="text-xs text-slate-500">{modalInfo.desc}</p>
            <button onClick={() => { setModalInfo({ show: false, title: '', desc: '' }); window.location.reload(); }} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs">ตกลง</button>
          </div>
        </div>
      )}
    </main>
  );
}