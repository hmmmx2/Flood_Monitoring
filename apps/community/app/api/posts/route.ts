import { NextRequest, NextResponse } from "next/server";
import { javaFetch, extractToken } from "@/lib/javaApi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "0";
    const size = searchParams.get("size") ?? "20";
    const sort = searchParams.get("sort") ?? "new";
    const group = searchParams.get("group") ?? "";
    const token = extractToken(req.headers.get("authorization"));
    const groupParam = group ? `&group=${encodeURIComponent(group)}` : "";
    const data = await javaFetch<unknown>(
      `/community/posts?page=${page}&size=${size}&sort=${sort}${groupParam}`,
      { token }
    );
    return NextResponse.json(data);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get("authorization"));
    const body = await req.json();
    const data = await javaFetch<unknown>("/community/posts", { method: "POST", body, token });
    return NextResponse.json(data);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status });
  }
}
