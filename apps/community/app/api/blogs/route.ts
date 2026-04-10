import { NextRequest, NextResponse } from "next/server";
import { javaFetch, extractToken } from "@/lib/javaApi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "0";
    const size = searchParams.get("size") ?? "20";
    const category = searchParams.get("category");

    let path = `/blogs?page=${page}&size=${size}`;
    if (category && category !== "All") path += `&category=${encodeURIComponent(category)}`;

    const token = extractToken(req.headers.get("authorization"));
    const data = await javaFetch(path, { token });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
