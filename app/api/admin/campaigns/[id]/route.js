import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext, canAccessCampaign } from "../../../../../lib/authz";

const MAX_IMAGE_BASE64_LENGTH = 2_000_000; // ~1.4MB ảnh gốc

function canManage(ctx, campaignId) {
  if (!ctx) return false;
  if (ctx.isOwner) return true;
  return !!ctx.staff?.canManageCampaigns && canAccessCampaign(ctx, campaignId);
}

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!canManage(ctx, params.id)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  if (body.imageUrl && body.imageUrl.length > MAX_IMAGE_BASE64_LENGTH) {
    return NextResponse.json({ error: "Ảnh quá lớn, vui lòng dùng ảnh nhỏ hơn (dưới 1.5MB)." }, { status: 400 });
  }
  const data = {};
  ["name", "product", "cost", "requirements", "brief", "brandId", "status", "imageUrl", "zaloGroupLink", "trackingLink",
    "goalCreators", "goalViews", "goalGmv", "goalOrders", "requireTiktok", "zaloGroupName"].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  // Hạn air bài: ngày chung (YYYY-MM-DD) và/hoặc số ngày sau khi gửi hàng
  if (body.postDeadline !== undefined) data.postDeadline = /^\d{4}-\d{2}-\d{2}$/.test(body.postDeadline || "") ? body.postDeadline : "";
  if (body.postDays !== undefined) data.postDays = Math.max(0, Math.min(365, parseInt(body.postDays, 10) || 0));
  if (body.sampleLinks !== undefined) data.sampleLinks = JSON.stringify(body.sampleLinks);
  if (body.productOptions !== undefined) data.productOptions = JSON.stringify(body.productOptions);
  if (body.channelFields !== undefined) data.channelFields = JSON.stringify(body.channelFields);
  if (body.followPages !== undefined) data.followPages = JSON.stringify(body.followPages);
  const campaign = await prisma.campaign.update({ where: { id: params.id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!canManage(ctx, params.id)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
