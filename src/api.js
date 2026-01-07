/**
 * API service to communicate with Google Apps Script
 */

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL');
};

export const setApiUrl = (url) => {
  localStorage.setItem('EXPENSE_TRACKER_API_URL', url);
};

const getAuthToken = () => {
  return localStorage.getItem('EXPENSE_TRACKER_TOKEN') || '';
};

export const setAuthToken = (token) => {
  localStorage.setItem('EXPENSE_TRACKER_TOKEN', token);
};

export const fetchTransactions = async (year, month) => {
  const url = getApiUrl();
  if (!url) return [];

  try {
    const token = getAuthToken();
    let queryParams = `?t=${Date.now()}&token=${encodeURIComponent(token)}`;

    if (year && month) {
      queryParams += `&year=${year}&month=${month}`;
    }

    const fullUrl = url.includes('?') ? url + queryParams.replace('?', '&') : url + queryParams;

    const response = await fetch(fullUrl);

    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    if (data.error && data.error.includes('Unauthorized')) {
      throw new Error('Unauthorized');
    }
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    if (error.message === 'Unauthorized') throw error;
    return [];
  }
};

export const fetchAvailableMonths = async () => {
  const url = getApiUrl();
  if (!url) return [];
  try {
    const token = getAuthToken();
    const queryParams = `?action=get_months&token=${encodeURIComponent(token)}`;
    const fullUrl = url.includes('?') ? url + queryParams.replace('?', '&') : url + queryParams;
    const response = await fetch(fullUrl);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Failed to fetch months", e);
    return [];
  }
};

const formatDateToTaiwan = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  // Use Intl.DateTimeFormat to strictly get YYYY, MM, DD in Taiwan time
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA outputs YYYY-MM-DD
  return formatter.format(date);
};

export const addTransaction = async (transaction) => {
  const url = getApiUrl();
  if (!url) throw new Error('API URL not set');

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        'sub category': transaction.subCategory || '',
        date: formatDateToTaiwan(new Date()),
        token: getAuthToken() // Add Token
      }),
    });
    return { status: 'success' };
  } catch (error) {
    console.error('Post error:', error);
    throw error;
  }
};

export const updateTransaction = async (transaction) => {
  const url = getApiUrl();
  if (!url) throw new Error('API URL not set');

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        'sub category': transaction.subCategory || '',
        row: transaction.row || transaction.id,
        sheetName: transaction.sheetName,
        date: formatDateToTaiwan(transaction.date),
        action: 'update',
        token: getAuthToken() // Add Token
      }),
    });
    return { status: 'success' };
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
};

export const deleteTransaction = async (rowId, sheetName) => {
  const url = getApiUrl();
  if (!url) throw new Error('API URL not set');

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        row: rowId,
        sheetName: sheetName,
        action: 'delete',
        token: getAuthToken() // Add Token
      }),
    });
    return { status: 'success' };
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};
