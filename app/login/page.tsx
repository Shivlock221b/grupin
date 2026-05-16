import { Suspense } from "react";
import { AccountLoginForm } from "@/components/account-login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-12">
      <Suspense>
        <AccountLoginForm />
      </Suspense>
    </main>
  );
}
