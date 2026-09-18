export type Esito = "bene" | "male" | "neutro";

/** Peso di un controllo nel punteggio: 3 = decisivo, 2 = importante, 1 = utile. */
export type Peso = 1 | 2 | 3;

export type Controllo = Readonly<{
  chiave: string;
  nome: string;
  esito: Esito;
  /** cosa abbiamo trovato, in parole */
  dettaglio: string;
  /** perché conta, per chi non è tecnico */
  spiegazione: string;
  /** cosa fare, per chi cura il sito */
  comeRisolvere: string;
  peso: Peso;
  /** «documentato»: una fonte pubblica lega il controllo a come le AI leggono o citano; «dedotto»: buona pratica senza fonte diretta */
  base: "documentato" | "dedotto";
  /** la fonte, in una riga */
  fonte: string;
  /** su quale pagina (assente = tutto il sito) */
  pagina?: string;
}>;

export type PaginaControllata = Readonly<{ url: string; stato: number; controlli: readonly Controllo[] }>;

export type Risultato = Readonly<{
  url: string;
  urlFinale: string;
  punteggio: number;
  giudizio: string;
  controlli: readonly Controllo[];
  pagine: readonly PaginaControllata[];
  controllatoIl: string;
  durataMs: number;
  modalita: "rapido" | "completo";
}>;

export type Differenza = Readonly<{ chiave: string; nome: string; prima: Esito | null; dopo: Esito | null; verso: "meglio" | "peggio" | "nuovo" | "sparito" }>;

export type Chiamata = (url: string, init?: RequestInit) => Promise<Response>;
