'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode('reader-hidden-container');
    html5QrCodeRef.current = html5QrCode;

    // ค้นหากล้องทั้งหมด
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          const camList = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
          setCameras(camList);
          const backCamera = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          const targetId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(targetId);

          startNativeCamera(targetId);
        } else {
          setErrorMsg('ไม่พบกล้องในอุปกรณ์นี้');
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setErrorMsg('กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์');
      });

    return () => {
      stopCamera();
    };
  }, []);

  // เปิดกล้องด้วย Native API ของเบราว์เซอร์ (รับประกันไม่มีภาพซ้อน 100%)
  const startNativeCamera = async (cameraId: string) => {
    try {
      stopCamera();
      const constraints = {
        video: { deviceId: { exact: cameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // เพิ่มการดัก try...catch ป้องกัน Error ตอนสั่งเล่นวิดีโอ
        try {
          await videoRef.current.play();
          requestAnimationFrame(scanTick);
        } catch (playErr) {
          console.log('Play interrupted:', playErr);
        }
      }
    } catch (err) {
      console.error('Native camera error:', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            requestAnimationFrame(scanTick);
          } catch (playErr) {}
        }
      } catch (e) {
        setErrorMsg('ไม่สามารถเปิดใช้งานกล้องได้');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // ดึงภาพจากวิดีโอมาตรวจจับ QR Code ทุกๆ เฟรม
  const scanTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // แปลงภาพเป็นไฟล์รูปภาพชั่วคราวเพื่อส่งให้ html5QrCode อ่านค่า
          canvas.toBlob(async (blob) => {
            if (blob && html5QrCodeRef.current && !scanResult) {
              const file = new File([blob], 'snapshot.png', { type: 'image/png' });
              try {
                const decodedText = await html5QrCodeRef.current.scanFile(file, false);
                if (decodedText) {
                  setScanResult(decodedText);
                  stopCamera();
                  if (decodedText.startsWith('http')) {
                    window.location.href = decodedText;
                  } else {
                    router.push(`/asset/${decodedText}`);
                  }
                }
              } catch (e) {
                // ยังไม่เจอ QR Code ในเฟรมนี้ ให้สแกนต่อเรื่อยๆ
              }
            }
          }, 'image/png');
        }
      }
    }
    if (!scanResult) {
      requestAnimationFrame(scanTick);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startNativeCamera(newId);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const html5QrCode = html5QrCodeRef.current || new Html5Qrcode('reader-hidden-container');

      try {
        stopCamera();
        const decodedText = await html5QrCode.scanFile(file, true);
        setScanResult(decodedText);
        if (decodedText.startsWith('http')) {
          window.location.href = decodedText;
        } else {
          router.push(`/asset/${decodedText}`);
        }
      } catch (err) {
        alert('ไม่พบ QR Code ในรูปภาพนี้ หรือรูปภาพไม่ชัดเจน');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white p-6 rounded-3xl shadow-xl border border-slate-200 text-center">
        
        {/* หัวข้อ */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-2 border border-emerald-100 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V5a2 2 0 012-2h4m10 4V5a2 2 0 00-2-2h-4m10 10v4a2 2 0 01-2 2h-4m-10 0v4a2 2 0 002 2h4"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">สแกน QR Code อุปกรณ์</h1>
          <p className="text-xs text-slate-500 mt-0.5">หันกล้องไปที่ QR Code หรืออัปโหลดรูปภาพเพื่อดูข้อมูล</p>
        </div>

        {/* กรอบกล้องจริง (ใช้ tag video ควบคุมเอง ไม่มีทางซ้อน) */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-inner aspect-square flex items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          <div id="reader-hidden-container" className="hidden"></div>
          
          {/* กรอบเล็ง QR Code ตรงกลาง */}
          <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/80 rounded-xl"></div>
          </div>
        </div>

        {/* UI ควบคุมใต้กล้อง */}
        <div className="mt-4 space-y-3">
          {cameras.length > 1 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">📷 เลือกกล้อง:</span>
              <select 
                value={selectedCameraId} 
                onChange={handleCameraChange}
                className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium py-2.5 px-4 rounded-xl cursor-pointer text-xs transition-colors border border-emerald-200 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            อัปโหลดรูปภาพ QR Code จากเครื่อง
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100">
            {errorMsg}
          </div>
        )}

        {scanResult && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs border border-emerald-100 flex items-center justify-center gap-2">
            <span>สแกนสำเร็จ: <strong className="font-mono">{scanResult}</strong></span>
          </div>
        )}

        <div className="mt-5">
          <a 
            href="/" 
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all border border-slate-200"
          >
            ← กลับสู่หน้าหลัก
          </a>
        </div>

      </div>
    </div>
  );
}