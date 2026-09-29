import React from 'react';
import { supabase } from '@/lib/supabase';

const getStatusBadge = (status: string | null) => {
  if (!status) return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold border border-gray-200">-</span>;
  
  const s = status.toUpperCase();
  if (s === 'AVAILABLE' || s === 'พร้อมใช้งาน') {
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-200">🟢 {status}</span>;
  }
  if (s === 'BORROWED' || s === 'ถูกยืม') {
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold border border-gray-200">🟡 {status}</span>;
  }
  if (s === 'REPAIR' || s === 'ส่งซ่อม') {
    return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold border border-red-200">🔴 {status}</span>;
  }
  return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold border border-gray-200">{status}</span>;
};

export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const assetId = resolvedParams.id;

  const { data: asset, error } = await supabase
    .from('assets')
    .select('*')
    .eq('asset_id', assetId)
    .single();

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-md text-center max-w-sm w-full border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-red-500 mb-2">❌ ไม่พบข้อมูลอุปกรณ์</h2>
          <p className="text-gray-600 mb-4">ไม่มีรหัส <span className="font-mono font-bold">{assetId}</span> ในระบบ</p>
          <a href="/" className="text-blue-600 hover:underline">กลับหน้าแรก</a>
        </div>
      </div>
    );
  }

  const updatedDate = asset.updated_at 
    ? new Date(asset.updated_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '-';

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center p-4 sm:p-8 font-sans">
      <div className="max-w-md w-full">
        
        <div className="text-center mb-6">
          <h1 className="text-gray-500 font-medium">💻 CS Student Org. Inventory</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 p-6 text-center text-white">
            <p className="text-sm text-blue-200 mb-1">Asset ID</p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-wider break-words">{asset.asset_id}</h2>
          </div>

          <div className="p-6 space-y-4">
            
            <div className="border-b border-gray-100 pb-3">
              <p className="text-xs text-gray-400 mb-1">ชื่ออุปกรณ์ (Item Name)</p>
              <p className="text-lg font-bold text-gray-900">{asset.item_name || '-'}</p>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <p className="text-xs text-gray-400 mb-2">สถานะปัจจุบัน (Status)</p>
              {getStatusBadge(asset.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">หมวดหมู่ (Category)</p>
                <p className="text-gray-900 text-sm font-medium">{asset.category || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">แบรนด์ / รุ่น</p>
                <p className="text-gray-900 text-sm font-medium">{asset.brand || '-'} {asset.model ? `/ ${asset.model}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">สถานที่จัดเก็บ</p>
                <p className="text-gray-900 text-sm">{asset.location || '-'} {asset.cabinet ? `(${asset.cabinet})` : ''}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">สภาพ (Condition)</p>
                <p className="text-gray-900 text-sm">{asset.condition || '-'}</p>
              </div>
            </div>

            <div className="border-b border-gray-100 pb-3">
              <p className="text-xs text-gray-400 mb-1">ผู้รับผิดชอบ (Responsible)</p>
              <p className="text-gray-900 text-sm">{asset.responsible_person || '-'}</p>
            </div>

            {asset.note && (
              <div className="border-b border-gray-100 pb-3">
                <p className="text-xs text-gray-400 mb-1">หมายเหตุ (Note)</p>
                <p className="text-gray-700 text-sm bg-yellow-50 p-2 rounded">{asset.note}</p>
              </div>
            )}

            <div className="pb-2 text-center mt-4">
              <p className="text-xs text-gray-400">อัปเดตข้อมูลล่าสุด: {updatedDate}</p>
            </div>

            <div className="flex gap-3 pt-2 mt-2">
              <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors">
                ทำเรื่องยืม (Borrow)
              </button>
              <button className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-3 rounded-xl text-sm font-bold transition-colors">
                แจ้งซ่อม (Repair)
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}