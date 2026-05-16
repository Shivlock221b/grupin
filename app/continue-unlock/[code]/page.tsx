import { redirect } from "next/navigation";

export default function ContinueUnlockPage() {
  redirect("/account/coupons");
}
