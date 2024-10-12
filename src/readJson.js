// src/readJson.js
const fs = require('fs').promises;

async function readJson(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(data);
        return jsonData;
    } catch (err) {
        throw err;
    }
}

module.exports = readJson;
