import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext } from "../../../../../lib/authz";

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const brand = await prisma.brand.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.isOwn !== undefined && { isOwn: !!body.isOwn }),
    },
  });
  return NextResponse.json({ brand });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.brand.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
