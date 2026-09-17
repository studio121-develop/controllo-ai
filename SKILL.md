---
name: controllo-ai
description: Controlla se un sito è leggibile dalle AI (robots.txt, llms.txt, titolo, descrizione, h1, dati strutturati, lingua) e restituisce semaforo, punteggio e giudizio in italiano semplice. Usala quando l'utente chiede se un sito «si vede» o «si legge» dalle AI, o vuole un check AI/GEO rapido di un dominio.
---

# controllo-ai

Esegui:

```bash
npx --yes github:studio121-develop/controllo-ai <dominio> --json          # completo: home + sitemap + 5 pagine
npx --yes github:studio121-develop/controllo-ai <dominio> --rapido --json # solo la home
```

Riporta all'utente il punteggio e il giudizio, poi solo i controlli non verdi con `dettaglio` e `spiegazione` così come sono (sono già scritti per chi non è tecnico). Se l'utente è chi cura il sito, aggiungi `comeRisolvere`. Le pagine interne con problemi stanno in `pagine[]`. Non inventare controlli che il pacchetto non fa. Se il sito non risponde, dillo.

Il codice è in `github.com/studio121-develop/controllo-ai`: le modifiche si fanno lì e valgono ovunque (sonda dei siti, questa skill, l'API web).
