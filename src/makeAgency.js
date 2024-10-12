// src/makeAgency.js

const path = require("path");
const writeGTFSFile = require("./gtfsWriter");

function makeAgency(data, outputFolder) {
  const agencies = data.agencies;

  // Map agencies from JSON to GTFS format
  const gtfsAgencies = agencies.map((agency) => {
    const gtfsAgency = {};

    // Direct mappings
    gtfsAgency.agency_id = agency.agency_id;
    gtfsAgency.agency_lang = agency.agency_lang;
    gtfsAgency.agency_timezone = agency.agency_timezone;
    gtfsAgency.agency_fare_url = agency.agency_fare_url;
    gtfsAgency.agency_phone = agency.agency_phone;
    gtfsAgency.agency_branding_url = agency.agency_branding_url;

    // Extract 'en' translations for agency_name and agency_url
    const agencyNameEn = agency.agency_name.translations.find(
      (t) => t.lang === "en"
    );
    const agencyUrlEn = agency.agency_url.translations.find(
      (t) => t.lang === "en"
    );

    gtfsAgency.agency_name = agencyNameEn ? agencyNameEn.translation : "";
    gtfsAgency.agency_url = agencyUrlEn ? agencyUrlEn.translation : "";

    return gtfsAgency;
  });

  // Define the columns for agency.txt according to GTFS specification
  const columns = [
    "agency_id",
    "agency_name",
    "agency_url",
    "agency_timezone",
    "agency_lang",
    "agency_phone",
    "agency_fare_url",
    "agency_branding_url",
  ];

  // Write the GTFS file
  return writeGTFSFile("agency.txt", columns, gtfsAgencies, outputFolder);
}

module.exports = makeAgency;
