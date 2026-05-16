const faqs = [
  ["How does GruPin unlock work?", "Pick a voucher, start a private room, invite people, and unlock the reward when the room reaches its target."],
  ["Is the token refundable?", "Yes. The token is refundable if the private room does not unlock within the room window."],
  ["Where do I get the coupon code?", "After final payment, the coupon code is delivered to your registered email/phone number within 30 minutes."],
  ["Can I join multiple coupons?", "For now, one phone number can join one coupon unlock in a 24-hour window."],
];

export default function FaqsPage() {
  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Help</p>
        <h1 className="mt-2 text-4xl font-semibold text-slate-950">FAQs</h1>
        <div className="mt-8 space-y-4">
          {faqs.map(([question, answer]) => (
            <div key={question} className="rounded-[8px] border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-950">{question}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
