import { NextResponse } from "next/server";
import { readMisses } from "@/core/misslog";

// GET /api/misses?limit=50
// Перегляд зібраних «промахів» (запити, де система не дала впевненої спец).
// Це сировина для майбутнього розміченого датасету / донавчання ML.
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  const data = await readMisses(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json(data);
}
