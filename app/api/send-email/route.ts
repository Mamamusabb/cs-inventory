import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json({ error: 'Missing RESEND_API_KEY environment variable' }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);
    const { type, userName, userEmail, assetId, itemName, purpose } = await request.json();

    const adminEmails = ['admin1@example.com', 'admin2@example.com']; // อีเมลของกลุ่มแอดมิน

    let subject = '';
    let htmlContent = '';

    if (type === 'NEW_BORROW') {
      subject = `📋 [แจ้งเตือนยืมพัสดุ] คำขอใหม่จากคุณ ${userName}`;
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">📋 มีคำขอยืมพัสดุใหม่รอการตรวจสอบ</h2>
          <p><b>ผู้ยืม:</b> ${userName} (${userEmail})</p>
          <p><b>รหัสพัสดุ:</b> ${assetId}</p>
          <p><b>ชื่ออุปกรณ์:</b> ${itemName}</p>
          <p><b>วัตถุประสงค์:</b> "${purpose}"</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p>กรุณาเข้าสู่ระบบผู้ดูแลระบบเพื่อตรวจสอบข้อตกลงและลงลายมือชื่ออนุมัติ</p>
        </div>
      `;
    } else if (type === 'NEW_RETURN') {
      subject = `📦 [แจ้งเตือนส่งคืนพัสดุ] คุณ ${userName} ทำรายการส่งคืนพัสดุแล้ว`;
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #7c3aed;">📦 มีการส่งคืนพัสดุพร้อมหลักฐานรูปถ่าย</h2>
          <p><b>ผู้ส่งคืน:</b> ${userName} (${userEmail})</p>
          <p><b>รหัสพัสดุ:</b> ${assetId}</p>
          <p><b>ชื่ออุปกรณ์:</b> ${itemName}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p>กรุณาเข้าสู่ระบบผู้ดูแลระบบเพื่อตรวจรับพัสดุและลงลายมือชื่อรับคืน</p>
        </div>
      `;
    }

    const data = await resend.emails.send({
      from: 'Equipment System <onboarding@resend.dev>',
      to: adminEmails,
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}