# PrestaShop Catalog (WordPress-Plugin)

Zeigt ausgewählte PrestaShop-Kategorien (z. B. Wasser, Bier) auf der Website an – inkl. Störern (Aktion -x %, Angebot, Neu).

## Einrichtung
1. PrestaShop: *Erweiterte Parameter → Webservice* aktivieren, Key mit **nur GET** auf `products`, `categories`, `specific_prices` anlegen.
2. Ordner `prestashop-catalog/` nach `wp-content/plugins/` kopieren und aktivieren.
3. *Einstellungen → PrestaShop Catalog*: Shop-URL, Key, freigegebene Kategorie-IDs, MwSt.-Satz eintragen.
4. Shortcode einfügen: `[ps_catalog category="12" limit="12" columns="4" orderby="promo"]`

## Hinweise
- Nur freigegebene Kategorie-IDs sind abrufbar; der API-Key bleibt serverseitig.
- Ergebnisse werden per Transient gecacht (Standard 60 min), Aktionen max. 15 min.
- Preise: API-Netto × MwSt.-Satz (pauschal). Aktionspreise: nur allgemeine `specific_prices` (keine Gruppen-/Kunden-/Staffelpreise).
- Test: `php tests/smoke.php`
