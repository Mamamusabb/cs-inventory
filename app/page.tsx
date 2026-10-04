'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScanPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isScanning) return;

    const scanner = new Html5QrcodeScanner(
      'qr-reader-page',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        setIsScanning(false);
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
  }, [isScanning, router]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    router.push(`/asset/${manualCode.trim()}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
            <span>💻</span> ระบบจัดการทรัพย์สิน
          </h1>
          <p className="text-xs text-slate-500 mt-1">กิจกรรมนักศึกษา ภาควิชาวิทยาการคอมพิวเตอร์</p>
        </div>

        <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
          📷 <b>วิธีใช้งาน:</b> กรุณาสแกน QR Code ที่ติดอยู่บนตัวอุปกรณ์ เพื่อดูข้อมูล หรือทำการเรื่องยืม-คืน
        </div>

        {/* ช่องค้นหาด้วยรหัส */}
        <form onSubmit={handleManualSearch} className="space-y-3 pt-2">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">หรือค้นหาด้วยรหัส</span>
          </div>
          <input
            type="text"
            placeholder="เช่น PRES-CS-SCI-26-TOOL-0001"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-sm transition text-xs"
          >
            ค้นหาข้อมูลอุปกรณ์
          </button>
        </form>

        {/* ส่วนกล้องสแกน QR Code */}
        <div className="pt-2 border-t space-y-3">
          {!isScanning ? (
            <button
              onClick={() => setIsScanning(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-2xl shadow-sm transition flex items-center justify-center gap-2 text-xs"
            >
              <span>📷</span> เปิดกล้องสแกน QR Code
            </button>
          ) : (
            <div className="space-y-3">
              <div id="qr-reader-page" className="overflow-hidden rounded-2xl border bg-slate-50" />
              <button
                onClick={() => setIsScanning(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition"
              >
                ✕ ปิดกล้อง
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}