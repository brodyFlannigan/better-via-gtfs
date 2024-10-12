// src/makeRoutes.js

const writeGTFSFile = require('./gtfsWriter');

function makeRoutes(data, outputFolder) {
    const routes = data.routes;

    // Map routes from JSON to GTFS format
    const gtfsRoutes = routes.map(route => {
        const gtfsRoute = {};

        // Direct mappings
        gtfsRoute.route_id = route.route_id;
        gtfsRoute.route_type = route.route_type;
        gtfsRoute.route_color = route.route_color || '';
        gtfsRoute.route_text_color = route.route_text_color || '';

        // Optional agency_id mapping if available
        if (route.agency_id) {
            gtfsRoute.agency_id = route.agency_id;
        }

        // Extract 'en' translations for route_short_name and route_long_name
        const shortNameEn = route.route_short_name.translations.find(t => t.lang === 'en');
        const longNameEn = route.route_long_name.translations.find(t => t.lang === 'en');

        gtfsRoute.route_short_name = shortNameEn ? shortNameEn.translation : '';
        gtfsRoute.route_long_name = longNameEn ? longNameEn.translation : '';

        // Optional route_url if available
        if (route.route_url && route.route_url.translations) {
            const routeUrlEn = route.route_url.translations.find(t => t.lang === 'en');
            gtfsRoute.route_url = routeUrlEn ? routeUrlEn.translation : '';
        }

        return gtfsRoute;
    });

    // Define the columns for routes.txt according to GTFS specification
    const columns = [
        'route_id',
        'agency_id',
        'route_short_name',
        'route_long_name',
        'route_type',
        'route_url',
        'route_color',
        'route_text_color'
    ];

    // Write the GTFS file
    return writeGTFSFile('routes.txt', columns, gtfsRoutes, outputFolder);
}

module.exports = makeRoutes;
