import { describe, expect, it } from "vitest";
import { chiEDove, controllaPagina, leggiMeta, linguaDelTesto, testoVisibile } from "../src/pagina.js";

const BUONA = `<html lang="it"><head><title>Serramenti in PVC e alluminio a Ragusa · Rossi</title><meta name="description" content="Produciamo e installiamo serramenti in alluminio e PVC a Ragusa e provincia, con posa certificata e preventivo gratuito."><link rel="canonical" href="https://rossi.it/"><meta property="og:title" content="Rossi"><meta property="og:description" content="x"><meta property="og:image" content="https://rossi.it/og.jpg"></head><body><h1>Serramenti su misura</h1><p>${"Da trent'anni la nostra azienda produce serramenti per case e uffici della provincia di Ragusa. ".repeat(12)}</p><footer><p>Rossi Serramenti srl, Via Roma 12, 97100 Ragusa · Tel. 0932 123456 · info@rossi.it</p></footer></body></html>`;

describe("pagina", () => {
  it("una home ben fatta è tutta verde", () => {
    const c = controllaPagina(BUONA, "https://rossi.it/", null, true);
    const rossi = c.filter((x) => x.esito !== "bene").map((x) => x.chiave);
    expect(rossi).toEqual([]);
    expect(c.find((x) => x.chiave === "contatti")?.dettaglio).toContain("telefono");
  });
  it("titolo che dice solo il nome, descrizione generica, senza h1, noindex", () => {
    const c = controllaPagina(`<html><head><title>Rossi</title><meta name="robots" content="noindex,follow"><meta name="description" content="Benvenuti nel nostro sito"></head><body><p>poco</p></body></html>`, "https://rossi.it/", null, true);
    const per = Object.fromEntries(c.map((x) => [x.chiave, x]));
    expect(per.noindex!.esito).toBe("male");
    expect(per.titolo!.esito).toBe("male");
    expect(per.titolo!.dettaglio).toContain("dice solo il nome");
    expect(per.descrizione!.esito).toBe("male");
    expect(per.h1!.esito).toBe("male");
    expect(per.lingua!.esito).toBe("male");
    expect(per.contatti!.esito).toBe("male");
  });
  it("noindex dalle intestazioni del server", () => {
    const c = controllaPagina(BUONA, "https://rossi.it/", "noindex, nofollow", true);
    expect(c[0]).toMatchObject({ chiave: "noindex", esito: "male" });
    expect(c[0]!.dettaglio).toContain("intestazioni del server");
  });
  it("sito solo JavaScript e canonical su altro dominio", () => {
    const c = controllaPagina(`<html lang="it"><head><title>App bellissima davvero</title><link rel="canonical" href="https://altro.com/"></head><body><div id="root"></div><script src="app.js"></script></body></html>`, "https://rossi.it/", null, true);
    const per = Object.fromEntries(c.map((x) => [x.chiave, x]));
    expect(per.testo!.esito).toBe("male");
    expect(per.testo!.dettaglio).toContain("programmi nel browser");
    expect(per.canonical!.esito).toBe("male");
  });
  it("lingua dichiarata diversa dal testo", () => {
    const en = `<html lang="it"><head><title>Rossi windows and doors Ragusa</title></head><body><p>${"We are the best company for your windows and doors, and our team is here for you. ".repeat(10)}</p></body></html>`;
    const c = controllaPagina(en, "https://rossi.it/", null, true);
    expect(c.find((x) => x.chiave === "lingua")).toMatchObject({ esito: "neutro" });
    expect(linguaDelTesto("the and with our your for that are this from the and")).toBe("en");
  });
  it("testo visibile e contatti", () => {
    expect(testoVisibile("<p>Ciao&nbsp;mondo</p><script>x()</script><nav>menu</nav>")).toBe("Ciao mondo");
    expect(chiEDove("<a href=\"tel:+390932123456\">chiama</a> Via Roma 12, 97100 Ragusa")).toMatchObject({ telefono: true, indirizzo: true, cap: true, email: false });
    expect(leggiMeta(BUONA).parole).toBeGreaterThan(150);
  });
  it("le pagine interne non chiedono lingua e contatti", () => {
    const c = controllaPagina(`<html><head><title>Preventivo serramenti Ragusa</title><meta name="description" content="Chiedi un preventivo gratuito per i tuoi serramenti a Ragusa: rispondiamo in 24 ore."></head><body><h1>Preventivo</h1></body></html>`, "https://rossi.it/preventivo/", null, false);
    expect(c.map((x) => x.chiave)).toEqual(["noindex", "titolo", "descrizione", "h1"]);
    expect(c.every((x) => x.pagina === "https://rossi.it/preventivo/")).toBe(true);
  });
});
