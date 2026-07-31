import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext } from "../../../../lib/authz";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const refLinks = await prisma.refLink.findMany();
  return NextResponse.json({ refLinks });
}

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const link = await prisma.refLink.create({ data: { label: body.label || "", url: body.url || "" } });
  return NextResponse.json({ link });
}
