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
  ["name", "product", "cost", "requirements", "brief", "brandId", "status", "imageUrl", "zaloGroupLink", "trackingLink"].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  if (body.sampleLinks !== undefined) data.sampleLinks = JSON.stringify(body.sampleLinks);
  const campaign = await prisma.campaign.update({ where: { id: params.id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!canManage(ctx, params.id)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
