# NOTIS – HB Shuttle avgångar, hållplatser och retur

## Mål
Vi ska bygga om avgångar så de fungerar mer som en riktig flygbusslinje.

När man skapar en avgång ska man kunna välja:
- Linje/rutt
- Datum
- Tid för första hållplatsen
- Pris
- Kapacitet
- Valfri retur
- Returdatum
- Returtid
- Returpris

## Viktigt
Avgången ska inte bara vara "från stad till flygplats".
Den ska kunna använda hållplatserna som redan finns på linjen.

Exempel:
Linje 101 Helsingborg – Ängelholm

Hållplatser:
1. Helsingborg C
2. Hyllinge / Familia
3. Åstorp
4. Ängelholm Airport

När man skapar avgång:
- Man väljer linjen
- Systemet hämtar hållplatserna automatiskt
- Man sätter starttid
- Systemet kan skapa tider för varje hållplats
- Vid retur vänds hållplatserna automatiskt

## Retur
Retur ska sparas som en egen avgång, men vara kopplad till utresan.

Utresa:
Helsingborg C → Ängelholm Airport

Retur:
Ängelholm Airport → Helsingborg C

## Databas som behövs
Vi behöver troligen stöd för:
- shuttle_departures
- shuttle_routes
- shuttle_lines
- hållplatser/stops kopplade till linje
- avgångens egna hållplatstider

## Nästa tekniska steg
1. Ta reda på exakt hur linjer och hållplatser är sparade idag.
2. Bygga API som hämtar hållplatser från vald linje.
3. Uppdatera skapa-avgång-sidan så hållplatser visas automatiskt.
4. Lägga till tider per hållplats.
5. Göra retur som vänder hållplatserna.
6. Uppdatera hbshuttle.se sökmodul så den söker på hållplatser, inte bara stad/flygplats.

## Viktigt att inte glömma
Felen vi fick:
- shuttle_routes.from_city saknades
- shuttle_routes.to_airport saknades

Vi behöver ha både:
- from_city
- to_city
- to_airport

så gammal och ny kod fungerar samtidigt.
