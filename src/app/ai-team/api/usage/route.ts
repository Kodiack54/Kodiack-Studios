import { NextRequest, NextResponse } from 'next/server';

// Susan's API for AI usage data
const SUSAN_URL = process.env.SUSAN_URL || 'http://161.35.229.220:5403';

export async function GET(request: NextRequest) {
  try {
    // Fetch usage data from Susan (she tracks all AI costs)
    const response = await fetch(`${SUSAN_URL}/api/usage`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        ...data,
      });
    }

    // Fallback: return mock data if Susan is down
    return NextResponse.json({
      success: true,
      totals: {
        requests: 0,
        total_tokens: 0,
        cost_usd: 0,
      },
      budget: {
        monthly_limit: 50,
        used: 0,
        percent_used: 0,
      },
      by_assistant: [],
    });
  } catch (error) {
    console.error('AI usage fetch failed:', error);

    // Return empty data on error
    return NextResponse.json({
      success: true,
      totals: {
        requests: 0,
        total_tokens: 0,
        cost_usd: 0,
      },
      budget: {
        monthly_limit: 50,
        used: 0,
        percent_used: 0,
      },
      by_assistant: [],
    });
  }
}
