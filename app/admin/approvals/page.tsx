'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminApprovalsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [adminSigMode, setAdminSigMode] = useState<'APPROVE' | 'RETURN'>('APPROVE');
  const [adminSigModal, setAdminSigModal] = useState(false);
  const adminSigRef = useRef<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [viewSlipLog, setViewSlipLog] = useState<any>(null);

  // ตัวกรองรายงาน
  const [historySearch, setHistorySearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('borrow_logs')
      .select('*, assets(item_name, category, location, price)')
      .order('borrowed_at', { ascending: false });

    if (data) {
      setLogs(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function checkAdmin() {
      setAuthChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAuthorized(false); setAuthChecking(false); return; }
      setAdminEmail(session.user.email!);

      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', session.user.email)
        .maybeSingle();

      if (!adminRecord) { setIsAuthorized(false); setAuthChecking(false); return; }
      setIsAuthorized(true);
      setAuthChecking(false);
      fetchLogs();
    }
    checkAdmin();
  }, []);

  const handleAdminSignSubmit = async () => {
    if (!adminSigRef.current || adminSigRef.current.isEmpty()) {
      alert('กรุณาลงลายมือชื่อแอดมิน');
      return;
    }

    setActionLoading(true);
    const sigUrl = adminSigRef.current.getTrimmedCanvas().toDataURL('image/png');

    let updatePayload: any = {};
    if (adminSigMode === 'APPROVE') {
      updatePayload = {
        status: 'BORROWED',
        request_status: 'APPROVED',
        admin_signature: sigUrl,
        approved_by: adminEmail,
      };
    } else {
      updatePayload = {
        status: 'RETURNED',
        request_status: 'RETURNED',
        admin_return_signature: sigUrl,
        returned_at: new Date().toISOString(), // 🕒 บันทึกวันเวลาที่แอดมินเซ็นรับคืนพัสดุ
      };
    }

    const { error } = await supabase
      .from('borrow_logs')
      .update(updatePayload)
      .eq('id', selectedLog.id);

    if (error) {
      alert('❌ เกิดข้อผิดพลาด');
    } else {
      alert('✅ บันทึกและลงลายเซ็นสำเร็จ!');
      setAdminSigModal(false);
      setSelectedLog(null);
      fetchLogs();
    }
    setActionLoading(false);
  };

  if (authChecking) return <div className="min-h-screen flex items-center justify-center text-xs">กำลังตรวจสอบสิทธิ์...</div>;
  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center font-bold text-rose-600">⛔ ไม่มีสิทธิ์เข้าใช้งาน</div>;

  const pendingList = logs.filter(l => l.request_status === 'PENDING');
  const returnReviewList = logs.filter(l => l.status === 'RETURNED' && !l.admin_return_signature);
  const activeBorrowedList = logs.filter(l => l.status === 'BORROWED' || l.status === 'APPROVED');
  
  // รายการประวัติทั้งหมดที่ตรงกับคำค้นหา
  const filteredHistoryList = logs.filter(l => 
    l.user_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
    l.asset_id?.toLowerCase().includes(historySearch.toLowerCase()) ||
    l.assets?.item_name?.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .print-modal-backdrop {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          .print-document-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .a4-page {
            width: 210mm !important;
            min-height: 280mm !important;
            padding: 15mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }

          .a4-page-break {
            page-break-after: always !important;
            break-after: page !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* หน้าแดชบอร์ดหลักของแอดมิน */}
      <div className="no-print max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <span className="text-xs font-semibold text-purple-600 uppercase">Admin Portal</span>
            <h1 className="text-2xl font-bold text-slate-900">📊 รายงานสถิติ & สัญญาพิมพ์ A4</h1>
          </div>
          <button onClick={() => router.push('/')} className="bg-slate-800 text-white text-xs py-2.5 px-4 rounded-xl font-semibold">← กลับหน้าหลัก</button>
        </div>

        {/* 📊 รายงานสถิติภาพรวม (Stat Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">คำขอยืมรออนุมัติ</p>
            <p className="text-2xl font-black text-indigo-600">{pendingList.length} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">ส่งคืนรอตรวจรับ</p>
            <p className="text-2xl font-black text-purple-600">{returnReviewList.length} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">พัสดุอยู่ระหว่างถูกยืม</p>
            <p className="text-2xl font-black text-amber-600">{activeBorrowedList.length} <span className="text-xs font-normal text-slate-500">รายการ</span></p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">ทำรายการสะสมทั้งหมด</p>
            <p className="text-2xl font-black text-emerald-600">{logs.length} <span className="text-xs font-normal text-slate-500">สัญญา</span></p>
          </div>
        </div>

        {/* 1. รายการรออนุมัติใบยืม */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">⏳ ใบยืมที่รอการตรวจสอบ ({pendingList.length})</h2>
          {pendingList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl">ไม่มีใบยืมค้างตรวจสอบ</p>
          ) : (
            <div className="space-y-4">
              {pendingList.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl border bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">ผู้ยืม: {log.user_name}</p>
                    <p className="font-mono text-blue-600">พัสดุ: {log.asset_id} ({log.assets?.item_name})</p>
                    <p className="text-rose-600 font-bold">ค่าเสียหาย: ฿{Number(log.assets?.price || 1500).toLocaleString()} บาท</p>
                    <p className="italic text-slate-600">วัตถุประสงค์: "{log.purpose}"</p>
                  </div>
                  <button onClick={() => { setSelectedLog(log); setAdminSigMode('APPROVE'); setAdminSigModal(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl font-semibold shadow transition">✓ ตรวจสอบและเซ็นอนุมัติยืม</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. รายการรอรับคืนพัสดุ พร้อม Preview รูปภาพ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">📦 รายการส่งคืนพัสดุรอตรวจรับ ({returnReviewList.length})</h2>
          {returnReviewList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-2xl">ไม่มีรายการรอรับคืน</p>
          ) : (
            <div className="space-y-4">
              {returnReviewList.map((log) => (
                <div key={log.id} className="p-5 rounded-2xl border bg-amber-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-xs">
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">ผู้คืน: {log.user_name}</p>
                      <p className="font-mono text-blue-600">พัสดุ: {log.asset_id} ({log.assets?.item_name})</p>
                      {/* 🕒 แสดงเวลาส่งคืน */}
                      <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                        🕒 เวลาส่งคืน: {log.returned_at ? new Date(log.returned_at).toLocaleString('th-TH') : new Date(log.borrowed_at).toLocaleString('th-TH')}
                      </p>
                    </div>

                    {/* Preview รูปถ่าย */}
                    <div className="flex gap-3 pt-1">
                      <div className="text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">ด้านหน้า</span>
                        {log.return_photo_front && log.return_photo_front !== '-' ? (
                          <a href={log.return_photo_front} target="_blank" rel="noreferrer">
                            <img src={log.return_photo_front} alt="Front Preview" className="w-20 h-20 object-cover rounded-xl border border-amber-200 bg-white shadow-sm hover:scale-105 transition-transform" />
                          </a>
                        ) : (
                          <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">ไม่มีรูป</div>
                        )}
                      </div>

                      <div className="text-center space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">ด้านหลัง</span>
                        {log.return_photo_back && log.return_photo_back !== '-' ? (
                          <a href={log.return_photo_back} target="_blank" rel="noreferrer">
                            <img src={log.return_photo_back} alt="Back Preview" className="w-20 h-20 object-cover rounded-xl border border-amber-200 bg-white shadow-sm hover:scale-105 transition-transform" />
                          </a>
                        ) : (
                          <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">ไม่มีรูป</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => { setSelectedLog(log); setAdminSigMode('RETURN'); setAdminSigModal(true); }} className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-5 rounded-xl font-semibold shadow whitespace-nowrap transition">✓ เซ็นรับทราบการคืนพัสดุ</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. ประวัติและรายงานสัญญา A4 ทั้งหมด */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">📑 รายงานประวัติและเอกสารสัญญา A4</h2>
            <input 
              type="text" 
              placeholder="🔍 ค้นหาชื่อผู้ยืม, รหัสพัสดุ..." 
              value={historySearch} 
              onChange={(e) => setHistorySearch(e.target.value)}
              className="p-2.5 rounded-xl border text-xs w-full md:w-64"
            />
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-slate-400 uppercase">
                  <th className="py-3 px-3">ผู้ยืม</th>
                  <th className="py-3 px-3">อุปกรณ์</th>
                  <th className="py-3 px-3">วันที่ยืม</th>
                  <th className="py-3 px-3">วันที่ส่งคืน</th>
                  <th className="py-3 px-3">สถานะ</th>
                  <th className="py-3 px-3 text-center">เอกสารสัญญา A4 (2 หน้า)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistoryList.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold">{log.user_name}</td>
                    <td className="py-3 px-3 font-mono">{log.asset_id}</td>
                    <td className="py-3 px-3">{new Date(log.borrowed_at).toLocaleDateString('th-TH')}</td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {log.returned_at ? new Date(log.returned_at).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                        log.status === 'RETURNED' ? 'bg-emerald-100 text-emerald-800' :
                        log.status === 'BORROWED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button onClick={() => setViewSlipLog(log)} className="bg-blue-50 text-blue-600 font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-100 transition">📄 พิมพ์สัญญา A4 (2 หน้า)</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal ลายเซ็นแอดมิน */}
      {adminSigModal && selectedLog && (
        <div className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">{adminSigMode === 'APPROVE' ? '✍️ ลงลายเซ็นอนุมัติใบยืม' : '✍️ ลงลายเซ็นรับทราบการคืน'}</h3>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ลายเซ็นแอดมิน *</label>
              <div className="border rounded-2xl overflow-hidden bg-white">
                <SignatureCanvas ref={adminSigRef} canvasProps={{ className: 'w-full h-32 cursor-crosshair' }} />
              </div>
              <button type="button" onClick={() => adminSigRef.current?.clear()} className="text-[11px] text-rose-600 mt-1">🗑 ล้างลายเซ็น</button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAdminSigModal(false)} className="flex-1 bg-slate-100 py-2.5 rounded-xl">ยกเลิก</button>
              <button onClick={handleAdminSignSubmit} disabled={actionLoading} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold">✓ ยืนยันบันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* 📄 Modal แสดงและสั่งพิมพ์เอกสารสัญญา A4 (2 หน้า) */}
      {viewSlipLog && (
        <div className="print-modal-backdrop fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-start p-6 z-50 overflow-y-auto no-scrollbar">
          
          <div className="no-print sticky top-0 z-50 flex gap-3 w-full max-w-[210mm] bg-white p-3 rounded-2xl shadow-xl border border-slate-200 mb-6">
            <button onClick={() => setViewSlipLog(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-xs font-semibold text-slate-700">✕ ปิดหน้าต่าง</button>
            <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow">🖨️ พิมพ์ / บันทึก PDF (2 หน้า A4 แนวตั้ง)</button>
          </div>

          <div className="print-document-container w-full max-w-[210mm] flex flex-col items-center space-y-8 print:space-y-0">
            
            {/* หน้าที่ 1: ใบยืมครุภัณฑ์ */}
            <div className="a4-page a4-page-break bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl border border-slate-200 font-serif text-slate-900 relative flex flex-col justify-between box-border">
              <div className="space-y-6">
                <div className="text-center space-y-1 border-b pb-4">
                  <h2 className="text-xl font-bold tracking-wide">ใบยืมครุภัณฑ์ / วัสดุคงทน </h2>
                  <p className="text-xs text-slate-600 font-sans">งานประธานสาขา ภาควิชาวิทยาการคอมพิวเตอร์</p>
                </div>

                <div className="text-right text-xs space-y-0.5 font-sans">
                  <p>เขียนที่ ภาควิชาวิทยาการคอมพิวเตอร์</p>
                  <p>วันที่ {new Date(viewSlipLog.borrowed_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <div className="text-xs space-y-3 leading-relaxed">
                  <p><b>เรื่อง:</b> ขอยืมพัสดุและครุภัณฑ์</p>
                  <p><b>เรียน:</b> ประธานสาขาทุกชั้นปี / รองประธานสาขาทุกชั้นปี / คณะกรรมการชั้นปีฝ่ายพัสดุทุกชั้นปี</p>
                  <p className="pt-2">
                    ข้าพเจ้า (<span className="underline font-sans">{viewSlipLog.user_name}</span>) อีเมล <span className="underline font-sans">{viewSlipLog.user_email}</span> มีความประสงค์ขอยืมอุปกรณ์ 
                    <b> {viewSlipLog.assets?.item_name}</b> (รหัสพัสดุ: <span className="font-mono font-bold">{viewSlipLog.asset_id}</span>) 
                    เพื่อนำไปใช้ในงาน / กิจกรรม: <span className="italic underline font-sans">"{viewSlipLog.purpose}"</span>
                  </p>
                  <p className="pt-2">
                      โดยจะนำส่งคืนในสภาพเรียบร้อย หากเกิดกรณีชำรุดเสียหาย ข้าพเจ้ายินดีชดใช้ตามมูลค่าความเสียหายที่เกิดขึ้นทันทีตามที่ประเมินเป็นจำนวนเงิน <b className="text-rose-600 font-sans">฿{Number(viewSlipLog.assets?.price || 1500).toLocaleString()} บาท</b> (ข้าพเจ้าได้ตรวจสอบและกดยอมรับเงื่อนไขความรับผิดชอบผ่านระบบอิเล็กทรอนิกส์แล้ว)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-12 text-xs font-sans">
                  <div className="text-center space-y-2">
                    <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300">
                      {viewSlipLog.borrower_signature && viewSlipLog.borrower_signature !== '-' ? (
                        <img src={viewSlipLog.borrower_signature} alt="Borrower Sign" className="max-h-full object-contain" />
                      ) : <span className="text-slate-400 text-[10px]">-</span>}
                    </div>
                    <p>(ลงชื่อ).......................................................ผู้ยืม</p>
                    <p>({viewSlipLog.user_name})</p>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300">
                      {viewSlipLog.admin_signature ? (
                        <img src={viewSlipLog.admin_signature} alt="Admin Sign" className="max-h-full object-contain" />
                      ) : <span className="text-slate-400 text-[10px]">(รออนุมัติ)</span>}
                    </div>
                    <p>(ลงชื่อ).......................................................ผู้อนุมัติ</p>
                    <p>({viewSlipLog.approved_by || '.......................................................'})</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] font-mono text-slate-400 border-t font-sans">
                Document ID (Page 1): {viewSlipLog.id}
              </div>
            </div>

            {/* หน้าที่ 2: ใบส่งคืนครุภัณฑ์ */}
            <div className="a4-page bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl border border-slate-200 font-serif text-slate-900 relative flex flex-col justify-between box-border">
              <div className="space-y-6">
                <div className="text-center space-y-1 border-b pb-4">
                  <h2 className="text-xl font-bold tracking-wide">ใบส่งคืนครุภัณฑ์และตรวจรับพัสดุ</h2>
                  <p className="text-xs text-slate-600 font-sans">งานประธานสาขา ภาควิชาวิทยาการคอมพิวเตอร์</p>
                </div>

                {/* 🕒 แสดงวันและเวลาส่งคืนในเอกสาร A4 หน้า 2 */}
                <div className="text-right text-xs space-y-0.5 font-sans bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <p><b>วันเวลาที่ส่งคืน:</b> {viewSlipLog.returned_at ? new Date(viewSlipLog.returned_at).toLocaleString('th-TH') : 'ทำรายการคืนเรียบร้อย'}</p>
                </div>

                <div className="text-xs space-y-3 leading-relaxed">
                  <p><b>เรื่อง:</b> ส่งคืนพัสดุและครุภัณฑ์</p>
                  <p><b>เรียน:</b> ประธานสาขาทุกชั้นปี / รองประธานสาขาทุกชั้นปี / คณะกรรมการชั้นปีฝ่ายพัสดุทุกชั้นปี </p>
                  <p className="pt-2">
                    ข้าพเจ้า (<span className="underline font-sans">{viewSlipLog.user_name}</span>) ได้นำส่งคืนอุปกรณ์ 
                    <b> {viewSlipLog.assets?.item_name}</b> (รหัสพัสดุ: <span className="font-mono font-bold">{viewSlipLog.asset_id}</span>) 
                    คืนให้กับทางสโมสรเรียบร้อยแล้ว โดยมีหลักฐานรูปถ่ายสภาพพัสดุด้านหน้าและด้านหลังปรากฏด้านล่างนี้
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border font-sans text-xs text-center">
                  <div>
                    <p className="font-semibold text-slate-600 mb-2">สภาพพัสดุด้านหน้า</p>
                    {viewSlipLog.return_photo_front && viewSlipLog.return_photo_front !== '-' ? (
                      <img src={viewSlipLog.return_photo_front} alt="Front" className="w-full h-36 object-contain mx-auto border rounded-xl bg-white p-1" />
                    ) : <p className="text-slate-400 py-6">- ไม่มีรูปถ่าย -</p>}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-600 mb-2">สภาพพัสดุด้านหลัง</p>
                    {viewSlipLog.return_photo_back && viewSlipLog.return_photo_back !== '-' ? (
                      <img src={viewSlipLog.return_photo_back} alt="Back" className="w-full h-36 object-contain mx-auto border rounded-xl bg-white p-1" />
                    ) : <p className="text-slate-400 py-6">- ไม่มีรูปถ่าย -</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-xs font-sans">
                  <div className="text-center space-y-2">
                    <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300">
                      {viewSlipLog.borrower_signature && viewSlipLog.borrower_signature !== '-' ? (
                        <img src={viewSlipLog.borrower_signature} alt="Sign" className="max-h-full object-contain" />
                      ) : <span className="text-slate-400 text-[10px]">-</span>}
                    </div>
                    <p>(ลงชื่อ).......................................................ผู้ส่งคืน</p>
                    <p>({viewSlipLog.user_name})</p>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="h-16 flex items-center justify-center border-b border-dashed border-slate-300">
                      {viewSlipLog.admin_return_signature ? (
                        <img src={viewSlipLog.admin_return_signature} alt="Admin Return Sign" className="max-h-full object-contain" />
                      ) : <span className="text-slate-400 text-[10px]">(รอรับคืน)</span>}
                    </div>
                    <p>(ลงชื่อ).......................................................ผู้รับคืน </p>
                    <p>(.......................................................)</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4 text-[10px] font-mono text-slate-400 border-t font-sans">
                Document ID (Page 2): {viewSlipLog.id}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}