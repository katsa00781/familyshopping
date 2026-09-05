-- Esemény-típus megkülönböztetés: 'event' (általános), 'shift' (műszak,
-- a muszak.tsx generálja), 'appointment' (ügyfél-időpont, az Időpontok
-- képernyő generálja). Az ügyfél nevét a meglévő `title` mező tárolja
-- (ugyanúgy, ahogy a shift-sorok címe a műszaktípus neve) — nincs külön
-- client_name oszlop, nulla duplikált adat, teljes újrahasznosítás a
-- meglévő megjelenítő/lekérdező kódban.
alter table public.calendar_events
  add column if not exists event_type text not null default 'event'
    check (event_type in ('event', 'shift', 'appointment'));
