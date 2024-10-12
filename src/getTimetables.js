// src/getTimetables.js

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetches timetable data from VIA Rail's website and saves it as JSON files.
 *
 * @param {Object} routesData - The data from routes-timetables.json.
 */
async function getTimetables(routesData) {
  const timetableUrlsSet = new Set(); // To avoid duplicates
  const timetableDirectory = path.join(__dirname, "..", "data", "timetables");

  // Ensure the timetables directory exists
  try {
    await fs.mkdir(timetableDirectory, { recursive: true });
  } catch (err) {
    console.error(`Error creating timetables directory:`, err);
  }

  // Collect all timetable URLs
  for (const route of routesData.routes) {
    const timetableUrls = route.timetable_urls;
    if (timetableUrls && timetableUrls.length > 0) {
      for (const url of timetableUrls) {
        timetableUrlsSet.add(url);
      }
    }
  }

  // Fetch, parse, and save each timetable
  for (const url of timetableUrlsSet) {
    console.log(`Processing timetable URL: ${url}`);
    try {
      // Fetch the page content
      const response = await axios.get(url);
      const htmlContent = response.data;

      // Load the HTML content into cheerio
      const $ = cheerio.load(htmlContent);

      // Find all script tags
      const scriptTags = $("script");

      let found = false;

      // Iterate over script tags to find window.trainsSchedules
      scriptTags.each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes("window.trainsSchedules")) {
          // Extract the JSON data
          const regex = /window\.trainsSchedules\s*=\s*(\{[\s\S]*?\})\s*;/;
          const match = regex.exec(scriptContent);
          if (match && match[1]) {
            let jsonDataString = match[1];

            // Remove the semicolon at the end if present
            jsonDataString = jsonDataString.trim();
            if (jsonDataString.endsWith(";")) {
              jsonDataString = jsonDataString.slice(0, -1);
            }

            try {
              // Parse the JSON data
              const jsonData = JSON.parse(jsonDataString);

              // Get the slug from the URL
              const urlParts = url.split("/");
              const slug = urlParts[urlParts.length - 1];

              // Write the JSON data to the timetables directory
              const filePath = path.join(timetableDirectory, `${slug}.json`);

              // Pretty-print the JSON data
              const jsonString = JSON.stringify(jsonData, null, 2);

              // Write the file
              fs.writeFile(filePath, jsonString, "utf8")
                .then(() => {
                  console.log(`Timetable saved to ${filePath}`);
                })
                .catch((err) => {
                  console.error(`Error writing file ${filePath}:`, err);
                });

              found = true;
            } catch (err) {
              console.error(`Error parsing JSON data from ${url}:`, err);
            }
          } else {
            console.error(`Could not extract JSON data from script in ${url}`);
          }
        }
      });

      if (!found) {
        console.error(`window.trainsSchedules not found in ${url}`);
      }

      // Wait for 1 second before processing the next timetable to avoid overloading the server
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Error processing ${url}:`, err);
    }
  }
}

module.exports = getTimetables;
