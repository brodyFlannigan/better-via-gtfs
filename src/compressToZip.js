// src/compressToZip.js

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Compresses all files in the input directory into a ZIP file.
 *
 * @param {string} inputDir - The directory containing the files to compress.
 * @param {string} outputZipPath - The path where the ZIP file will be saved.
 * @returns {Promise<void>}
 */
async function compressToZip(inputDir, outputZipPath) {
    return new Promise((resolve, reject) => {
        // Check if the output ZIP file already exists
        if (fs.existsSync(outputZipPath)) {
            // Delete the existing ZIP file
            fs.unlinkSync(outputZipPath);
        }

        // Create a file to stream archive data to.
        const output = fs.createWriteStream(outputZipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level to maximum.
        });

        // Listen for all archive data to be written
        output.on('close', () => {
            console.log(`ZIP file has been created: ${outputZipPath} (${archive.pointer()} total bytes)`);
            resolve();
        });

        // Handle errors on the output stream
        output.on('error', (err) => {
            reject(err);
        });

        // Handle errors on the archive
        archive.on('error', (err) => {
            reject(err);
        });

        // Pipe archive data to the file
        archive.pipe(output);

        // Append all files in the input directory to the archive
        archive.directory(inputDir, false);

        // Finalize the archive (i.e., finish the file)
        archive.finalize();
    });
}

module.exports = compressToZip;
