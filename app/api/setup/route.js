import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { hashPassword } from "../../../lib/auth";

// Trang thiết lập 1 lần: mở link này trên trình duyệt sau khi deploy xong để tạo tài khoản admin,
// không cần cài Node.js hay dùng terminal ở máy tính.
// Ví dụ: https://ten-du-an.vercel.app/api/setup?key=GIA_TRI_BAN_DAT_O_SETUP_KEY
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!process.env.SETUP_KEY) {
    return NextResponse.json(
      { ok: false, error: "Chưa cấu hình biến môi trường SETUP_KEY trên nơi bạn deploy." },
      { status: 500 }
    );
  }
  if (key !== process.env.SETUP_KEY) {
    return NextResponse.json({ ok: false, error: "Sai khoá thiết lập." }, { status: 403 });
  }

  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) {
    return NextResponse.json({
      ok: true,
      message: "Tài khoản admin đã tồn tại rồi, không cần tạo lại. Đăng nhập ở trang /admin bằng username \"admin\" và mật khẩu bạn đã đặt trước đó.",
    });
  }

  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
  const passwordHash = await hashPassword(initialPassword);
  await prisma.settings.create({
    data: { id: 1, companyName: "Công ty của bạn", passwordHash },
  });

  return NextResponse.json({
    ok: true,
    message: `Đã tạo tài khoản admin thành công! Vào trang /admin, đăng nhập bằng username "admin" và mật khẩu "${initialPassword}", sau đó đổi mật khẩu ngay trong tab Cài đặt.`,
  });
}
