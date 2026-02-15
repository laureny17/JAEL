import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/backend-url';

const BASE = getBackendBaseUrl();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const { songId } = await params;
    const query = req.nextUrl.search || '';
    const res = await fetch(`${BASE}/api/songs/${songId}/leaderboard${query}`, {
      cache: 'no-store',
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proxy request failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
