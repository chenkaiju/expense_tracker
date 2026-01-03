/**
 * API service to communicate with Google Apps Script
 */

const getApiUrl = () => {
  return localStorage.getItem('EXPENSE_TRACKER_API_URL');
};

export const setApiUrl = (url) => {
  localStorage.setItem('EXPENSE_TRACKER_API_URL', url);
};

export const fetchTransactions = async () => {
  const url = getApiUrl();
  if (!url) return [];
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return [];
  }
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
        date: new Date().toISOString().split('T')[0]
      }),
    });
    // With no-cors, we can't read the response body, but we can assume success if no error
    return { status: 'success' };
  } catch (error) {
    console.error('Post error:', error);
    throw error;
  }
};
