import { controlla } from "../../src/index.js";

export const config = { maxDuration: 60 };

/** GET /api/controlla?url=esempio.it — il controllo come servizio web, per altri siti e strumenti. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get("url")?.trim();
  if (!url || !/^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) {
    return new Response(JSON.stringify({ ok: false, errore: "parametro url mancante o non valido" }), { status: 422, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }
  const modalita = new URL(req.url).searchParams.get("modalita") === "rapido" ? "rapido" : "completo";
  const r = await controlla(url, { modalita });
  return new Response(JSON.stringify({ ok: true, ...r }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" } });
}
