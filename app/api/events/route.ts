import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    if (!json || !json.t) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
