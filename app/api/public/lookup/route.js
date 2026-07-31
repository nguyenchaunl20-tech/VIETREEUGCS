import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").trim();
  if (!code) return NextResponse.json({ found: false });

  const reg = await prisma.registration.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    include: { campaign: true },
  });

  if (!reg) return NextResponse.json({ found: false });

  const showPaid = reg.campaign.status === "done" && !!reg.campaign.cost;

  return NextResponse.json({
    found: true,
    code: reg.code,
    status: reg.status,
    tiktokId: reg.tiktokId,
    campaignName: reg.campaign.name,
    paid: showPaid ? reg.paid : undefined,
  });
}
