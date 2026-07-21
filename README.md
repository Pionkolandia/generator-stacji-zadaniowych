# Generator stacji zadaniowych

Statyczna strona internetowa dla programu **Szkoła jest SMART!**. Aplikacja pozwala nauczycielowi przygotować karty graczy i ściągawkę do druku dla zajęć opartych na stacjach zadaniowych.

## Co zawiera

- kreator w 4 krokach: klasa, gry, zakresy zadań, podgląd i druk,
- gotowe presety Junior, Ekspert i Master na podstawie przykładowych PDF-ów,
- obsługę niestandardowych gier,
- automatyczne zadania Gracza B liczone zawsze jako start Gracza A + 1,
- automatyczną rotację, która pilnuje, aby jedna karta gracza miała 3 różne gry na 3 różnych stacjach,
- karty graczy A/B/C oraz arkusz nauczyciela,
- tryb wydruku A4 z układaniem kart po 3 na stronie,
- pełnoekranowy stoper dla grupy A i grupy B z własnym czasem, presetami i sygnałem końca.
- konta nauczycieli z logowaniem e-mailem i Google,
- prywatną bibliotekę własnych gier oraz zapisane zestawy stacji,
- panel administratora z liczbą założonych kont.

## Konta i baza danych

Konta użytkowników i zapisane dane korzystają z Firebase Authentication oraz Cloud Firestore w projekcie `stacje-zadaniowe`. Konfiguracja aplikacji internetowej znajduje się w `public/firebase-config.js`.

Pełna instrukcja uruchomienia bazy, logowania Google i konta administratora znajduje się w `firebase/SETUP.md`. Reguły bezpieczeństwa są zapisane w `firebase/firestore.rules`.

## Uruchomienie lokalne

```bash
python3 -m http.server 4173
```

Następnie otwórz `http://localhost:4173`.
