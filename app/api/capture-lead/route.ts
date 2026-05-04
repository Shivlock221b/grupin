import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandName, productName, price, email, sessionId } = body;

    // For MVP, we'll log to console. In production, you'd store in database
    console.log('Lead captured:', {
      brandName,
      productName,
      price,
      email: email || 'not provided',
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    // In a real implementation, you'd save to database here
    // await saveToDatabase({ brandName, productName, price, email, sessionId, timestamp: new Date() });

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully'
    });
  } catch (error) {
    console.error('Error capturing lead:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}