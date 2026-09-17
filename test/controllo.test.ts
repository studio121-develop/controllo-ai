import { describe, expect, it } from "vitest";
import { analizzaHome, controlla, robotBloccati, tipiJsonLd, ROBOT_CHE_RISPONDONO, ROBOT_CHE_SI_ADDESTRANO } from "../src/index.js";

const HOME = `<html lang="it"><head><title>Studio 121 · Comunicazione con i conti alla mano, Ragusa</title><meta name="description" content="Aiutiamo chi ha un'azienda a farsi trovare e a vendere di più, con numeri alla mano."><script type="application/ld+json">{"@context":"https://schema.org","@type":["Organization","ProfessionalService"],"name":"Studio 121"}</script></head><body><h1>Chi cerca</h1></body></html>`;

describe("controllo-ai", () => {
  it("robots: chi si addestra fuori è una scelta, chi risponde fuori è un problema", () => {
    const robots = "User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: ClaudeBot\nDisallow: /privato";
    expect(robotBloccati(robots, ROBOT_CHE_SI_ADDESTRANO)).toEqual(["GPTBot"]);
    expect(robotBloccati(robots, ROBOT_CHE_RISPONDONO)).toEqual([]);
    expect(robotBloccati("User-agent: OAI-SearchBot\nDisallow: /", ROBOT_CHE_RISPONDONO)).toEqual(["OAI-SearchBot"]);
  });
  it("riconosce i tipi JSON-LD anche come lista o dentro @graph", () => {
    expect(tipiJsonLd(HOME)).toEqual(["Organization", "ProfessionalService"]);
    expect(tipiJsonLd(`<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"LocalBusiness"}]}</script>`)).toEqual(["WebSite", "LocalBusiness"]);
    expect(tipiJsonLd(`<script type="application/ld+json">{rotto</script>`)).toEqual([]);
  });
  it("la home ben fatta è tutta verde, anche con l'apostrofo nella descrizione", () => {
    const c = analizzaHome(HOME);
    expect(c.map((x) => [x.chiave, x.esito])).toEqual([["titolo", "bene"], ["descrizione", "bene"], ["h1", "bene"], ["schema", "bene"], ["lingua", "bene"]]);
    expect(c[3]!.dettaglio).toContain("Organization");
  });
  it("una home vuota è tutta rossa", () => {
    expect(analizzaHome("<html><body><p>ciao</p></body></html>").every((x) => x.esito === "male")).toBe(true);
  });
  it("controllo completo con punteggio e giudizio", async () => {
    const chiama = async (url: string) => {
      if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /");
      if (url.endsWith("/llms.txt")) return new Response("", { status: 404 });
      return new Response(HOME);
    };
    const r = await controlla("https://studio121.it/qualsiasi", chiama);
    expect(r.url).toBe("https://studio121.it");
    expect(r.controlli[0]).toMatchObject({ chiave: "robots", esito: "bene" });
    expect(r.controlli[0]!.dettaglio).toContain("per scelta");
    expect(r.punteggio).toBe(86);
    expect(r.giudizio).toBe("Le AI leggono bene il tuo sito.");
  });
});
