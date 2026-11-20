# Mail verschieben – Einrichtung (ca. 15 Minuten, einmalig)

**So funktioniert es danach:** Du drückst die Aktionstaste → es öffnet sich „Verschieben“ mit deinen neuesten Mails → du tippst auf die Mail → tippst die ersten Buchstaben des Ordners → tippst auf den Ordner. Fertig. Mit „Rückgängig“ holst du sie zurück, mit „Neuer Ordner“ legst du (Unter-)Ordner an.

Das Tool läuft als kleine, private Web-App bei **Vercel** (kostenlos). Dort verbindet es sich mit Strato und verschiebt die Mail direkt auf dem Server. Die Mail-App auf dem iPhone zeigt das beim nächsten Abgleich automatisch an.

---

## Schritt 1: Code auf GitHub (das erledige ich für dich)

1. Lege ein kostenloses Konto auf **github.com** an (falls noch nicht vorhanden).
2. Tippe oben rechts auf **+** → **New repository**. Name: `mail-verschieben`, **Private** auswählen, **Create repository**.
3. Verbinde GitHub mit Claude: https://claude.ai/connect-github
4. Schreib mir „Repo ist da“. Ich lade den Code dann hoch.

*(Alternative mit Computer: auf der Repo-Seite „uploading an existing file“ wählen und den Inhalt der Datei `mail-verschieben.zip` – entpackt – hineinziehen.)*

## Schritt 2: Bei Vercel online stellen

1. Öffne **vercel.com** → **Sign Up** → **Continue with GitHub** (Hobby-Tarif, kostenlos).
2. **Add New… → Project** → bei `mail-verschieben` auf **Import** tippen.
3. Klappe **Environment Variables** auf und trage diese drei Werte ein:

   | Name | Wert |
   |---|---|
   | `APP_PASSWORD` | ein neues Passwort nur für dieses Tool (frei ausdenken, mind. 12 Zeichen) |
   | `MAIL_USER` | deine Strato-Mailadresse, z. B. `gert@deine-domain.de` |
   | `MAIL_PASS` | das Passwort dieses Strato-Postfachs |

4. **Deploy** antippen. Nach ca. 1 Minute bekommst du eine Adresse wie `https://mail-verschieben-xyz.vercel.app`. Diese Adresse brauchst du gleich.

Dein Strato-Passwort liegt verschlüsselt nur in deinem Vercel-Konto, nicht im Code und nicht auf dem iPhone.

## Schritt 3: Einmal anmelden

Öffne die Adresse in **Safari**, gib dein `APP_PASSWORD` ein → **Anmelden**. Du bleibst 180 Tage angemeldet.

## Schritt 4: Kurzbefehl anlegen

1. App **Kurzbefehle** öffnen → **+** (oben rechts).
2. **Aktion hinzufügen** → nach **„URLs öffnen“** suchen → antippen.
3. Auf das blaue Feld **URL** tippen und deine Vercel-Adresse einfügen.
4. Oben auf den Namen tippen → **Umbenennen** → `Mail verschieben` → **Fertig**.

## Schritt 5: Aktionstaste belegen

1. **Einstellungen → Aktionstaste**.
2. Wischen bis **Kurzbefehl** → **Kurzbefehl auswählen** → **Mail verschieben**.

Jetzt reicht ein Druck auf die Taste (gedrückt halten).

---

## Weitere Postfächer (optional)

In Vercel unter **Settings → Environment Variables** zusätzlich eintragen und danach unter **Deployments → … → Redeploy** neu starten:

| Name | Beispiel |
|---|---|
| `MAIL_NAME` | `Strato` (Anzeigename des ersten Postfachs) |
| `MAIL2_USER` / `MAIL2_PASS` | Adresse und Passwort des zweiten Postfachs |
| `MAIL2_HOST` | IMAP-Server, z. B. `imap.gmx.net`, `imap.gmail.com`*, `outlook.office365.com` |
| `MAIL2_NAME` | `GMX` |

Ebenso `MAIL3_…` bis `MAIL9_…`. Oben in der App erscheinen dann Knöpfe zum Umschalten.
\* Gmail braucht ein „App-Passwort“ aus den Google-Kontoeinstellungen.

## Gut zu wissen

- Angezeigt werden die 30 neuesten Mails im **Posteingang**. Ältere findest du über das Suchfeld (Absender oder Betreff).
- Die Ordnersuche findet auch Wortteile und ignoriert Groß/Kleinschreibung („rech“ findet „Rechnungen“ und „Haus › Rechnungen“). Oben stehen die zuletzt benutzten Ordner.
- Strato-Server: `imap.strato.de`, Port 993 (ist voreingestellt).
- Apple lässt nicht zu, dass ein Kurzbefehl die gerade in der Mail-App geöffnete Mail erkennt. Darum wählst du die Mail im Tool kurz aus der Liste.
