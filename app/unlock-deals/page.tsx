import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function UnlockDealsPage() {
  redirect("/catalog/l-oreal-paris");
}
