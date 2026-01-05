/**
 * Google Apps Script Backend for Expense Tracker
 * 
 * Paste this code into your Google Apps Script editor.
 */

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

function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist (optional safeguard)
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        // Add default headers if new sheet
        sheet.appendRow(['Date', 'Amount', 'Category', 'Sub Category', 'Description', 'Type']);
    }

    // Check if "Sub Category" header exists, if not add it
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('Sub Category')) {
        sheet.getRange(1, headers.length + 1).setValue('Sub Category');
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
