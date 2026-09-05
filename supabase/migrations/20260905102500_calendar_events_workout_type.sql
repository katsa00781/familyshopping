-- 'workout' esemény-típus: az Underground KB (kettlebell) app írja közvetlenül
-- ebbe a táblába (közös Supabase projekt, saját auth.uid()-vel), felváltva a
-- korábbi device-naptár hidat. Így egyetlen forrás van, nincs duplikáció.
alter table public.calendar_events
  drop constraint if exists calendar_events_event_type_check;

alter table public.calendar_events
  add constraint calendar_events_event_type_check
    check (event_type in ('event', 'shift', 'appointment', 'workout'));
