# React + Vite Expense Tracker

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Backend Setup (Google Apps Script)

This project uses Google Sheets as a database via Google Apps Script.

1. Create a Google Sheet with headers: `Date`, `Amount`, `Category`, `Description`, `Type`.
2. Go to **Extensions** > **Apps Script**.
3. Copy the content of [google-apps-script.js](./google-apps-script.js) into the script editor.
4. Click **Deploy** > **New Deployment** > **Web App**.
5. Set "Execute as" to **Me** and "Who has access" to **Anyone**.
6. Copy the Web App URL and paste it into the app's setup screen.

## Features
- ✨ Glassmorphism UI
- 📊 Income/Expense tracking
- ✏️ Edit existing transactions
- ☁️ Sync with Google Sheets
