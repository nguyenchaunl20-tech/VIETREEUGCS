import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { generateCode } from "../../../../lib/codegen";

export async function POST(req) {
  const body = await req.json();
  const {
    campaignId, tiktokId, tiktokLink, zaloPhone, address, email,
    gmvNote, gmvNumber, pastBrands, followers, allowReup, aff5,
    video30days, contentDesc, selectedProduct, extraFields,
  } = body;

  if (!campaignId || !zaloPhone?.trim() || !email?.trim()) {
    return NextResponse.json({ ok: false, error: "Thiếu thông tin bắt buộc." }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ ok: false, error: "Campaign không tồn tại." }, { status: 404 });
  if (campaign.status === "done") {
    return NextResponse.json({ ok: false, error: "Campaign này đã đóng đăng ký." }, { status: 400 });
  }

  const requireTiktok = campaign.requireTiktok !== false;
  if (requireTiktok && (!tiktokId?.trim() || !tiktokLink?.trim())) {
    return NextResponse.json({ ok: false, error: "Thiếu ID TikTok hoặc Link TikTok." }, { status: 400 });
  }
  const channelFields = typeof campaign.channelFields === "string" ? JSON.parse(campaign.channelFields || "[]") : (campaign.channelFields || []);
  const missing = channelFields.find((f) => f.required && !String((extraFields || {})[f.id] || "").trim());
  if (missing) {
    return NextResponse.json({ ok: false, error: `Thiếu thông tin bắt buộc: ${missing.label}` }, { status: 400 });
  }

  const brand = await prisma.brand.findUnique({ where: { id: campaign.brandId } });

  const now = new Date();
  let code = generateCode(brand?.name, zaloPhone, now);
  let finalCode = code;
  let suffix = 0;
  // đảm bảo mã không trùng
  while (await prisma.registration.findUnique({ where: { code: finalCode } })) {
    suffix += 1;
    finalCode = `${code}-${suffix}`;
  }

  const record = await prisma.registration.create({
    data: {
      code: finalCode,
      campaignId,
      tiktokId: tiktokId || "", tiktokLink: tiktokLink || "", zaloPhone,
      address: address || "", email,
      gmvNote: gmvNote || "", gmvNumber: gmvNumber || "",
      pastBrands: JSON.stringify(pastBrands || []),
      followers: followers || "",
      allowReup: allowReup || "", aff5: aff5 || "",
      video30days: video30days || "", contentDesc: contentDesc || "",
      selectedProduct: selectedProduct || "",
      extraFields: JSON.stringify(extraFields || {}),
      status: "pending", paid: null,
    },
  });

  return NextResponse.json({ ok: true, code: record.code });
}
