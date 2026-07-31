import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getAuthContext, canAccessCampaign } from "../../../../lib/authz";
import { sendMail, fillTemplate } from "../../../../lib/mailer";

export async function POST(req) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const body = await req.json();
  const { campaignId, codes, subject, mailBody } = body;

  if (!campaignId || !Array.isArray(codes) || codes.length === 0 || !subject?.trim() || !mailBody?.trim()) {
    return NextResponse.json({ error: "Thiếu campaign, danh sách người nhận, tiêu đề hoặc nội dung mail." }, { status: 400 });
  }
  if (!canAccessCampaign(ctx, campaignId)) {
    return NextResponse.json({ error: "Bạn không có quyền thao tác trên campaign này." }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign không tồn tại." }, { status: 404 });

  // Lưu lại nội dung vừa soạn làm mẫu mặc định cho campaign này (dùng lại cho lần gửi sau)
  await prisma.campaign.update({ where: { id: campaignId }, data: { emailSubject: subject, emailBody: mailBody } });

  const results = [];
  for (const code of codes) {
    const reg = await prisma.registration.findUnique({ where: { code } });
    if (!reg || reg.campaignId !== campaignId) {
      results.push({ code, email: reg?.email || "", ok: false, error: "Không tìm thấy đơn thuộc campaign này" });
      continue;
    }
    const vars = {
      tiktokId: reg.tiktokId, code: reg.code, campaignName: campaign.name,
      followers: reg.followers, email: reg.email, zaloPhone: reg.zaloPhone,
    };
    try {
      await sendMail({
        to: reg.email,
        subject: fillTemplate(subject, vars),
        html: fillTemplate(mailBody, vars),
      });
      results.push({ code, email: reg.email, ok: true });
    } catch (e) {
      results.push({ code, email: reg.email, ok: false, error: e.message || "Gửi thất bại" });
    }
  }

  return NextResponse.json({ ok: true, results });
}
