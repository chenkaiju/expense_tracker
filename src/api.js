/**
 * API service to communicate with Google Apps Script
 */

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL');
};

export const setApiUrl = (url) => {
  localStorage.setItem('EXPENSE_TRACKER_API_URL', url);
};

export const fetchTransactions = async () => {
  const url = getApiUrl();
  if (!url) return [];

  try {
    // 加上 ?t=時間戳記，防止瀏覽器讀取舊的緩存
    const cacheBuster = url.includes('?') ? `&t=${Date.now()}` : `?t=${Date.now()}`;
    const response = await fetch(url + cacheBuster);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
};

const getTaiwanDate = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
};

export const addTransaction = async (transaction) => {
  const url = getApiUrl();
  if (!url) throw new Error('API URL not set');

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requires no-cors or specialized handling for POST
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transaction,
        date: getTaiwanDate()
      }),
    });
    // With no-cors, we can't read the response body, but we can assume success if no error
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
        row: transaction.row || transaction.id, // Map id to row for backend
        action: 'update'
      }),
    });
    return { status: 'success' };
  } catch (error) {
    console.error('Update error:', error);
    throw error;
  }
};
