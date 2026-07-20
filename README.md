# Generator stacji zadaniowych

Statyczna strona internetowa dla programu **Szkoła jest SMART!**. Aplikacja pozwala nauczycielowi przygotować karty graczy i ściągawkę do druku dla zajęć opartych na stacjach zadaniowych.

## Co zawiera

- kreator w 4 krokach: klasa, gry, zakresy zadań, podgląd i druk,
- gotowe presety Junior, Master i Ekspert na podstawie przykładowych PDF-ów,
- obsługę niestandardowych gier,
- automatyczne zadania Gracza B liczone zawsze jako start Gracza A + 1,
- karty graczy A/B/C oraz arkusz nauczyciela,
- tryb wydruku A4 z układaniem kart po 3 na stronie,
- pełnoekranowy stoper dla grupy A i grupy B z własnym czasem, presetami i sygnałem końca.

## Uruchomienie lokalne

```bash
python3 -m http.server 4173
```

Następnie otwórz `http://localhost:4173`.
