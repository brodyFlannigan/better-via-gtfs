// index.js

const path = require("path");
const readJson = require("./src/readJson");
const getTimetables = require("./src/getTimetables"); // Import getTimetables
const makeAgency = require("./src/makeAgency");
const makeRoutes = require("./src/makeRoutes");
const makeStops = require("./src/makeStops");
const makeSchedules = require("./src/makeSchedules");
const makeTimetableNotes = require("./src/makeTimetableNotes");
const compressToZip = require("./src/compressToZip");

async function main() {
  try {
    // Define paths
    const routesJsonFilePath = path.join(
      __dirname,
      "config",
      "routes-timetables.json"
    );
    const stationsJsonFilePath = path.join(
      __dirname,
      "config",
      "stations-en.json"
    );
    const outputFolder = path.join(__dirname, "data", "gtfs");

    // Get the output ZIP file path from command-line arguments or use a default
    const outputZipPath =
      process.argv[2] || path.join(__dirname, "data", "gtfs.zip");

    // Read the JSON data
    const data = await readJson(routesJsonFilePath);
    const stationsData = await readJson(stationsJsonFilePath);

    // Fetch and save timetables
    await getTimetables(data);
    console.log("Timetables have been fetched and saved successfully.");

    // Create agency.txt
    await makeAgency(data, outputFolder);
    console.log("agency.txt has been generated successfully.");

    // Create routes.txt
    await makeRoutes(data, outputFolder);
    console.log("routes.txt has been generated successfully.");

    // Create stops.txt
    await makeStops(stationsData, outputFolder);
    console.log("stops.txt has been generated successfully.");

    // Create trips.txt, stop_times.txt, and calendar.txt
    await makeSchedules(data, outputFolder);
    console.log(
      "trips.txt, stop_times.txt, and calendar.txt have been generated successfully."
    );

    // Create timetable_notes.txt and timetable_notes_references.txt
    await makeTimetableNotes(outputFolder);
    console.log(
      "timetable_notes.txt and timetable_notes_references.txt have been generated successfully."
    );

    // Compress the output directory into a ZIP file
    await compressToZip(outputFolder, outputZipPath);
    console.log(`All files have been compressed into ${outputZipPath}.`);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
