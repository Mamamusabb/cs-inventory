'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    // กำหนดค่าตัวสแกน QR
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10, // ความเร็วในการจับภาพต่อวินาที
        qrbox: { width: 250, height: 250 }, // กรอบสี่เหลี่ยมสำหรับเล็ง QR Code
      },
      false
    );

    // เมื่อสแกนเจอข้อมูลสำเร็จ
    const handleScanSuccess = (decodedText: string) => {
      setScanResult(decodedText);
      scanner.clear(); // หยุดกล้องเมื่อสแกนได้แล้ว

      // เช็คว่าลิงก์ที่สแกนเป็น URL ของระบบเราหรือไม่ หรือดึงเอาเฉพาะรหัส Asset ID มาเปิดหน้าเว็บ
      // สมมติถ้าสแกนได้ลิงก์เต็ม https://xxx.vercel.app/asset/PRES-xxxx ให้เด้งไปหน้านั้นทันที
      if (decodedText.startsWith('http')) {
        window.location.href = decodedText;
      } else {
        // ถ้าได้มาแค่รหัส เช่น PRES-CS-SCI-26-AUDIO-0001 ให้วิ่งไปที่หน้า /asset/รหัส นั้นๆ
        router.push(`/asset/${decodedText}`);
      }
    };

    const handleScanError = (error: any) => {
      //ปล่อยผ่าน error ตอนที่ยังหากล้องไม่เจอหรือกำลังเล็งอยู่ เพื่อไม่ให้ console รก
    };

    scanner.render(handleScanSuccess, handleScanError);

    // ทำความสะอาดกล้องเมื่อผู้ใช้ออกจากหน้าเว็บนี้
    return () => {
      scanner.clear().catch((error) => {
        console.error('Failed to clear html5QrcodeScanner. ', error);
      });
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">📷 สแกน QR Code อุปกรณ์</h1>
        <p className="text-sm text-gray-500 mb-4">หันกล้องไปที่ QR Code บนตัวอุปกรณ์เพื่อดูข้อมูล</p>

        {/* กล่องแสดงผลกล้องสแกน */}
        <div id="reader" className="overflow-hidden rounded-xl border border-gray-200"></div>

        {scanResult && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
            สแกนสำเร็จ: <span className="font-mono font-bold">{scanResult}</span>
          </div>
        )}

        <div className="mt-6">
          <a href="/" className="text-blue-600 hover:underline text-sm font-medium">
            ← กลับหน้าแรก
          </a>
        </div>
      </div>
    </div>
  );
}