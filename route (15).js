import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext, canAccessCampaign, staffCampaignIds } from "../../../../lib/authz";

export async function GET(req) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const all = searchParams.get("all");

  if (campaignId) {
    if (!canAccessCampaign(ctx, campaignId)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    const registrations = await prisma.registration.findMany({ where: { campaignId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ registrations });
  }

  if (all) {
    if (!ctx.isOwner && !ctx.staff.canViewAggregate) {
      return NextResponse.json({ error: "Không có quyền xem bảng tổng hợp" }, { status: 403 });
    }
    const where = ctx.isOwner ? {} : { campaignId: { in: staffCampaignIds(ctx.staff) } };
    const registrations = await prisma.registration.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ registrations });
  }

  return NextResponse.json({ error: "Thiếu campaignId hoặc all=1" }, { status: 400 });
}
