import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext, staffCampaignIds } from "../../../../lib/authz";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const all = await prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  const list = ctx.isOwner ? all : all.filter((c) => staffCampaignIds(ctx.staff).includes(c.id));
  return NextResponse.json({ campaigns: list });
}

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx || !(ctx.isOwner || ctx.staff?.canManageCampaigns)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  if (!body.brandId) return NextResponse.json({ error: "Thiếu brandId" }, { status: 400 });
  const campaign = await prisma.campaign.create({
    data: {
      brandId: body.brandId,
      name: body.name || "Campaign mới",
      product: body.product || "",
      cost: body.cost || "",
      requirements: body.requirements || "",
      brief: body.brief || "",
      sampleLinks: JSON.stringify(body.sampleLinks || []),
      productOptions: JSON.stringify(body.productOptions || []),
      imageUrl: body.imageUrl || "",
      zaloGroupLink: body.zaloGroupLink || "",
      trackingLink: body.trackingLink || "",
      status: "active",
    },
  });

  // Nếu người tạo là nhân viên (không phải chủ tài khoản), tự động cấp quyền xem cho campaign vừa tạo
  if (!ctx.isOwner) {
    const ids = staffCampaignIds(ctx.staff);
    if (!ids.includes(campaign.id)) {
      await prisma.staff.update({ where: { id: ctx.staff.id }, data: { campaignIds: JSON.stringify([...ids, campaign.id]) } });
    }
  }

  return NextResponse.json({ campaign });
}
