'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ฟอร์มสำหรับเพิ่มอุปกรณ์ใหม่
  const [formData, setFormData] = useState({
    asset_id: '',
    item_name: '',
    category: '',
    brand: '',
    model: '',
    location: '',
    condition: 'GOOD',
    responsible_person: '',
  });

  // โหลดรายการพัสดุทั้งหมด
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
    fetchAssets();
  }, []);

  // ฟังก์ชันเพิ่มอุปกรณ์ใหม่
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_id || !formData.item_name) {
      alert('กรุณากรอกรหัส Asset ID และชื่ออุปกรณ์');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('assets').insert([formData]);

    if (error) {
      console.error('Error adding asset:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์ (รหัส Asset ID อาจซ้ำ)');
    } else {
      alert('เพิ่มอุปกรณ์เข้าคลังสำเร็จ!');
      setFormData({
        asset_id: '',
        item_name: '',
        category: '',
        brand: '',
        model: '',
        location: '',
        condition: 'GOOD',
        responsible_person: '',
      });
      fetchAssets();
    }
    setSubmitting(false);
  };

  // ฟังก์ชันลบอุปกรณ์
  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm(`คุณต้องการลบอุปกรณ์รหัส ${assetId} ใช่หรือไม่?`)) return;

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('asset_id', assetId);

    if (error) {
      console.error('Error deleting asset:', error);
      alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
    } else {
      alert('ลบอุปกรณ์เรียบร้อยแล้ว');
      fetchAssets();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ส่วนหัว */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">Admin Portal</span>
            <h1 className="text-2xl font-bold text-slate-900">จัดการคลังพัสดุสโมสร</h1>
          </div>
          <button
            onClick={() => router.push('/scan')}
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md"
          >
            ← กลับไปหน้าสแกน QR Code
          </button>
        </div>

        {/* ฟอร์มเพิ่มอุปกรณ์ใหม่ */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">➕ เพิ่มอุปกรณ์ใหม่เข้าคลัง</h2>
          
          <form onSubmit={handleAddAsset} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Asset ID (รหัสพัสดุ / QR)</label>
              <input
                type="text"
                placeholder="เช่น PRES-CS-SCI-26-TOOL-0003"
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ชื่ออุปกรณ์</label>
              <input
                type="text"
                placeholder="เช่น กล้อง DSLR, ขาตั้งกล้อง"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">หมวดหมู่ (Category)</label>
              <input
                type="text"
                placeholder="เช่น MEDIA, TOOL, GENERAL"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">แบรนด์ (Brand)</label>
              <input
                type="text"
                placeholder="เช่น Sony, Stanley"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">รุ่น (Model)</label>
              <input
                type="text"
                placeholder="เช่น A7IV, Multi-bit"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">สถานที่จัดเก็บ (Location)</label>
              <input
                type="text"
                placeholder="เช่น ห้องสโมสร, ตู้เก็บของ A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">สภาพอุปกรณ์ (Condition)</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="GOOD">GOOD (สภาพดี)</option>
                <option value="NEW">NEW (ของใหม่)</option>
                <option value="FAIR">FAIR (พอใช้)</option>
                <option value="DAMAGED">DAMAGED (ชำรุด)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ผู้รับผิดชอบ (Responsible)</label>
              <input
                type="text"
                placeholder="เช่น ทีมพัสดุ, ฝ่ายเทคโนโลยี"
                value={formData.responsible_person}
                onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-md"
              >
                {submitting ? 'กำลังบันทึก...' : '+ บันทึกเพิ่มอุปกรณ์'}
              </button>
            </div>
          </form>
        </div>

        {/* ตารางแสดงรายการอุปกรณ์ทั้งหมด */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 mb-4">📦 รายการอุปกรณ์ทั้งหมดในคลัง ({assets.length})</h2>

          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">ยังไม่มีข้อมูลอุปกรณ์ในระบบ</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Asset ID</th>
                    <th className="py-3 px-4">ชื่ออุปกรณ์</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">สถานที่เก็บ</th>
                    <th className="py-3 px-4">สภาพ</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {assets.map((item) => (
                    <tr key={item.asset_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">{item.asset_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.item_name}</td>
                      <td className="py-3 px-4 text-slate-600">{item.category || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{item.location || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.condition || 'GOOD'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteAsset(item.asset_id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 px-3 rounded-lg text-[11px] transition-all"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}