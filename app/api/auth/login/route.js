import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "../../../../lib/auth";

export async function POST(req) {
  try {
    return await handleLogin(req);
  } catch (e) {
    // Hết hạn mức đọc miễn phí trong ngày của Firestore (gói Spark): báo rõ thay vì lỗi chung chung
    if (e && (e.code === 8 || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(String(e.message)))) {
      return NextResponse.json(
        { ok: false, error: "Hệ thống đã hết lượt đọc dữ liệu miễn phí hôm nay. Hạn mức tự làm mới khoảng 14h–15h chiều (giờ VN), vui lòng thử lại sau đó." },
        { status: 503 }
      );
    }
    throw e;
  }
}

async function handleLogin(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Thiếu tài khoản hoặc mật khẩu" }, { status: 400 });
  }

  if (username.trim().toLowerCase() === "admin") {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (settings && (await verifyPassword(password, settings.passwordHash))) {
      const token = await createSessionToken({ type: "owner" });
      const res = NextResponse.json({ ok: true, session: { type: "owner" } });
      setSessionCookie(res, token);
      return res;
    }
  }

  const staffList = await prisma.staff.findMany();
  const staff = staffList.find((s) => s.username.toLowerCase() === username.trim().toLowerCase());
  if (staff && (await verifyPassword(password, staff.passwordHash))) {
    const token = await createSessionToken({ type: "staff", staffId: staff.id });
    const res = NextResponse.json({ ok: true, session: { type: "staff", staffId: staff.id } });
    setSessionCookie(res, token);
    return res;
  }

  return NextResponse.json({ ok: false, error: "Sai tài khoản hoặc mật khẩu" }, { status: 401 });
}
