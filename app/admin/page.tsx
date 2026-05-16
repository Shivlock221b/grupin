import { redirect } from "next/navigation";
import { getAdminPortalPath } from "@/lib/admin-keyword-auth";

export default function AdminIndexPage() {
  redirect(getAdminPortalPath("/dashboard"));
}
