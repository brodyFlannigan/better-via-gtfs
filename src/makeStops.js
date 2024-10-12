// src/makeStops.js

const writeGTFSFile = require("./gtfsWriter");

function makeStops(stationsData, outputFolder) {
  // Define corrections for specific stops
  const stopCorrections = {
    ODAY: {
      stop_lat: "57.597606499857136",
      stop_lon: "-94.2102018522963",
    },
    SPAR: {
      stop_name: "Parry Sound Gallery",
    },
    PARS: {
      stop_name: "Parry Sound",
    },
    NEWY: {
      stop_desc: "Penn Station",
    },
    // Add more corrections here as needed
  };

  // Map stations from JSON to GTFS format
  const gtfsStops = stationsData.map((station) => {
    const gtfsStop = {};

    gtfsStop.stop_id = station.short_code;
    gtfsStop.stop_code = station.short_code;
    gtfsStop.stop_name = station.name;

    // stop_desc: leave blank if additional_info is the same as name
    if (station.additional_info && station.additional_info !== station.name) {
      gtfsStop.stop_desc = station.additional_info;
    } else {
      gtfsStop.stop_desc = "";
    }

    gtfsStop.stop_lat = station.geo_data.latitude;
    gtfsStop.stop_lon = station.geo_data.longitude;

    // Handle timezone exception
    let timezone = station.timezone;
    if (timezone === "Etc/GMT+6") {
      timezone = "Canada/Saskatchewan";
    }
    gtfsStop.stop_timezone = timezone;

    // Apply corrections if any
    if (stopCorrections[gtfsStop.stop_id]) {
      const corrections = stopCorrections[gtfsStop.stop_id];
      Object.assign(gtfsStop, corrections);
    }

    return gtfsStop;
  });

  // Define the columns for stops.txt according to GTFS specification
  const columns = [
    "stop_id",
    "stop_code",
    "stop_name",
    "stop_desc",
    "stop_lat",
    "stop_lon",
    "stop_timezone",
  ];

  // Write the GTFS file
  return writeGTFSFile("stops.txt", columns, gtfsStops, outputFolder);
}

module.exports = makeStops;
