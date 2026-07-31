import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext } from "../../../../../lib/authz";

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const data = {};
  if (body.label !== undefined) data.label = body.label;
  if (body.url !== undefined) data.url = body.url;
  const link = await prisma.refLink.update({ where: { id: params.id }, data });
  return NextResponse.json({ link });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.refLink.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
