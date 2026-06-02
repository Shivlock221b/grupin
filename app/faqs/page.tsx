const faqs = [
  ["How does GruPin Team Price work?", "Pick products from a brand catalog, start or join a Team Room, and add products to your cart. When enough team members have carts, Team Price unlocks."],
  ["Who gets the Team Price?", "After the room unlocks, the first successful checkouts claim the Team Price slots. If you miss it this time, you can start a new Team Room and unlock again."],
  ["Can I add multiple products?", "Yes. Your cart can include multiple products from the same brand catalog while the Team Room is active."],
  ["When do I pay?", "Starting, joining, and sharing are free. You pay only at checkout after Team Price unlocks."],
  ["Can I leave a Team Room?", "Yes. If you leave before checkout, your cart is removed from that room and you can start or join another room for the brand."],
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
