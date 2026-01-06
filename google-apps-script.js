/**
 * Google Apps Script Backend for Expense Tracker
 * 
 * Paste this code into your Google Apps Script editor.
 */

// SECURITY: Change this to your desired passcode!
const API_KEY = '123456';

const LEGACY_SHEET_NAME = 'Transactions';

function getSheetByName(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);

    // Create sheet if it doesn't exist
    if (!sheet) {
        sheet = ss.insertSheet(name);
        // Add headers
        sheet.appendRow(['Date', 'Amount', 'Category', 'Sub Category', 'Description', 'Type']);
    }

    // Ensure "Sub Category" header exists (migration check)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Sub Category')) {
        sheet.getRange(1, headers.length + 1).setValue('Sub Category');
    }

    return sheet;
}

function getTargetSheetForDate(dateString) {
    // Expects YYYY-MM-DD
    const date = new Date(dateString);
    // Format YYYY/MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sheetName = `${year}/${month}`;
    return { sheet: getSheetByName(sheetName), sheetName: sheetName };
}

function doGet(e) {
    // Auth Check
    if (!e.parameter.token || e.parameter.token !== API_KEY) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheets = ss.getSheets();
        let allData = [];

        sheets.forEach(sheet => {
            const name = sheet.getName();
            // Match YYYY/MM pattern or legacy 'Transactions'
            if (/^\d{4}\/\d{2}$/.test(name) || name === LEGACY_SHEET_NAME) {
                const data = sheet.getDataRange().getValues();
                if (data.length > 1) {
                    const headers = data[0];
                    const rows = data.slice(1);

                    const sheetRows = rows.map((row, index) => {
                        let obj = {
                            row: index + 2,
                            sheetName: name // Important: tell frontend where this row lives
                        };
                        headers.forEach((header, i) => {
                            obj[header.toLowerCase()] = row[i];
                        });
                        return obj;
                    });
                    allData = allData.concat(sheetRows);
                }
            }
        });

        return ContentService.createTextOutput(JSON.stringify(allData))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e) {
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        let params;
        try {
            params = JSON.parse(e.postData.contents);
        } catch (err) {
            params = e.parameter;
        }

        // Auth Check
        if (!params.token || params.token !== API_KEY) {
            return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized: Invalid or missing token' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ACTION: UPDATE
        if (params.action === 'update' && params.row) {
            // Must provide sheetName for update/delete now
            // Fallback to legacy sheet if not provided (backward compatibility)
            const targetSheetName = params.sheetName || LEGACY_SHEET_NAME;
            const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);

            if (!sheet) throw new Error(`Sheet '${targetSheetName}' not found`);

            const headers = sheet.getDataRange().getValues()[0];
            const rowIndex = parseInt(params.row);

            headers.forEach((header, i) => {
                const key = header.toLowerCase();
                if (params[key] !== undefined) {
                    sheet.getRange(rowIndex, i + 1).setValue(params[key]);
                }
            });
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row updated' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ACTION: DELETE
        if (params.action === 'delete' && params.row) {
            const targetSheetName = params.sheetName || LEGACY_SHEET_NAME;
            const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);

            if (!sheet) throw new Error(`Sheet '${targetSheetName}' not found`);

            const rowIndex = parseInt(params.row);
            sheet.deleteRow(rowIndex);
            return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Row deleted' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // ACTION: ADD (Default)
        // Determine sheet based on date
        const dateStr = params.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const { sheet } = getTargetSheetForDate(dateStr);

        const headers = sheet.getDataRange().getValues()[0];
        const newRow = headers.map(header => {
            const key = header.toLowerCase();
            let val = params[key];
            if (key === 'date' && !val) val = new Date();
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
