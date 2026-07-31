import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext } from "../../../../../lib/authz";

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const data = {};
  ["name", "product", "cost", "requirements", "brief", "brandId", "status"].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  if (body.sampleLinks !== undefined) data.sampleLinks = JSON.stringify(body.sampleLinks);
  const campaign = await prisma.campaign.update({ where: { id: params.id }, data });
  return NextResponse.json({ campaign });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
