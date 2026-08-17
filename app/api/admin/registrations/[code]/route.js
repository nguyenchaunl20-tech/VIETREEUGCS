import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext, canAccessCampaign } from "../../../../../lib/authz";

const EDITABLE_FIELDS = [
  "tiktokId", "tiktokLink", "zaloPhone", "address", "email", "gmvNote", "gmvNumber",
  "followers", "allowReup", "aff5", "video30days", "contentDesc", "status", "paid", "selectedProduct",
  // Vận hành campaign: gửi hàng, air bài, số liệu video, GMV/đơn hàng thực tế
  "shipStatus", "shipDate", "postLink", "postDate", "views", "likes", "comments", "shares", "videoGmv", "videoOrders",
  // Thông tin kênh SNS khác tuỳ campaign (Instagram, Facebook, YouTube...)
  "extraFields",
];

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const existing = await prisma.registration.findUnique({ where: { code: params.code } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  if (!canAccessCampaign(ctx, existing.campaignId)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const body = await req.json();
  const data = {};
  EDITABLE_FIELDS.forEach((k) => { if (body[k] !== undefined) data[k] = body[k]; });

  const registration = await prisma.registration.update({ where: { code: params.code }, data });
  return NextResponse.json({ registration });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const existing = await prisma.registration.findUnique({ where: { code: params.code } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });
  if (!canAccessCampaign(ctx, existing.campaignId)) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  await prisma.registration.delete({ where: { code: params.code } });
  return NextResponse.json({ ok: true });
}
