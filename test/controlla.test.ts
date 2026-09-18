import { describe, expect, it } from "vitest";
import { confronta, controlla } from "../src/index.js";

const HOME = `<html lang="it"><head><title>Serramenti in PVC e alluminio a Ragusa · Rossi</title><meta name="description" content="Produciamo e installiamo serramenti in alluminio e PVC a Ragusa e provincia, con posa certificata e preventivo gratuito."><link rel="canonical" href="https://rossi.it/"><meta property="og:title" content="Rossi"><meta property="og:description" content="x"><meta property="og:image" content="https://rossi.it/og.jpg"><script type="application/ld+json">{"@type":"LocalBusiness","name":"Rossi","url":"https://rossi.it","telephone":"0932123456","address":{"streetAddress":"Via Roma 12","addressLocality":"Ragusa"},"sameAs":["https://maps.google.com/x"]}</script></head><body><h1>Serramenti su misura</h1><p>${"Da trent'anni la nostra azienda produce serramenti per case e uffici della provincia di Ragusa. ".repeat(12)}</p><a href="/chi-siamo/">Chi siamo</a> <a href="/contatti/">Contatti</a> <a href="/servizi/">Servizi</a><footer><p>Rossi Serramenti srl, Via Roma 12, 97100 Ragusa · Tel. 0932 123456 · info@rossi.it</p></footer></body></html>`;
const INTERNA = (t: string) => `<html><head><title>${t} · Rossi Serramenti Ragusa</title><meta name="description" content="Pagina ${t} di Rossi Serramenti: tutto quello che serve sapere, con esempi e contatti diretti."></head><body><h1>${t}</h1></body></html>`;

function sitoFinto(varianti: Partial<Record<string, Response | (() => Response)>> = {}) {
  return async (url: string): Promise<Response> => {
    const v = varianti[url];
    if (v) return typeof v === "function" ? v() : v;
    const p = new URL(url).pathname;
    if (p === "/") return new Response(HOME, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    if (p === "/robots.txt") return new Response("User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: https://rossi.it/sitemap.xml");
    if (p === "/llms.txt") return new Response("# Rossi\n\n> Serramenti a Ragusa da trent'anni, per case e uffici.\n\n- [Servizi](https://rossi.it/servizi/)\n");
    if (p === "/sitemap.xml") return new Response("<urlset><url><loc>https://rossi.it/</loc></url><url><loc>https://rossi.it/servizi/</loc></url><url><loc>https://rossi.it/chi-siamo/</loc></url></urlset>");
    if (p === "/servizi/" || p === "/chi-siamo/" || p === "/contatti/") return new Response(INTERNA(p.replace(/\//g, "")), { status: 200, headers: { "content-type": "text/html" } });
    return new Response("", { status: 404 });
  };
}

describe("controlla", () => {
  it("un sito ben fatto: tutto verde, punteggio 100, pagine interne controllate", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto() });
    expect(r.controlli.filter((c) => c.esito !== "bene").map((c) => c.chiave)).toEqual(["faq"]); // le FAQ sono facoltative
    expect(r.punteggio).toBeGreaterThanOrEqual(95);
    expect(r.giudizio).toBe("Le AI leggono bene il tuo sito.");
    expect(r.pagine.length).toBe(4);
    expect(r.controlli.find((c) => c.chiave === "robots")!.dettaglio).toContain("per scelta");
  });
  it("modalità rapida: niente sitemap né altre pagine", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto(), modalita: "rapido" });
    expect(r.controlli.map((c) => c.chiave)).not.toContain("sitemap");
    expect(r.pagine.length).toBe(1);
  });
  it("sito giù: un solo controllo rosso, giudizio bloccante, nessuna eccezione", async () => {
    const r = await controlla("giu.it", { chiama: async () => { throw new Error("getaddrinfo ENOTFOUND giu.it"); } });
    expect(r.controlli[0]).toMatchObject({ chiave: "raggiungibile", esito: "male", dettaglio: "dominio inesistente" });
    expect(r.giudizio).toBe("Le AI non riescono a leggere il tuo sito.");
    expect(r.punteggio).toBeLessThan(50);
  });
  it("sfida anti-bot e noindex sono bloccanti", async () => {
    const cf = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/": new Response("<title>Just a moment...</title>", { status: 403, headers: { server: "cloudflare" } }) }) });
    expect(cf.controlli[0]).toMatchObject({ chiave: "antibot", esito: "male" });
    expect(cf.giudizio).toContain("non riescono");
    const ni = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/": new Response(HOME, { status: 200, headers: { "x-robots-tag": "noindex" } }) }), modalita: "rapido" });
    expect(ni.controlli.find((c) => c.chiave === "noindex")!.esito).toBe("male");
    expect(ni.giudizio).toContain("non riescono");
  });
  it("robots che chiude le AI che rispondono e Googlebot", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/robots.txt": new Response("User-agent: *\nDisallow: /") }), modalita: "rapido" });
    expect(r.controlli.find((c) => c.chiave === "motori")).toMatchObject({ esito: "male" });
    expect(r.controlli.find((c) => c.chiave === "robots")).toMatchObject({ esito: "male" });
  });
  it("pagine interne con problemi e redirect verso www", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/servizi/": new Response("<html><head><title>x</title></head><body></body></html>") }) });
    expect(r.controlli.find((c) => c.chiave === "pagine")).toMatchObject({ esito: "neutro" });
    expect(r.pagine.find((p) => p.url.includes("servizi"))!.controlli.some((c) => c.esito === "male")).toBe(true);
    const rw = await controlla("rossi.it", { chiama: async (url: string) => url === "https://rossi.it/" ? new Response("", { status: 301, headers: { location: "https://www.rossi.it/" } }) : sitoFinto()(url.replace("www.", "")), modalita: "rapido" });
    expect(rw.controlli.find((c) => c.chiave === "redirect")).toMatchObject({ esito: "bene" });
    expect(rw.urlFinale).toBe("https://www.rossi.it/");
  });
  it("le pagine che rimandano alla home non contano come pagine interne", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/servizi/": new Response("", { status: 302, headers: { location: "https://rossi.it/" } }) }) });
    expect(r.pagine.map((p) => p.url)).not.toContain("https://rossi.it/servizi/");
    expect(r.controlli.find((c) => c.chiave === "pagine")).toMatchObject({ esito: "bene" });
  });
  it("index.html e la copia della home non sono altre pagine; senza robots.txt le AI leggono tutto", async () => {
    const r = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/robots.txt": new Response("", { status: 404 }), "https://rossi.it/sitemap.xml": new Response("<urlset><url><loc>https://rossi.it/index.html</loc></url><url><loc>https://rossi.it/copia/</loc></url></urlset>"), "https://rossi.it/copia/": new Response(HOME) }) });
    expect(r.controlli.find((c) => c.chiave === "robots")).toMatchObject({ esito: "bene" });
    expect(r.pagine.map((p) => p.url)).not.toContain("https://rossi.it/index.html");
    expect(r.pagine.map((p) => p.url)).not.toContain("https://rossi.it/copia/");
  });
  it("confronto fra due controlli", async () => {
    const prima = await controlla("rossi.it", { chiama: sitoFinto({ "https://rossi.it/llms.txt": new Response("", { status: 404 }) }), modalita: "rapido" });
    const dopo = await controlla("rossi.it", { chiama: sitoFinto(), modalita: "rapido" });
    expect(confronta(prima, dopo)).toEqual([{ chiave: "llms", nome: "C'è una guida per le AI (llms.txt)", prima: "neutro", dopo: "bene", verso: "meglio" }]);
    expect(confronta(null, dopo)).toEqual([]);
  });
});

