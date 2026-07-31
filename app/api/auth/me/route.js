import { NextResponse } from "next/server";
import { getAuthContext, staffCampaignIds } from "../../../../lib/authz";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ session: null });

  if (ctx.isOwner) {
    return NextResponse.json({ session: { type: "owner" } });
  }

  return NextResponse.json({
    session: {
      type: "staff",
      staffId: ctx.staff.id,
      name: ctx.staff.name,
      username: ctx.staff.username,
      campaignIds: staffCampaignIds(ctx.staff),
      canViewAggregate: ctx.staff.canViewAggregate,
      canManageCampaigns: !!ctx.staff.canManageCampaigns,
      canManageBrands: !!ctx.staff.canManageBrands,
    },
  });
}
