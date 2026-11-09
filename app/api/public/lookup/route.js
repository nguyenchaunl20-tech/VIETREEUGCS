import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const dynamic = "force-dynamic";

function publicView(reg) {
  const showPaid = reg.campaign?.status === "done" && !!reg.campaign?.cost;
  const selected = reg.status === "selected";
  return {
    code: reg.code,
    status: reg.status,
    tiktokId: reg.tiktokId,
    campaignName: reg.campaign?.name || "",
    paid: showPaid ? reg.paid : undefined,
    zaloGroupLink: selected ? reg.campaign?.zaloGroupLink || "" : undefined,
    brief: selected ? reg.campaign?.brief || "" : undefined,
    // Mã vận đơn J&T của riêng UGC này (chỉ hiện khi đã được chọn)
    trackingCode: selected ? reg.trackingCode || "" : undefined,
    shipStatus: selected ? reg.shipStatus || "" : undefined,
    shipDate: selected ? reg.shipDate || "" : undefined,
  };
}

const normId = (s) => String(s || "").trim().toLowerCase()
  .replace(/^https?:\/\/(www\.)?tiktok\.com\//, "").replace(/^@/, "").replace(/[/?].*$/, "");
const digits = (s) => String(s || "").replace(/\D/g, "");

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  const tiktok = normId(searchParams.get("tiktok"));
  const pin = digits(searchParams.get("pin"));

  // Cách 2: TikTok ID + PIN (4 số cuối SĐT) — cho UGC quên mã đăng ký.
  // Chỉ tìm trong đơn ĐÃ ĐƯỢC CHỌN để giới hạn lượt đọc Firestore.
  if (tiktok) {
    if (pin.length !== 4) return NextResponse.json({ found: false, error: "PIN phải là 4 số cuối SĐT" });
    const regs = await prisma.registration.findMany({ where: { status: "selected" } });
    const hits = regs.filter((r) => normId(r.tiktokId) === tiktok && digits(r.zaloPhone).endsWith(pin));
    if (!hits.length) return NextResponse.json({ found: false });
    const campIds = [...new Set(hits.map((r) => r.campaignId))];
    const camps = new Map();
    for (const id of campIds) camps.set(id, await prisma.campaign.findUnique({ where: { id } }));
    const results = hits.map((r) => publicView({ ...r, campaign: camps.get(r.campaignId) }));
    return NextResponse.json({ found: true, ...results[0], results });
  }

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
  const one = publicView(reg);
  return NextResponse.json({ found: true, ...one, results: [one] });
}
