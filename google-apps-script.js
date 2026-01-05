/**
 * Google Apps Script Backend for Expense Tracker
 * 
 * Paste this code into your Google Apps Script editor (found in Google Sheets -> Extensions -> Apps Script)
 * Deployment: Deploy > New Deployment > Web App
 * Access: Anyone
 */

const SHEET_NAME = 'Transactions';

function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist (optional safeguard)
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        // Add default headers if new sheet
        sheet.appendRow(['Date', 'Amount', 'Category', 'Description', 'Type']);
    }
    return sheet;
}

function doGet(e) {
    try {
        const sheet = getSheet();
        const data = sheet.getDataRange().getValues();

        // Handle empty sheet case
        if (data.length < 1) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        const headers = data[0];
        const rows = data.slice(1);

        const result = rows.map((row, index) => {
            let obj = { row: index + 2 }; // Store row index (1-based, +1 for header)
            headers.forEach((header, i) => {
                // Handle date formatting if needed, or send raw
                obj[header.toLowerCase()] = row[i]; // Use lowercase keys for frontend consistency
            });
            // Safety: ensure keys match what frontend expects if headers have different casing
            // Note: Frontend maps keys by strict inclusion checks, so this is fine.
            return obj;
        });

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000); // Prevent race conditions

    try {
        const sheet = getSheet();
        let params;

        try {
            params = JSON.parse(e.postData.contents);
        } catch (err) {
            params = e.parameter;
        }

        const headers = sheet.getDataRange().getValues()[0];

        // ACTION: UPDATE
        if (params.action === 'update' && params.row) {
            const rowIndex = parseInt(params.row);
            headers.forEach((header, i) => {
                const key = header.toLowerCase();
                // If the param exists in the request, update it. 
                // Note: For date, frontend sends ISO string, Apps Script usually handles it fine.
                if (params[key] !== undefined) {
                    sheet.getRange(rowIndex, i + 1).setValue(params[key]);
                }
            });
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row updated' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ACTION: DELETE
        if (params.action === 'delete' && params.row) {
            const rowIndex = parseInt(params.row);
            sheet.deleteRow(rowIndex);
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row deleted' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ACTION: ADD (Default)
        const newRow = headers.map(header => {
            const key = header.toLowerCase();
            let val = params[key];

            // Auto-generate date if missing (matches your original code logic)
            if (key === 'date' && !val) {
                val = new Date();
            }
            return val !== undefined ? val : "";
        });

        sheet.appendRow(newRow);

        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row added' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}
