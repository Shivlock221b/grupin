export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[8px] border border-slate-200 bg-white p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Policy</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">Refund Policy</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
          <p>We do not offer refunds for confirmed orders. Items ordered through GruPin are not refundable.</p>
          <p>Defective or unsealed items may be exchanged if reported within 12 hours of delivery.</p>
          <p>
            To request an exchange, email your order ID and order details to{" "}
            <a href="mailto:shivam.83240@gmail.com" className="font-semibold text-cyan-700">
              shivam.83240@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
