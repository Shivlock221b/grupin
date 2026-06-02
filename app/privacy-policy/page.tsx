export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Privacy</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">Privacy Policy</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>We collect details such as name, phone number, email, delivery address, Team Room activity, cart details, and order details to verify users, manage Team Rooms, process payments, and support deliveries.</p>
          <p>We do not show private phone numbers or emails publicly inside Team Rooms. Room activity may show masked phone details so members can understand what changed. Payment processing is handled through Razorpay.</p>
          <p>You can contact shivam.83240@gmail.com for account or data questions.</p>
        </div>
      </div>
    </main>
  );
}
