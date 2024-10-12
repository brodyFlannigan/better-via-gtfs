// src/makeTimetableNotes.js

const fs = require("fs").promises;
const path = require("path");
const writeGTFSFile = require("./gtfsWriter");

async function makeTimetableNotes(outputFolder) {
  const timetableDirectory = path.join(__dirname, "..", "data", "timetables");
  const files = await fs.readdir(timetableDirectory);

  const timetableNotes = {};
  const timetableNotesReferencesSet = new Set(); // To ensure uniqueness
  const timetableNotesReferences = [];

  // Define stop-specific notices and their show_on_stoptime values
  const stopSpecificNoticesConfig = {
    V: "0", // show_on_stoptime is '0'
    12: "1", // show_on_stoptime is '1'
    "12a": "1",
    // Add more stop-specific notices here
  };

  for (const file of files) {
    if (file.endsWith(".json")) {
      const filePath = path.join(timetableDirectory, file);
      let timetableData;
      try {
        const content = await fs.readFile(filePath, "utf8");
        timetableData = JSON.parse(content);
      } catch (err) {
        console.error(`Error reading or parsing ${filePath}:`, err);
        continue;
      }

      // Process stationNotices
      const stationNotices = timetableData.stationNotices;
      if (stationNotices) {
        for (const noteId in stationNotices) {
          if (stationNotices.hasOwnProperty(noteId)) {
            const notice = stationNotices[noteId];

            // If the note_id is not already in timetableNotes, add it
            if (!timetableNotes[noteId]) {
              timetableNotes[noteId] = {
                note_id: noteId,
                symbol: "",
                note: notice.descEN,
                note_fr: notice.descFR,
              };
            }
          }
        }
      }

      // Process generalNotices
      const generalNotices = timetableData.generalNotices;
      if (generalNotices) {
        for (const noteId in generalNotices) {
          if (generalNotices.hasOwnProperty(noteId)) {
            const notice = generalNotices[noteId];

            // If the note_id is not already in timetableNotes, add it
            if (!timetableNotes[noteId]) {
              timetableNotes[noteId] = {
                note_id: noteId,
                symbol: "",
                note: notice.descEN,
                note_fr: notice.descFR,
              };
            }
          }
        }
      }

      // Process timetable_notes_references.txt
      // For each train (trip), and generalNotice, create a reference
      const trains = timetableData.trains;
      if (trains) {
        for (const train of trains) {
          const trainInfo = train.trainInfo;
          const tripId = trainInfo.trainID;

          // Process generalNotices references
          if (generalNotices) {
            for (const noteId in generalNotices) {
              if (generalNotices.hasOwnProperty(noteId)) {
                // Create a unique key to prevent duplicates
                const key = `${noteId}_${tripId}_0`;
                if (!timetableNotesReferencesSet.has(key)) {
                  timetableNotesReferencesSet.add(key);
                  timetableNotesReferences.push({
                    note_id: noteId,
                    trip_id: tripId,
                    show_on_stoptime: "0",
                  });
                }
              }
            }
          }

          // Process stationNotices references in schedules
          const schedules = train.schedules;
          if (schedules) {
            for (const stopId in schedules) {
              if (schedules.hasOwnProperty(stopId)) {
                const schedule = schedules[stopId];
                const stopNotices = schedule.notices;
                if (stopNotices && Array.isArray(stopNotices)) {
                  for (const noticeId of stopNotices) {
                    if (stopSpecificNoticesConfig.hasOwnProperty(noticeId)) {
                      // This is a stop-specific notice
                      const showOnStoptime =
                        stopSpecificNoticesConfig[noticeId];
                      // Create a unique key to prevent duplicates
                      const key = `${noticeId}_${schedule.stationCode}_stopSpecific`;
                      if (!timetableNotesReferencesSet.has(key)) {
                        timetableNotesReferencesSet.add(key);
                        timetableNotesReferences.push({
                          note_id: noticeId,
                          stop_id: schedule.stationCode,
                          show_on_stoptime: showOnStoptime,
                          // trip_id is left empty
                        });
                      }
                    } else {
                      // Process as before
                      // Create a unique key to prevent duplicates
                      const key = `${noticeId}_${tripId}_${stopId}_1`;
                      if (!timetableNotesReferencesSet.has(key)) {
                        timetableNotesReferencesSet.add(key);
                        timetableNotesReferences.push({
                          note_id: noticeId,
                          trip_id: tripId,
                          stop_id: schedule.stationCode,
                          show_on_stoptime: "1",
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Prepare data for timetable_notes.txt
  const timetableNotesArray = Object.values(timetableNotes);

  // Define columns for timetable_notes.txt
  const notesColumns = ["note_id", "symbol", "note", "note_fr"];

  // Write timetable_notes.txt
  await writeGTFSFile(
    "timetable_notes.txt",
    notesColumns,
    timetableNotesArray,
    outputFolder
  );

  // Define columns for timetable_notes_references.txt
  const referencesColumns = [
    "note_id",
    "trip_id",
    "stop_id",
    "show_on_stoptime",
  ];

  // Write timetable_notes_references.txt
  await writeGTFSFile(
    "timetable_notes_references.txt",
    referencesColumns,
    timetableNotesReferences,
    outputFolder
  );

  console.log(
    "timetable_notes.txt and timetable_notes_references.txt have been generated successfully."
  );
}

module.exports = makeTimetableNotes;
