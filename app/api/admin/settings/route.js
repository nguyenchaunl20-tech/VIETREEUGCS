import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext } from "../../../../lib/authz";
import { hashPassword } from "../../../../lib/auth";

// Giới hạn kích thước logo (base64) để tránh phình database - khoảng ~1.4MB gốc
const MAX_LOGO_BASE64_LENGTH = 2_000_000;

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return NextResponse.json({ settings: { companyName: settings?.companyName, logoDataUrl: settings?.logoDataUrl || null } });
}

export async function PATCH(req) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const data = {};
  if (body.companyName !== undefined) data.companyName = body.companyName;
  if (body.logoDataUrl !== undefined) {
    if (body.logoDataUrl && body.logoDataUrl.length > MAX_LOGO_BASE64_LENGTH) {
      return NextResponse.json({ error: "Ảnh logo quá lớn, vui lòng dùng ảnh nhỏ hơn (khuyên dùng dưới 1MB)." }, { status: 400 });
    }
    data.logoDataUrl = body.logoDataUrl;
  }
  if (body.newPassword) data.passwordHash = await hashPassword(body.newPassword);

  const settings = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json({ settings: { companyName: settings.companyName, logoDataUrl: settings.logoDataUrl } });
}
