import { describe, expect, it } from "vitest";
import { campiAttivita, controllaDatiStrutturati, leggiDatiStrutturati } from "../src/schema.js";
import { esaminaLlms } from "../src/llms.js";
import { linkInterni, paginePresentazione, scegliPagine, urlDaSitemap } from "../src/sitemap.js";

const lettura = (corpo: string, stato = 200, tipo = "text/plain") => ({ urlRichiesto: "", urlFinale: "", stato, corpo, intestazioni: { "content-type": tipo }, redirect: [], errore: null, tempoMs: 1 });

describe("dati strutturati", () => {
  it("scheda completa in JSON-LD con @type lista", () => {
    const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":["Organization","ProfessionalService"],"name":"Studio 121","url":"https://studio121.it","telephone":"+39 333 771 7599","address":{"@type":"PostalAddress","streetAddress":"Via Settembrini 71","addressLocality":"Ragusa"},"sameAs":["https://www.instagram.com/studio121"]}</script><script type="application/ld+json">{"@type":"FAQPage"}</script>`;
    const c = controllaDatiStrutturati(html);
    expect(c.map((x) => [x.chiave, x.esito])).toEqual([["schema", "bene"], ["schemaCampi", "bene"]]);
  });
  it("scheda incompleta, dentro @graph, e un blocco rotto", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebSite"},{"@type":"LocalBusiness","name":"Rossi"}]}</script><script type="application/ld+json">{rotto}</script>`;
    const c = controllaDatiStrutturati(html);
    expect(c[0]!.dettaglio).toContain("scritto male");
    expect(c[1]).toMatchObject({ chiave: "schemaCampi", esito: "male" });
    expect(c[1]!.dettaglio).toContain("indirizzo");
    expect(campiAttivita({ "@type": "LocalBusiness", name: "x", address: "Ragusa" }).presenti).toContain("città");
  });
  it("microdata e assenza", () => {
    expect(controllaDatiStrutturati(`<div itemscope itemtype="https://schema.org/LocalBusiness"><span itemprop="name">Rossi</span></div>`)[0]).toMatchObject({ esito: "neutro" });
    expect(controllaDatiStrutturati(`<p>niente</p>`)[0]).toMatchObject({ esito: "male" });
    expect(leggiDatiStrutturati(`<script type="application/ld+json">{"@type":"BreadcrumbList"}</script>`).tipi).toEqual(["BreadcrumbList"]);
  });
});

describe("llms.txt", () => {
  it("valido, html travestito, senza titolo, senza link", () => {
    expect(esaminaLlms(lettura("# Studio 121\n\n> Agenzia di comunicazione a Ragusa: aiutiamo le aziende a farsi trovare.\n\n- [Servizi](https://studio121.it/servizi)\n")).valido).toBe(true);
    expect(esaminaLlms(lettura("<!doctype html><html><title>404</title></html>", 200, "text/html")).motivo).toContain("pagina HTML");
    expect(esaminaLlms(lettura("Siamo un'agenzia di comunicazione a Ragusa e facciamo tante cose belle.")).motivo).toContain("titolo");
    expect(esaminaLlms(lettura("# Rossi\n\n> Serramenti a Ragusa da trent'anni, per case e uffici.\n")).motivo).toContain("link");
    expect(esaminaLlms(lettura("", 404)).presente).toBe(false);
  });
});

describe("sitemap e link", () => {
  const home = `<a href="/">Home</a><a href="/servizi/">Servizi</a><a href="/chi-siamo/">Chi siamo</a><a href="/contatti/">Contatti</a><a href="/foto.jpg">x</a><a href="https://altro.it/">y</a><a href="/servizi/">doppio</a><a href="/tag/x/">tag</a>`;
  it("legge la sitemap e i link interni", () => {
    expect(urlDaSitemap("<urlset><url><loc>https://a.it/</loc></url><url><loc> https://a.it/b/ </loc></url></urlset>")).toEqual(["https://a.it/", "https://a.it/b/"]);
    expect(linkInterni(home, "https://a.it/")).toEqual(["https://a.it/servizi/", "https://a.it/chi-siamo/", "https://a.it/contatti/"]);
    expect(paginePresentazione(home, "https://a.it/")).toEqual({ chiSiamo: "https://a.it/chi-siamo/", contatti: "https://a.it/contatti/" });
  });
  it("sceglie le pagine più in alto nella struttura, senza la home", () => {
    expect(scegliPagine(["https://a.it/", "https://a.it/blog/2026/post-lungo/", "https://a.it/servizi/", "https://a.it/privacy-policy/", "https://a.it/terms.php"], ["https://a.it/chi-siamo/", "https://a.it/servizi"], "https://a.it/", 2)).toEqual(["https://a.it/servizi/", "https://a.it/chi-siamo/"]);
  });
});

describe("domande e risposte", () => {
  it("riconosce il markup FAQPage e i titoli-domanda, qualunque sia il nome della pagina", async () => {
    const { domandeERisposte } = await import("../src/schema.js");
    expect(domandeERisposte(`<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[]}</script>`)).toEqual({ markup: true, titoliDomanda: 0 });
    expect(domandeERisposte(`<h2>Quanto dura la farina?</h2><h3>Spedite in tutta Italia?</h3><h2>Posso ritirare in molino?</h2><h2>Contatti</h2>`)).toEqual({ markup: false, titoliDomanda: 3 });
    expect(domandeERisposte(`<h2>Chi siamo</h2>`)).toEqual({ markup: false, titoliDomanda: 0 });
  });
});
