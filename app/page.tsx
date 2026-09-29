'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [assetId, setAssetId] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (assetId.trim()) {
      // เมื่อกดค้นหา ให้เด้งไปที่หน้าของอุปกรณ์นั้นๆ
      router.push(`/asset/${assetId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full border-t-4 border-blue-600">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">💻 ระบบจัดการทรัพย์สิน</h1>
          <p className="text-gray-500 text-sm">สโมสรนักศึกษา ภาควิทยาการคอมพิวเตอร์</p>
        </div>

        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 text-sm">
          📸 <strong>วิธใช้งาน:</strong> กรุณาสแกน QR Code ที่ติดอยู่บนตัวอุปกรณ์ เพื่อดูข้อมูล หรือทำเรื่องยืม-คืน
        </div>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">หรือค้นหาด้วยรหัส</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="เช่น PRES-CS-SCI-26-TOOL-0001"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            ค้นหาข้อมูลอุปกรณ์
          </button>
        </form>

      </div>
    </div>
  );
}