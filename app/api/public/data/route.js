import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// Quan trọng: route này lấy dữ liệu công khai (campaign, brand...) nên KHÔNG được để
// Next.js cache tĩnh - nếu không, campaign mới thêm sẽ không hiện cho khách xem cho tới
// khi deploy lại. force-dynamic bắt buộc route này luôn đọc dữ liệu mới nhất từ Firestore.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [brands, campaigns, refLinks, settings] = await Promise.all([
    prisma.brand.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.refLink.findMany(),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  const safeCampaigns = campaigns.map((c) => ({
    id: c.id,
    brandId: c.brandId,
    name: c.name,
    product: c.product,
    cost: c.cost,
    requirements: c.requirements,
    brief: c.brief,
    sampleLinks: c.sampleLinks,
    status: c.status,
  }));

  return NextResponse.json({
    brands,
    campaigns: safeCampaigns,
    refLinks,
    settings: {
      companyName: settings?.companyName || "Công ty của bạn",
      logoDataUrl: settings?.logoDataUrl || null,
    },
  });
}
