# ADIF Sorrrter

## Nutzung
1. **ADIF öffnen** – Datei wählen (*.adi / *.adif)
2. App zeigt Header‑Vorschau und Zählung (DE/US/Rest)
3. **Sortiert speichern** – Datei unter neuem Namen ablegen
4. **Dark/Light** per Button oben rechts umschalten (merkt sich die Wahl)

## Regeln
- DE → alphabetisch nach CALL
- US → erst Ziffer im CALL (0–9) aufsteigend, dann alphabetisch
- Rest → alphabetisch nach CALL
- Header und jeder Record bleiben bytegenau erhalten (nur Reihenfolge wird geändert)

## Hinweise
- Erkennung DE/US primär über `DXCC` (DE=230, US=291). Fallback über Prefix: DE `D[A-R]`, US `K|N|W|A[A-L]`.
- Calls werden vor dem Vergleich normalisiert: Bei `EA/DL1ABC` bzw. `DL1ABC/P` wird der Teil **mit Ziffer** bevorzugt (sonst der erste Teil).
