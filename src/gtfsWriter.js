const fs = require('fs');
const path = require('path');

// Function to properly escape field values according to CSV rules
function escapeField(field) {
    if (typeof field !== 'string') {
        return field;
    }
    
    // Escape double quotes by doubling them
    const escapedField = field.replace(/"/g, '""');
    
    // Enclose the field in quotes if it contains commas or quotes
    if (escapedField.includes(',') || escapedField.includes('"')) {
        return `"${escapedField}"`;
    }
    
    return escapedField;
}

function writeGTFSFile(fileName, columns, data, outputFolder) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(outputFolder, fileName);
        const folderPath = path.dirname(filePath);

        // Ensure the directory exists
        fs.mkdir(folderPath, { recursive: true }, (err) => {
            if (err) return reject(err);

            // Write the CSV file
            const header = columns.join(',') + '\n';
            const rows = data.map(row => {
                return columns.map(col => escapeField(row[col] || '')).join(',');  // Explicit mapping with escaping
            }).join('\n') + '\n';
            const fileContent = header + rows;

            // Write to file with UTF-8 encoding
            fs.writeFile(filePath, fileContent, 'utf8', (writeErr) => {
                if (writeErr) return reject(writeErr);
                resolve();
            });
        });
    });
}

module.exports = writeGTFSFile;
