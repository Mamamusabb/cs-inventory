'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminMaintenancePage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ is_maintenance: false, remarks: '' });

  // State สำหรับ Modal แจ้งเตือนสุดสวยแทน alert() แบบเดิม
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets:', error);
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    async function checkAdminAndFetch() {
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
      fetchAssets();
    }

    checkAdminAndFetch();
  }, []);

  const handleUpdateStatus = async (assetId: string) => {
    const { error } = await supabase
      .from('assets')
      .update({
        is_maintenance: editForm.is_maintenance,
        remarks: editForm.remarks,
      })
      .eq('asset_id', assetId);

    if (error) {
      console.error('Error updating maintenance status:', error);
      setModalMessage('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะซ่อม');
    } else {
      setModalMessage('✅ อัปเดตสถานะการซ่อมสำเร็จ!');
      setEditingAssetId(null);
      fetchAssets();
    }
  };

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
              บัญชี Google ของคุณไม่ได้รับอนุญาตให้เข้าถึงหน้าจัดการระบบผู้ดูแลระบบ
            </p>
          </div>

          {/* ปรับโครงสร้างปุ่มให้ไม่ซ้อนกัน */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => router.push('/admin/approvals')}
              className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-3 px-4 rounded-xl text-xs transition-all border border-purple-200 shadow-sm"
            >
              📋 ตรวจสอบคำขออนุมัติ
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
            >
              ← กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800 relative">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* ส่วนหัว */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <span className="text-xs font-semibold text-rose-600 tracking-wider uppercase">Admin Portal</span>
            <h1 className="text-2xl font-bold text-slate-900">🛠️ จัดการระบบแจ้งซ่อมและสถานะพัสดุ</h1>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            ← กลับไปหน้าจัดการคลังพัสดุ
          </button>
        </div>

        {/* ตารางจัดการสถานะซ่อม */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 mb-1">📋 รายการอุปกรณ์ทั้งหมดและการซ่อม ({assets.length})</h2>
          <p className="text-xs text-slate-400 mb-4">อัปเดตสถานะอุปกรณ์เป็น "กำลังซ่อม" เพื่อระงับการยืมชั่วคราว</p>

          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">ยังไม่มีข้อมูลอุปกรณ์ในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset ID / ชื่ออุปกรณ์</th>
                    <th className="py-3 px-4">หมวดหมู่ / สถานที่</th>
                    <th className="py-3 px-4">สถานะปัจจุบัน & หมายเหตุ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {assets.map((item) => {
                    const isEditing = editingAssetId === item.asset_id;
                    const isMaint = item.is_maintenance === true;

                    return (
                      <tr key={item.asset_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-blue-600 block">{item.asset_id}</span>
                          <span className="font-bold text-slate-800 text-sm">{item.item_name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="block font-medium">{item.category || '-'}</span>
                          <span className="text-[11px] text-slate-400">{item.location || '-'}</span>
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="space-y-2 py-1 max-w-xs">
                              <select
                                value={editForm.is_maintenance ? 'true' : 'false'}
                                onChange={(e) => setEditForm({ ...editForm, is_maintenance: e.target.value === 'true' })}
                                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                              >
                                <option value="false">AVAILABLE (พร้อมใช้งาน)</option>
                                <option value="true">MAINTENANCE (กำลังส่งซ่อม)</option>
                              </select>
                              <input
                                type="text"
                                placeholder="ระบุอาการเสีย / หมายเหตุ..."
                                value={editForm.remarks}
                                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateStatus(item.asset_id)}
                                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] font-semibold"
                                >
                                  บันทึก
                                </button>
                                <button
                                  onClick={() => setEditingAssetId(null)}
                                  className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-[11px]"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {isMaint ? (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  🛠️ MAINTENANCE (กำลังซ่อม)
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✨ AVAILABLE (พร้อมใช้งาน)
                                </span>
                              )}
                              {item.remarks && (
                                <p className="text-[11px] text-slate-500 italic">
                                  หมายเหตุ: {item.remarks}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {!isEditing && (
                            <button
                              onClick={() => {
                                setEditingAssetId(item.asset_id);
                                setEditForm({
                                  is_maintenance: item.is_maintenance || false,
                                  remarks: item.remarks || '',
                                });
                              }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-all"
                            >
                              เปลี่ยนสถานะ/แจ้งซ่อม
                            </button>
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

      {/* 🌟 Modal แจ้งเตือนสุดพรีเมียมแทน alert() แบบเดิม */}
      {modalMessage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-slate-200 p-6 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
              💡
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">แจ้งเตือนระบบ</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{modalMessage}</p>
            </div>
            <button
              onClick={() => setModalMessage(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}