import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext } from "../../../../lib/authz";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const brands = await prisma.brand.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ brands });
}

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const brand = await prisma.brand.create({
    data: {
      name: body.name || "Brand mới",
      color: body.color || "#5B4CFF",
      isOwn: !!body.isOwn,
    },
  });
  return NextResponse.json({ brand });
}
