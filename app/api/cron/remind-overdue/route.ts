import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ Service Role Key เพื่อดึงข้อมูลข้ามสิทธิ์ RLS
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
  try {
    const today = new Date();
    
    // ดึงข้อมูลรายการที่ถูกยืมอยู่และยังไม่ได้คืน
    const { data: activeBorrows, error } = await supabase
      .from('borrow_logs')
      .select('*, assets(item_name)')
      .eq('status', 'BORROWED');

    if (error || !activeBorrows) {
      return NextResponse.json({ error: error?.message }, { status: 500 });
    }

    for (const log of activeBorrows) {
      if (!log.due_date) continue;

      const dueDate = new Date(log.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // 1. แจ้งเตือนล่วงหน้า 1 วัน
      if (diffDays === 1) {
        await resend.emails.send({
          from: 'Equipment System <onboarding@resend.dev>',
          to: [log.user_email],
          subject: `⏰ [แจ้งเตือน] อุปกรณ์ ${log.assets?.item_name} ใกล้ครบกำหนดคืนในพรุ่งนี้`,
          html: `
            <p>เรียนคุณ ${log.user_name},</p>
            <p>อุปกรณ์ <b>${log.assets?.item_name}</b> (รหัส: ${log.asset_id}) ที่ท่านยืมไป จะครบกำหนดส่งคืนในพรุ่งนี้</p>
            <p>กรุณานำอุปกรณ์มาส่งคืนและทำเรื่องคืนพัสดุในระบบให้เรียบร้อยครับ</p>
          `,
        });
      } 
      // 2. แจ้งเตือนเมื่อเกินกำหนดคืน (Overdue)
      else if (diffDays < 0) {
        await resend.emails.send({
          from: 'Equipment System <onboarding@resend.dev>',
          to: [log.user_email],
          subject: `🚨 [แจ้งเตือนเกินกำหนดคืน] กรุณาส่งคืนอุปกรณ์ ${log.assets?.item_name}`,
          html: `
            <p>เรียนคุณ ${log.user_name},</p>
            <p style="color: red;"><b>ท่านได้เกินกำหนดส่งคืนอุปกรณ์ ${log.assets?.item_name} (รหัส: ${log.asset_id}) แล้ว</b></p>
            <p>กรุณานำอุปกรณ์มาส่งคืนให้เจ้าหน้าที่โดยด่วนเพื่อหลีกเลี่ยงการถูกปรับชดใช้ค่าเสียหาย</p>
          `,
        });
      }
    }

    return NextResponse.json({ success: true, processedCount: activeBorrows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}