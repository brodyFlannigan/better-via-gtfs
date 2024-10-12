// src/makeSchedules.js

const path = require("path");
const fs = require("fs").promises;
const writeGTFSFile = require("./gtfsWriter");

function parseTimeToSeconds(timeStr) {
  const [hours, minutes, seconds] = timeStr.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(
    2,
    "0"
  )}`;
}

async function makeSchedules(data, outputFolder) {
  const routes = data.routes;
  const trips = [];
  const stopTimes = [];
  const calendars = [];

  // Configurable special direction IDs
  const specialDirectionIds = {
    AMK64: "0",
    AMK63: "1",
  };

  for (const route of routes) {
    const routeId = route.route_id;
    const timetableUrls = route.timetable_urls;

    if (!timetableUrls || timetableUrls.length === 0) {
      console.log(`No timetable URLs found for route ${routeId}`);
      continue;
    }

    for (const url of timetableUrls) {
      // Extract the timetable reference from the URL
      const timetableReference = url.split("/").pop();

      // Construct the path to the timetable JSON file
      const timetableFilePath = path.join(
        __dirname,
        "..",
        "data",
        "timetables",
        `${timetableReference}.json`
      );

      // Check if the file exists
      try {
        await fs.access(timetableFilePath);
      } catch (err) {
        console.log(`Timetable file not found: ${timetableFilePath}`);
        continue;
      }

      // Read the timetable JSON file
      let timetableData;
      try {
        const timetableContent = await fs.readFile(timetableFilePath, "utf8");
        timetableData = JSON.parse(timetableContent);
      } catch (err) {
        console.error(`Error reading or parsing ${timetableFilePath}:`, err);
        continue;
      }

      // Process each train in the timetable
      const trains = timetableData.trains;
      if (!trains || trains.length === 0) {
        console.log(`No trains found in ${timetableFilePath}`);
        continue;
      }

      for (const train of trains) {
        const trainInfo = train.trainInfo;

        // Prepare the trip record
        const trip = {};
        trip.route_id = routeId;
        trip.trip_id = trainInfo.trainID;
        trip.service_id = trainInfo.trainID;
        trip.trip_short_name = trainInfo.trainNumber;

        // Determine direction_id
        let directionId = "";

        // Check if trainNumber is a special case
        if (specialDirectionIds.hasOwnProperty(trainInfo.trainNumber)) {
          directionId = specialDirectionIds[trainInfo.trainNumber];
        } else {
          // Try to parse trainNumber as a number
          const trainNumberInt = parseInt(trainInfo.trainNumber, 10);
          if (!isNaN(trainNumberInt)) {
            if (trainNumberInt % 2 === 0) {
              directionId = "1"; // Even number
            } else {
              directionId = "0"; // Odd number
            }
          } else {
            directionId = ""; // Leave blank if unable to determine
          }
        }

        if (directionId !== "") {
          trip.direction_id = directionId;
        }

        // Add wheelchair_accessible and bikes_allowed
        trip.wheelchair_accessible = "1"; // Always '1' as per your instruction
        trip.bikes_allowed = trainInfo.hasBaggageCheckIn ? "1" : "2";

        trips.push(trip);

        // Now process stop_times for this trip
        const schedules = train.schedules;
        if (!schedules || Object.keys(schedules).length === 0) {
          console.log(`No schedules found for train ${trainInfo.trainID}`);
          continue;
        }

        // Convert schedules object to an array for sorting
        const stopsArray = Object.entries(schedules).map(
          ([stopId, schedule]) => ({
            stop_id: stopId,
            schedule: schedule,
          })
        );

        // Sort the stopsArray by schedule.num (assuming num indicates the stop sequence)
        stopsArray.sort((a, b) => a.schedule.num - b.schedule.num);

        // Initialize variables for time adjustments
        let stop_sequence = 1;
        let previousDepartureSeconds = null;
        let negativeTimeAdjustmentDone = false;
        let validityDaysAdjusted = false;

        for (const stop of stopsArray) {
          const stopTimeRecord = {};
          stopTimeRecord.trip_id = trip.trip_id;
          stopTimeRecord.stop_id = stop.stop_id;
          stopTimeRecord.stop_sequence = stop_sequence;

          // Determine arrival_time and departure_time
          let arrivalTime = stop.schedule.arrivalTime
            ? stop.schedule.arrivalTime.date
            : null;
          let departureTime = stop.schedule.departureTime
            ? stop.schedule.departureTime.date
            : null;

          if (!arrivalTime && departureTime) {
            arrivalTime = departureTime;
          } else if (!arrivalTime && !departureTime) {
            console.log(
              `No arrival or departure time for stop ${stop.stop_id} in trip ${trip.trip_id}`
            );
            continue; // Skip this stop_time if we have no times
          }

          if (!departureTime && arrivalTime) {
            departureTime = arrivalTime;
          }

          // Extract HH:MM:SS and parse to seconds
          const timeRegex = /(\d{2}):(\d{2}):(\d{2})/;
          let arrivalMatch = arrivalTime.match(timeRegex);
          let departureMatch = departureTime.match(timeRegex);

          if (!arrivalMatch || !departureMatch) {
            console.log(
              `Invalid time format for stop ${stop.stop_id} in trip ${trip.trip_id}`
            );
            continue;
          }

          let arrivalSeconds =
            parseInt(arrivalMatch[1]) * 3600 +
            parseInt(arrivalMatch[2]) * 60 +
            parseInt(arrivalMatch[3]);
          let departureSeconds =
            parseInt(departureMatch[1]) * 3600 +
            parseInt(departureMatch[2]) * 60 +
            parseInt(departureMatch[3]);

          // Adjust times to Eastern Time
          const timezoneType = parseInt(stop.schedule.timezone.timezone_type);
          arrivalSeconds -= timezoneType * 3600;
          departureSeconds -= timezoneType * 3600;

          // Handle negative times
          if (arrivalSeconds < 0 || departureSeconds < 0) {
            if (!negativeTimeAdjustmentDone) {
              // Adjust scheduleDays
              stop.schedule.scheduleDays = stop.schedule.scheduleDays.map(
                (day) => {
                  let newDay = day - 1;
                  if (newDay <= 0) newDay += 7;
                  return newDay;
                }
              );

              if (stop_sequence === 1) {
                // Adjust validityDays
                trainInfo.validityDays = trainInfo.validityDays.map((day) => {
                  let newDay = parseInt(day) - 1;
                  if (newDay <= 0) newDay += 7;
                  return newDay.toString();
                });

                // Adjust validityStart and validityEnd
                const validityStartDate = new Date(trainInfo.validityStart);
                validityStartDate.setDate(validityStartDate.getDate() - 1);
                trainInfo.validityStart = validityStartDate
                  .toISOString()
                  .split("T")[0];

                const validityEndDate = new Date(trainInfo.validityEnd);
                validityEndDate.setDate(validityEndDate.getDate() - 1);
                trainInfo.validityEnd = validityEndDate
                  .toISOString()
                  .split("T")[0];

                validityDaysAdjusted = true;
              }
              negativeTimeAdjustmentDone = true;
            }

            // Add 24 hours to get positive time
            while (arrivalSeconds < 0) {
              arrivalSeconds += 24 * 3600;
              departureSeconds += 24 * 3600;
            }
          }

          // Ensure arrival_time >= previous departure_time
          if (
            previousDepartureSeconds !== null &&
            arrivalSeconds < previousDepartureSeconds
          ) {
            let timeDifference = previousDepartureSeconds - arrivalSeconds;
            let daysToAdd = Math.ceil(timeDifference / (24 * 3600));
            arrivalSeconds += daysToAdd * 24 * 3600;
            departureSeconds += daysToAdd * 24 * 3600;
          }

          // Ensure departure_time >= arrival_time
          if (departureSeconds < arrivalSeconds) {
            let timeDifference = arrivalSeconds - departureSeconds;
            let daysToAdd = Math.ceil(timeDifference / (24 * 3600));
            departureSeconds += daysToAdd * 24 * 3600;
          }

          // Update previousDepartureSeconds
          previousDepartureSeconds = departureSeconds;

          // Format times back to HH:MM:SS
          stopTimeRecord.arrival_time = formatSecondsToTime(arrivalSeconds);
          stopTimeRecord.departure_time = formatSecondsToTime(departureSeconds);

          stopTimes.push(stopTimeRecord);
          stop_sequence++;
        }

        // Generate calendar.txt entry
        const calendarEntry = {};
        calendarEntry.service_id = trip.service_id;
        calendarEntry.start_date = trainInfo.validityStart.replace(/-/g, "");
        calendarEntry.end_date = trainInfo.validityEnd.replace(/-/g, "");

        // Initialize days of week to '0'
        calendarEntry.monday = "0";
        calendarEntry.tuesday = "0";
        calendarEntry.wednesday = "0";
        calendarEntry.thursday = "0";
        calendarEntry.friday = "0";
        calendarEntry.saturday = "0";
        calendarEntry.sunday = "0";

        // Get validityDays from the first stop's schedule
        let firstStop = stopsArray[0];
        let validityDays = validityDaysAdjusted
          ? trainInfo.validityDays
          : firstStop.schedule.validityDays;

        // Map days to calendar fields
        for (const day of validityDays) {
          switch (day) {
            case "1":
              calendarEntry.monday = "1";
              break;
            case "2":
              calendarEntry.tuesday = "1";
              break;
            case "3":
              calendarEntry.wednesday = "1";
              break;
            case "4":
              calendarEntry.thursday = "1";
              break;
            case "5":
              calendarEntry.friday = "1";
              break;
            case "6":
              calendarEntry.saturday = "1";
              break;
            case "7":
              calendarEntry.sunday = "1";
              break;
          }
        }

        calendars.push(calendarEntry);
      }
    }
  }

  // Sort trips by trip_id
  trips.sort((a, b) => {
    if (a.trip_id < b.trip_id) return -1;
    if (a.trip_id > b.trip_id) return 1;
    return 0;
  });

  calendars.sort((a, b) => {
    if (a.service_id < b.service_id) return -1;
    if (a.service_id > b.service_id) return 1;
    return 0;
  });

  // Define the columns for trips.txt according to GTFS specification
  const tripColumns = [
    "route_id",
    "service_id",
    "trip_id",
    "trip_short_name",
    "direction_id",
    "wheelchair_accessible",
    "bikes_allowed",
  ];

  // Write the trips.txt file
  await writeGTFSFile("trips.txt", tripColumns, trips, outputFolder);

  // Define the columns for stop_times.txt according to GTFS specification
  const stopTimeColumns = [
    "trip_id",
    "arrival_time",
    "departure_time",
    "stop_id",
    "stop_sequence",
  ];

  // Write the stop_times.txt file
  await writeGTFSFile(
    "stop_times.txt",
    stopTimeColumns,
    stopTimes,
    outputFolder
  );

  // Define the columns for calendar.txt according to GTFS specification
  const calendarColumns = [
    "service_id",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "start_date",
    "end_date",
  ];

  // Write the calendar.txt file
  await writeGTFSFile("calendar.txt", calendarColumns, calendars, outputFolder);
}

module.exports = makeSchedules;
