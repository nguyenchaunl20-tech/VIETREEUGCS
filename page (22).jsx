import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getAuthContext } from "../../../../../lib/authz";
import { hashPassword } from "../../../../../lib/auth";

export async function PATCH(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  const body = await req.json();
  const data = {};
  if (body.username !== undefined) data.username = body.username;
  if (body.name !== undefined) data.name = body.name;
  if (body.campaignIds !== undefined) data.campaignIds = JSON.stringify(body.campaignIds);
  if (body.canViewAggregate !== undefined) data.canViewAggregate = !!body.canViewAggregate;
  if (body.canManageCampaigns !== undefined) data.canManageCampaigns = !!body.canManageCampaigns;
  if (body.canManageBrands !== undefined) data.canManageBrands = !!body.canManageBrands;
  if (body.password) data.passwordHash = await hashPassword(body.password);

  const staff = await prisma.staff.update({ where: { id: params.id }, data });
  return NextResponse.json({
    staff: {
      id: staff.id, username: staff.username, name: staff.name,
      campaignIds: JSON.parse(staff.campaignIds || "[]"),
      canViewAggregate: staff.canViewAggregate,
      canManageCampaigns: !!staff.canManageCampaigns,
      canManageBrands: !!staff.canManageBrands,
    },
  });
}

export async function DELETE(req, { params }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isOwner) return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  await prisma.staff.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
