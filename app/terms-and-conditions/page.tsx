export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Legal</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">Terms & Conditions</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>GruPin lets users participate in private voucher unlock rooms. Token payments reserve participation and may be refundable if a room does not unlock.</p>
          <p>Final voucher delivery happens after the remaining amount is paid. Voucher use remains subject to the issuing brand or voucher provider terms.</p>
          <p>GruPin may limit unlock participation, inventory, or access to protect users and prevent abuse.</p>
        </div>
      </div>
    </main>
  );
}
