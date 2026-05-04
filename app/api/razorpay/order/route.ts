import { NextRequest, NextResponse } from "next/server";
import { getGroupDealById } from "@/lib/data";

const amount = 99 * 100;

export async function POST(request: NextRequest) {
  try {
    const { dealId } = await request.json();

    if (!dealId || typeof dealId !== "string") {
      return NextResponse.json({ message: "Deal id is required." }, { status: 400 });
    }

    const deal = await getGroupDealById(dealId);

    if (!deal) {
      return NextResponse.json({ message: "Deal not found." }, { status: 404 });
    }

    if (new Date(deal.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: "Deal expired." }, { status: 410 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({
        keyId: "rzp_test_demo",
        orderId: `order_demo_${Date.now()}`,
        amount,
        currency: "INR",
        demoMode: true,
      });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `grupin_${deal.id}_${Date.now()}`.slice(0, 40),
        notes: {
          dealId: deal.id,
          title: deal.title,
        },
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: order.error?.description ?? "Could not create Razorpay order." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json({ message: "Could not create Razorpay order." }, { status: 500 });
  }
}
