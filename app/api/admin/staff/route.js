import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext } from "../../../../lib/authz";
import { hashPassword } from "../../../../lib/auth";

function toPublic(s) {
  return { id: s.id, username: s.username, name: s.name, campaignIds: JSON.parse(s.campaignIds || "[]"), canViewAggregate: s.canViewAggregate };
}

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const staff = await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ staff: staff.map(toPublic) });
}

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  if (!body.username || !body.password) {
    return NextResponse.json({ error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }
  const passwordHash = await hashPassword(body.password);
  const staff = await prisma.staff.create({
    data: {
      username: body.username,
      passwordHash,
      name: body.name || "",
      campaignIds: JSON.stringify(body.campaignIds || []),
      canViewAggregate: !!body.canViewAggregate,
    },
  });
  return NextResponse.json({ staff: toPublic(staff) });
}
