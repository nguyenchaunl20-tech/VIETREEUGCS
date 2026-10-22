// Lịch chạy mỗi sáng (Vercel Cron, xem vercel.json): gửi mail nhắc KOC sắp tới hạn / quá hạn air bài.
// Vercel tự gửi kèm "Authorization: Bearer <CRON_SECRET>" khi biến CRON_SECRET được đặt trong Environment Variables.
// Chạy thử không gửi mail: GET /api/cron/reminders?dry=1 với cùng header.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendDueMails } from "../../../../lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return { ok: false, status: 503, error: "Chưa cấu hình CRON_SECRET (ít nhất 16 ký tự)." };
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, status: 401, error: "Không có quyền." };
  return { ok: true };
}

export async function GET(req) {
  const auth = authorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry") === "1";
  try {
    const result = await sendDueMails({ dryRun });
    console.log("[cron/reminders]", JSON.stringify({ ...result, wouldSend: result.wouldSend?.length }));
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/reminders]", e);
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
