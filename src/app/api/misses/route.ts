import { NextResponse } from "next/server";
import { readMisses } from "@/core/misslog";

// GET /api/misses?limit=50
// Перегляд зібраних «промахів» (запити, де система не дала впевненої спец).
// Це сировина для майбутнього розміченого датасету / донавчання ML.
//
// ПРИВАТНІСТЬ: ендпоінт віддає тексти реальних запитів клієнтів. Перед публічним
// деплоєм виставте env MISSES_TOKEN — тоді доступ лише з ?token=... (інакше 401).
// Без MISSES_TOKEN ендпоінт відкритий (зручно локально, НЕ для проду).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const required = process.env.MISSES_TOKEN;
  if (required && url.searchParams.get("token") !== required) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const data = await readMisses(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json(data);
}
