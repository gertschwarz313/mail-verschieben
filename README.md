# Mail verschieben

Kleine Web-App (Vercel-Serverless + IMAP via imapflow), um Mails vom iPhone per Aktionstaste schnell in Ordner/Unterordner zu verschieben und neue Ordner anzulegen. Einrichtung: siehe [ANLEITUNG.md](ANLEITUNG.md).

- `public/index.html` – Oberfläche (Mailliste, Ordnersuche, neuer Ordner, Rückgängig)
- `api/*.js` – Endpunkte: login, accounts, messages, folders, move, create-folder
- `server.js` – optionaler eigener Server (`npm start`), nicht für Vercel nötig

Umgebungsvariablen: `APP_PASSWORD`, `MAIL_USER`, `MAIL_PASS`, optional `MAIL_HOST` (Standard `imap.strato.de`), `MAIL_PORT` (993), `MAIL_SECURE` (true), `MAIL_NAME`, weitere Konten `MAIL2_…` bis `MAIL9_…`.
