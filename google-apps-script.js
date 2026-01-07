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
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    try {
        // 1. Auth Check
        const params = e.parameter;
        const token = params.token;
        if (token !== API_KEY) {
            return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheets = ss.getSheets();
        let transactions = [];

        // Handle 'get_months' action
        if (params.action === 'get_months') {
            const months = [];
            sheets.forEach(sheet => {
                const name = sheet.getName();
                // Match YYYY/MM pattern
                if (/^\d{4}\/\d{2}$/.test(name)) {
                    // Convert YYYY/MM to YYYY-MM for frontend
                    months.push(name.replace('/', '-'));
                }
            });
            // Sort descending (latest first)
            months.sort().reverse();
            return ContentService.createTextOutput(JSON.stringify(months))
                .setMimeType(ContentService.MimeType.JSON);
        }

        // 2. Determine Target Month for transactions
        // If year/month provided, look for that specific sheet.
        // If NOT provided, default to CURRENT MONTH.
        let targetSheetName = '';

        if (params.year && params.month) {
            targetSheetName = `${params.year}/${params.month.toString().padStart(2, '0')}`;
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            targetSheetName = `${year}/${month}`;
        }

        // 3. fetch data
        // We try to find the specific monthly sheet. 
        // If it doesn't exist, we just return empty list (or legacy if you really want, but for performance let's stick to month)
        const targetSheet = ss.getSheetByName(targetSheetName);

        if (targetSheet) {
            const range = targetSheet.getDataRange();
            const data = range.getValues();
            const displayData = range.getDisplayValues();
            const headers = data[0].map(h => h.toString().trim().toLowerCase());

            // Helper to find column index (case-insensitive)
            const getColIndex = (name) => headers.indexOf(name.toLowerCase());

            const dateIdx = getColIndex('date');
            const amountIdx = getColIndex('amount');
            const catIdx = getColIndex('category');
            const subCatIdx = getColIndex('sub category');
            const descIdx = getColIndex('description');
            const typeIdx = getColIndex('type');

            // Skip header row
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const dRow = displayData[i];
                transactions.push({
                    row: i + 1,
                    sheetName: targetSheetName,
                    date: dateIdx > -1 ? row[dateIdx] : '',
                    amount: amountIdx > -1 ? row[amountIdx] : 0,
                    category: catIdx > -1 ? dRow[catIdx] : '',
                    'sub category': subCatIdx > -1 ? dRow[subCatIdx] : '',
                    description: descIdx > -1 ? dRow[descIdx] : '',
                    type: typeIdx > -1 ? dRow[typeIdx] : 'Expense'
                });
            }
        }

        // Legacy support: If user specifically asks for 'all' or we want to include legacy, we could.
        // But for optimization, let's strictly return the requested month.

        return ContentService.createTextOutput(JSON.stringify(transactions))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ error: e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

function parseSheetData(sheet, data) {
    if (data.length <= 1) return [];
    const headers = data[0];
    const rows = data.slice(1);
    const sheetName = sheet.getName();

    return rows.map((row, index) => {
        let obj = {
            row: index + 2,
            sheetName: sheetName
        };
        headers.forEach((header, i) => {
            obj[header.toLowerCase()] = row[i];
        });
        return obj;
    });
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

            const headers = sheet.getDataRange().getValues()[0].map(h => h.toString().trim().toLowerCase());
            const rowIndex = parseInt(params.row);

            headers.forEach((header, i) => {
                const key = header; // already lowercase/trimmed
                if (params[key] !== undefined) {
                    sheet.getRange(rowIndex, i + 1).setValue(params[key]);
                }
                // Also handle title-case sub category parameter if needed
                if (key === 'sub category' && params.subCategory !== undefined) {
                    sheet.getRange(rowIndex, i + 1).setValue(params.subCategory);
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

        const headers = sheet.getDataRange().getValues()[0].map(h => h.toString().trim().toLowerCase());
        const newRow = headers.map(header => {
            const key = header;
            let val = params[key];
            if (key === 'sub category' && val === undefined) val = params.subCategory;
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
