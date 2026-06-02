export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Legal</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">Terms & Conditions</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>GruPin lets users create or join brand Team Rooms, add products to their own cart, and unlock Team Price when enough team members participate.</p>
          <p>Starting, joining, and sharing a Team Room is free. Payment is collected only at checkout for products in a user&apos;s cart.</p>
          <p>Team Price access is limited to the room rules shown in the app, including checkout slots, expiry timers, and availability. GruPin may close, expire, or limit rooms to protect users and prevent abuse.</p>
          <p>Orders, delivery, cancellations, replacements, and refunds are subject to the order and refund policies shown on the site.</p>
        </div>
      </div>
    </main>
  );
}
