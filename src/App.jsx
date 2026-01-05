import { useState, useEffect } from 'react';
import { fetchTransactions, addTransaction, updateTransaction, deleteTransaction, setApiUrl as saveApiUrl } from './api';
import { CATEGORIES } from './txnCategories';
import Statistics from './Statistics';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'statistics'
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL') || '');
  const [isSetup, setIsSetup] = useState(!!(import.meta.env.VITE_API_URL || localStorage.getItem('EXPENSE_TRACKER_API_URL')));
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    category: '食',
    subCategory: '早餐',
    description: '',
    type: 'Expense'
  });

  // Calculate available categories based on type
  const currentCategories = CATEGORIES[formData.type] || {};
  const allowSubCategories = currentCategories[formData.category] || [];

  // Reset category when type changes if current category is invalid
  useEffect(() => {
    const cats = CATEGORIES[formData.type] || {};
    if (!cats[formData.category]) {
      const firstCat = Object.keys(cats)[0];
      setFormData(prev => ({
        ...prev,
        category: firstCat,
        subCategory: cats[firstCat]?.[0] || ''
      }));
    }
  }, [formData.type]);

  // Reset sub-category when main category changes
  useEffect(() => {
    const cats = CATEGORIES[formData.type] || {};
    const subs = cats[formData.category] || [];
    if (!subs.includes(formData.subCategory)) {
      setFormData(prev => ({ ...prev, subCategory: subs[0] || '' }));
    }
  }, [formData.category]);

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
        const normalizedData = data.map((item, index) => {
          const newItem = { id: index }; // Fallback ID if none exists
          Object.keys(item).forEach(key => {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('date')) newItem.date = item[key];
            else if (lowerKey.includes('amount')) newItem.amount = item[key];
            else if (lowerKey.includes('sub') && lowerKey.includes('category')) newItem['sub category'] = item[key];
            else if (lowerKey.includes('category')) newItem.category = item[key];
            else if (lowerKey.includes('description')) newItem.description = item[key];
            else if (lowerKey.includes('type')) newItem.type = item[key];
            else if (lowerKey === 'id' || lowerKey === 'row') newItem.id = item[key];
            else if (lowerKey === 'sheetname') newItem.sheetName = item[key];
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

  const openAddModal = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      category: '食',
      subCategory: '早餐',
      description: '',
      type: 'Expense'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (transaction) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setLoading(true);
      try {
        const rowId = transaction.row || transaction.id;
        await deleteTransaction(rowId, transaction.sheetName);
        // Reload after deletion
        setTimeout(loadData, 2000);
      } catch (error) {
        alert('Error deleting transaction');
      }
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    // Ensure type matches the select options (Title Case)
    let type = transaction.type || 'Expense';
    type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

    // Map backend response 'sub category' to state
    const category = transaction.category || '食';
    const subCategory = transaction['sub category'] || (CATEGORIES[type]?.[category]?.[0] || '');

    setFormData({
      amount: transaction.amount,
      category: category,
      subCategory: subCategory,
      description: transaction.description || '',
      type: type
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTransaction) {
        await updateTransaction({
          ...editingTransaction,
          ...formData,
          amount: parseFloat(formData.amount)
        });
      } else {
        await addTransaction({
          ...formData,
          amount: parseFloat(formData.amount)
        });
      }
      setIsModalOpen(false);
      setFormData({ amount: '', category: 'Food', description: '', type: 'Expense' });
      // Reload after addition/update
      setTimeout(loadData, 2000);
    } catch (error) {
      alert('Error saving transaction');
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
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      {currentView === 'dashboard' ? (
        <>
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
              if (!t) return null;
              const type = (t.type || 'expense').toLowerCase();
              const amount = parseFloat(t.amount || 0);
              return (
                <div key={i} className="transaction-item" onClick={() => handleEdit(t)}>
                  <div className="transaction-info">
                    <span className="transaction-title">{t.description || t.category || 'Untitled'}</span>
                    <span className="transaction-meta">
                      {t.date ? new Date(t.date).toLocaleDateString() : ''} • {t.category} {t['sub category'] ? `- ${t['sub category']}` : ''}
                    </span>
                  </div>
                  <div className="transaction-right">
                    <div className={`transaction-amount amount-${type}`}>
                      {type === 'income' ? '+' : '-'}${amount.toLocaleString()}
                    </div>
                    <button
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(t);
                      }}
                      aria-label="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t);
                      }}
                      aria-label="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="fab" onClick={openAddModal}>+</button>
        </>
      ) : (
        <Statistics transactions={transactions} />
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Home</span>
        </button>
        <button
          className={`nav-item ${currentView === 'statistics' ? 'active' : ''}`}
          onClick={() => setCurrentView('statistics')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Stats</span>
        </button>
      </nav>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px' }}>{editingTransaction ? 'Edit' : 'Add'} Transaction</h2>
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ flex: 1 }}
                  >
                    {Object.keys(currentCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={formData.subCategory}
                    onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                    style={{ flex: 1 }}
                  >
                    {allowSubCategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
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
                {loading ? 'Processing...' : (editingTransaction ? 'Update' : 'Add') + ' Transaction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
