import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateCode } from "../../../../lib/codegen";

export async function POST(req) {
  const body = await req.json();
  const {
    campaignId, tiktokId, tiktokLink, zaloPhone, address, email,
    gmvNote, gmvNumber, pastBrands, followers, allowReup, aff5,
    video30days, contentDesc,
  } = body;

  if (!campaignId || !tiktokId?.trim() || !tiktokLink?.trim() || !zaloPhone?.trim() || !email?.trim()) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ ok: false, error: "Campaign không tồn tại." }, { status: 404 });
  if (campaign.status === "done") {
    return NextResponse.json({ ok: false, error: "Campaign này đã đóng đăng ký." }, { status: 400 });
  }

  const now = new Date();
  let code = generateCode(zaloPhone, now);
  let finalCode = code;
  let suffix = 0;
  // đảm bảo mã không trùng
  while (await prisma.registration.findUnique({ where: { code: finalCode } })) {
    suffix += 1;
    finalCode = `${code}${suffix}`;
  }

  const record = await prisma.registration.create({
    data: {
      code: finalCode,
      campaignId,
      tiktokId, tiktokLink, zaloPhone,
      address: address || "", email,
      gmvNote: gmvNote || "", gmvNumber: gmvNumber || "",
      pastBrands: JSON.stringify(pastBrands || []),
      followers: followers || "",
      allowReup: allowReup || "", aff5: aff5 || "",
      video30days: video30days || "", contentDesc: contentDesc || "",
      status: "pending", paid: null,
    },
  });

  return NextResponse.json({ ok: true, code: record.code });
}
