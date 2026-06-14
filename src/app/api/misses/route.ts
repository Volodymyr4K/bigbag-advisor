import { NextResponse } from "next/server";
import { readMisses } from "@/core/misslog";

// GET /api/misses?limit=50
// Перегляд зібраних «промахів» (запити, де система не дала впевненої спец).
// Це сировина для майбутнього розміченого датасету / донавчання ML.
//
// БЕЗПЕЧНО ЗА ЗАМОВЧУВАННЯМ. Ендпоінт віддає тексти реальних запитів клієнтів, тож:
//   - якщо задано env MISSES_TOKEN → доступ лише з ?token=<значення> (інакше 401);
//   - якщо MISSES_TOKEN НЕ задано:
//       • у продакшені (Vercel тощо) → ендпоінт закритий (403) — нічого не світимо;
//       • локально (dev) → відкритий для зручності перегляду.
// Тобто публічний деплой захищений без жодного ручного налаштування.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const required = process.env.MISSES_TOKEN;

  if (required) {
    if (url.searchParams.get("token") !== required) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Ендпоінт вимкнено. Задайте env MISSES_TOKEN, щоб увімкнути перегляд." },
      { status: 403 },
    );
  }

  const limit = Number(url.searchParams.get("limit") ?? 50);
  const data = await readMisses(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json(data);
}
