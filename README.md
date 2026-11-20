# Mail verschieben

Kleine Web-App (Vercel-Serverless + IMAP via imapflow), um Mails vom iPhone per Aktionstaste schnell in Ordner/Unterordner zu verschieben und neue Ordner anzulegen. Einrichtung: siehe [ANLEITUNG.md](ANLEITUNG.md).

- `public/index.html` – Oberfläche (Mailliste, Ordnersuche, neuer Ordner, Rückgängig)
- `api/*.js` – Endpunkte: login, accounts, messages, folders, move, create-folder
- `server.js` – optionaler eigener Server (`npm start`), nicht für Vercel nötig

Einzige Umgebungsvariable: `SESSION_KEY` (beliebige lange Zufallszeichenkette). Die Postfach-Zugangsdaten gibt man in der App selbst ein; sie werden mit AES-256-GCM verschlüsselt in einem HttpOnly-Cookie auf dem iPhone gespeichert. Der IMAP-Server wird anhand der Mailadresse erkannt (eigene Domains: imap.strato.de) und kann bei der Anmeldung geändert werden.