describe("base dei controlli e «chi c'è dietro»", () => {
  it("ogni controllo dichiara base e fonte; i dedotti pesano 1", async () => {
    const { controlla } = await import("../src/index.js");
    const html = `<html lang="it"><head><title>Molino Latina, farine di grani antichi a Giarratana</title><meta name="description" content="Farine biologiche macinate a pietra, spedizione in tutta Italia."></head><body><h1>Farine</h1><p>${"testo ".repeat(200)}</p><a href="/contatti/">Contatti</a><a href="/il-molino/">Il molino</a></body></html>`;
    const chiama = async (u: string) => new Response(u.endsWith("/") || u.includes("il-molino") || u.includes("contatti") ? html : "", { status: u.includes("robots") || u.includes("llms") || u.includes("sitemap") ? 404 : 200, headers: { "content-type": "text/html" } });
    const r = await controlla("molinolatina.com", { chiama, modalita: "rapido" });
    for (const c of r.controlli) { expect(["documentato", "dedotto"]).toContain(c.base); expect(c.fonte.length).toBeGreaterThan(10); if (c.base === "dedotto") expect(c.peso).toBe(1); }
    const chi = r.controlli.find((c) => c.chiave === "chisiamo")!;
    expect(chi.esito).toBe("bene");
    expect(chi.dettaglio).toContain("una pagina che racconta chi siete");
  });
  it("solo contatti: consigliato, non mancante", async () => {
    const { controlla } = await import("../src/index.js");
    const html = `<html lang="it"><head><title>Negozio di farine online</title><meta name="description" content="Farine biologiche."></head><body><h1>Farine</h1><p>${"testo ".repeat(200)}</p><a href="/contatti/">Contatti</a></body></html>`;
    const chiama = async (u: string) => new Response(html, { status: u.includes("robots") || u.includes("llms") ? 404 : 200, headers: { "content-type": "text/html" } });
    const r = await controlla("esempio.it", { chiama, modalita: "rapido" });
    const chi = r.controlli.find((c) => c.chiave === "chisiamo")!;
    expect(chi.esito).toBe("neutro");
    expect(chi.dettaglio).toContain("consigliata");
  });
});
