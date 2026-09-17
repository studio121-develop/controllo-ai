import { describe, expect, it } from "vitest";
import { leggi, origineDa, sembraSfidaAntiBot } from "../src/rete.js";
import { analizzaRobots, permesso, robotBloccati, ROBOT_CHE_RISPONDONO, ROBOT_CHE_SI_ADDESTRANO } from "../src/robots.js";

describe("rete", () => {
  it("normalizza l'origine", () => {
    expect(origineDa(" HTTP://www.Rossi.it/pagina?x=1 ")).toBe("https://www.rossi.it");
    expect(origineDa("rossi.it")).toBe("https://rossi.it");
  });
  it("segue i redirect a mano e vede l'anello", async () => {
    const salti: Record<string, string> = { "https://a.it/": "https://www.a.it/", "https://www.a.it/": "https://a.it/" };
    const chiama = async (url: string) => new Response("", { status: 301, headers: { location: salti[url]! } });
    const l = await leggi("https://a.it/", chiama);
    expect(l.errore).toContain("in tondo");
    expect(l.redirect).toEqual(["https://www.a.it/"]);
  });
  it("arriva alla pagina finale e tiene le intestazioni", async () => {
    const chiama = async (url: string) => url === "https://a.it/" ? new Response("", { status: 302, headers: { location: "https://www.a.it/" } }) : new Response("<html>ciao</html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
    const l = await leggi("https://a.it/", chiama);
    expect(l).toMatchObject({ urlFinale: "https://www.a.it/", stato: 200, corpo: "<html>ciao</html>" });
    expect(l.intestazioni["x-robots-tag"]).toBe("noindex");
  });
  it("timeout ed errori diventano parole", async () => {
    const l = await leggi("https://a.it/", async () => { throw new Error("The operation was aborted due to timeout"); });
    expect(l.errore).toContain("nessuna risposta entro");
    const c = await leggi("https://a.it/", async () => { throw new Error("getaddrinfo ENOTFOUND a.it"); });
    expect(c.errore).toBe("dominio inesistente");
  });
  it("riconosce la sfida anti-bot", () => {
    expect(sembraSfidaAntiBot({ urlRichiesto: "", urlFinale: "", stato: 403, corpo: "<title>Just a moment...</title>", intestazioni: { server: "cloudflare" }, redirect: [], errore: null, tempoMs: 1 })).toBe(true);
    expect(sembraSfidaAntiBot({ urlRichiesto: "", urlFinale: "", stato: 200, corpo: "<title>Rossi</title>", intestazioni: {}, redirect: [], errore: null, tempoMs: 1 })).toBe(false);
  });
});

describe("robots.txt", () => {
  const testo = "# commento\r\nUser-agent: *\r\nDisallow: /privato/\r\nAllow: /privato/pubblico\r\n\r\nUser-Agent: GPTBot\r\nuser-agent: CCBot\r\nDisallow: /\r\n\r\nUser-agent: OAI-SearchBot\r\nDisallow:\r\n\r\nSitemap: https://a.it/sitemap.xml\r\n";
  const r = analizzaRobots(testo);
  it("legge gruppi, allow che riapre, disallow vuoto, sitemap", () => {
    expect(r.sitemap).toEqual(["https://a.it/sitemap.xml"]);
    expect(permesso(r, "Googlebot", "/")).toBe(true);
    expect(permesso(r, "Googlebot", "/privato/x")).toBe(false);
    expect(permesso(r, "Googlebot", "/privato/pubblico/y")).toBe(true);
    expect(permesso(r, "GPTBot", "/")).toBe(false);
    expect(permesso(r, "ccbot", "/")).toBe(false);
    expect(permesso(r, "OAI-SearchBot", "/")).toBe(true);
    expect(permesso(r, "PerplexityBot", "/")).toBe(true);
  });
  it("famiglie: chi si addestra fuori, chi risponde dentro", () => {
    expect(robotBloccati(r, ROBOT_CHE_SI_ADDESTRANO)).toEqual(["GPTBot", "CCBot"]);
    expect(robotBloccati(r, ROBOT_CHE_RISPONDONO)).toEqual([]);
  });
  it("il blocco * vale per chi non ha il suo, e i caratteri jolly funzionano", () => {
    const tutti = analizzaRobots("User-agent: *\nDisallow: /\nAllow: /$\n\nUser-agent: Bingbot\nDisallow: /*.pdf$");
    expect(permesso(tutti, "GPTBot", "/")).toBe(true);
    expect(permesso(tutti, "GPTBot", "/pagina")).toBe(false);
    expect(permesso(tutti, "Bingbot", "/doc.pdf")).toBe(false);
    expect(permesso(tutti, "Bingbot", "/pagina")).toBe(true);
  });
});
