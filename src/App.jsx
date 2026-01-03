import { useState, useEffect } from 'react';
import { fetchTransactions, addTransaction, setApiUrl as saveApiUrl } from './api';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL') || '');
  const [isSetup, setIsSetup] = useState(!!(import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL')));
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    description: '',
    type: 'Expense'
  });

  useEffect(() => {
    if (isSetup) {
      loadData();
    }
  }, [isSetup]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTransactions();
      if (Array.isArray(data)) {
        // Normalize keys and map standard names
        const normalizedData = data.map(item => {
          const newItem = {};
          Object.keys(item).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('date')) newItem.date = item[key];
            else if (lowerKey.includes('amount')) newItem.amount = item[key];
            else if (lowerKey.includes('category')) newItem.category = item[key];
            else if (lowerKey.includes('description')) newItem.description = item[key];
            else if (lowerKey.includes('type')) newItem.type = item[key]; // Handles 'type (income/expense)'
            else newItem[lowerKey] = item[key];
          });
          return newItem;
        });
        setTransactions(normalizedData.reverse());
      } else {
        console.error('Data received is not an array:', data);
        setTransactions([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const handleSetup = (e) => {
    e.preventDefault();
    if (apiUrl.startsWith('https://script.google.com/')) {
      saveApiUrl(apiUrl);
      setIsSetup(true);
    } else {
      alert('Please enter a valid Google Apps Script URL');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addTransaction({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setIsModalOpen(false);
      setFormData({ amount: '', category: 'Food', description: '', type: 'Expense' });
      // Reload after addition - note: no-cors prevents confirming status but we can try refresh
      setTimeout(loadData, 2000);
    } catch (error) {
      alert('Error adding transaction');
    }
    setLoading(false);
  };

  const totalIncome = transactions
    .filter(t => t && t.type && t.type.toLowerCase() === 'income')
    .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t && t.type && t.type.toLowerCase() === 'expense')
    .reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  const balance = totalIncome - totalExpense;

  if (!isSetup) {
    return (
      <div className="setup-overlay">
        <h2>Welcome</h2>
        <p>Please paste your Google Apps Script Web App URL to begin.</p>
        <form onSubmit={handleSetup}>
          <div className="form-group">
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/..."
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Start Tracking</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="glass-card balance-card">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">${balance.toLocaleString()}</div>
      </div>

      <div className="stats-grid">
        <div className="glass-card stat-item income">
          <div className="stat-label">Income</div>
          <div className="stat-value">+${totalIncome.toLocaleString()}</div>
        </div>
        <div className="glass-card stat-item expense">
          <div className="stat-label">Expense</div>
          <div className="stat-value">-${totalExpense.toLocaleString()}</div>
        </div>
      </div>

      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Recent Activity</h3>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {transactions.length} items found
        </div>
        <button onClick={loadData} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      <div className="transaction-list">
        {transactions.map((t, i) => {
          // Relaxed check: render even if minimal data
          if (!t) return null;
          const type = (t.type || 'expense').toLowerCase();
          const amount = parseFloat(t.amount || 0);
          return (
            <div key={i} className="transaction-item">
              <div className="transaction-info">
                <span className="transaction-title">{t.description || t.category || 'Untitled'}</span>
                <span className="transaction-meta">{t.date ? new Date(t.date).toLocaleDateString() : ''} • {t.category || 'Other'}</span>
              </div>
              <div className={`transaction-amount amount-${type}`}>
                {t.type === 'Income' ? '+' : '-'}${amount.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <button className="fab" onClick={() => setIsModalOpen(true)}>+</button>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px' }}>Add Transaction</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Salary">Salary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was it for?"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Processing...' : 'Add Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
