import { NextResponse } from "next/server";
import { prisma, db } from "../../../../../lib/db";
import { getAuthContext, canAccessCampaign } from "../../../../../lib/authz";

// Đổi trạng thái duyệt cho nhiều đơn cùng lúc (vd: chọn hết các đơn AI đề xuất "Nên chọn").
// Body: { campaignId, codes: ["CODE-1", ...], status: "pending" | "suitable" | "selected" }
const ALLOWED_STATUS = ["pending", "suitable", "selected"];
const BATCH_LIMIT = 450; // Firestore giới hạn 500 thao tác / batch

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { campaignId, codes, status } = body;

  if (!campaignId || !Array.isArray(codes) || codes.length === 0) {
    return NextResponse.json({ error: "Thiếu campaignId hoặc danh sách mã đơn" }, { status: 400 });
  }
  if (!ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }
  if (!canAccessCampaign(ctx, campaignId)) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  // Chỉ cập nhật đơn thuộc đúng campaign này — mã lạ hoặc của campaign khác bị bỏ qua
  const wanted = new Set(codes.map(String));
  const regs = await prisma.registration.findMany({ where: { campaignId } });
  const targets = regs.filter((r) => wanted.has(r.code));

  for (let i = 0; i < targets.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    targets.slice(i, i + BATCH_LIMIT).forEach((r) => {
      batch.update(db.collection("registrations").doc(r.id), { status });
    });
    await batch.commit();
  }

  return NextResponse.json({
    updated: targets.length,
    notFound: codes.length - targets.length,
    codes: targets.map((r) => r.code),
  });
}
