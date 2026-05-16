import { NextResponse } from "next/server";
import { hasAdminKeywordSessionFromCookieHeader } from "@/lib/admin-keyword-auth";
import { getDealByIdAdmin, listInterestsByDeal } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  if (!hasAdminKeywordSessionFromCookieHeader(request.headers.get("cookie"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [deal, interests] = await Promise.all([getDealByIdAdmin(id), listInterestsByDeal(id)]);

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const header = [
    "full_name",
    "email",
    "phone",
    "whatsapp_opt_in",
    "area",
    "city",
    "joined_at",
    "join_status",
    "deal_title",
    "deal_slug",
    "merchant",
    "deal_status",
  ];
  const rows = interests.map((interest) =>
    [
      interest.profile.fullName,
      interest.profile.email,
      interest.profile.phone,
      interest.profile.whatsappOptIn ? "yes" : "no",
      interest.profile.area ?? "",
      interest.profile.city ?? deal.city,
      interest.createdAt,
      interest.status,
      deal.title,
      deal.slug,
      deal.merchant,
      deal.status,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${deal.slug}-interests.csv"`,
    },
  });
}
