import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  if (!code) return NextResponse.json({ found: false });

  // Trước đây dùng mode "insensitive" => phải tải TOÀN BỘ đơn đăng ký về để so sánh,
  // mỗi lần tra cứu tốn cả nghìn lượt đọc Firestore. Mã do hệ thống sinh luôn viết HOA,
  // nên chỉ cần thử vài cách viết (HOA / như khách gõ / thường), mỗi lần chỉ đọc 1 đơn.
  const variants = [...new Set([code.toUpperCase(), code, code.toLowerCase()])];
  let reg = null;
  for (const v of variants) {
    reg = await prisma.registration.findFirst({ where: { code: v }, include: { campaign: true } });
    if (reg) break;
  }

  if (!reg) return NextResponse.json({ found: false });

  const showPaid = reg.campaign.status === "done" && !!reg.campaign.cost;
  const selected = reg.status === "selected";

  return NextResponse.json({
    found: true,
    code: reg.code,
    status: reg.status,
    tiktokId: reg.tiktokId,
    campaignName: reg.campaign.name,
    paid: showPaid ? reg.paid : undefined,
    zaloGroupLink: selected ? reg.campaign.zaloGroupLink || "" : undefined,
    trackingLink: selected ? reg.campaign.trackingLink || "" : undefined,
    // Mã vận đơn J&T của riêng UGC này (chỉ hiện khi đã được chọn)
    trackingCode: selected ? reg.trackingCode || "" : undefined,
    shipStatus: selected ? reg.shipStatus || "" : undefined,
    shipDate: selected ? reg.shipDate || "" : undefined,
  });
}
