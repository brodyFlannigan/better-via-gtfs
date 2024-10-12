# Better VIA GTFS

VIA Rail Canada produces an "official" GTFS feed, which is available [here](https://www.viarail.ca/sites/all/files/gtfs/viarail.zip). However, the data in this feed isn't always accurate, and most importantly, doesn't actually reflect service changes until the day-of (if not later). This makes it quite suboptimal.

This program aims to make a better GTFS feed for VIA by using data from the [accessible timetable pages on VIA's website](https://www.viarail.ca/en/plan/train-schedules#accessible#accessible:~:text=Accessible%20timetables%20for%20arrivals%20and%20departures).

## Data included

- All strictly required GTFS files and fields;
- Timetable note data for timetable generation using [GTFS-to-HTML](https://gtfstohtml.com);

## Planned features

- Support for `drop_off_type`and `pickup_type`, derived from notes in the JSON timetable data;
- Addition of `trip_headsign`
- `translations.txt` for station names, descriptions, etc.
- `timetables.txt`and `timetable_stop_order.txt`;
- More consistent `start_date` and `end_date` in `calendar.txt`;
- Automated fetching of stops data from VIA's site and reservation system.
- TTS stop names
