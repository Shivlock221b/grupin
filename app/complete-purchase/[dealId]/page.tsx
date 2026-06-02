import { redirect } from "next/navigation";

export default function CompletePurchasePage() {
  redirect("/account/orders");
}
