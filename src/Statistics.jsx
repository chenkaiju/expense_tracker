import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const Statistics = ({ transactions }) => {
    const [selectedCategory, setSelectedCategory] = useState(null);

    const statsData = useMemo(() => {
        // 1. Filter by Expense type (Date filtering is now done server-side/globally)
        let filtered = transactions.filter(t => {
            if (!t.type || t.type.toLowerCase() !== 'expense') return false;
            return true;
        });

        // 2. If category selected, filter by that category
        if (selectedCategory) {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        // 3. Group by Category (if root) or Sub Category (if selected)
        const grouped = filtered.reduce((acc, curr) => {
            let key;
            if (selectedCategory) {
                key = curr['sub category'] || 'Uncategorized';
            } else {
                key = curr.category || 'Other';
            }

            const amount = parseFloat(curr.amount || 0);
            acc[key] = (acc[key] || 0) + amount;
            return acc;
        }, {});

        // 4. Convert to array for Recharts
        const data = Object.keys(grouped).map(key => ({
            name: key,
            value: grouped[key]
        })).sort((a, b) => b.value - a.value);

        // Calculate total for the CURRENT view
        const total = data.reduce((sum, item) => sum + item.value, 0);

        return { data, total };
    }, [transactions, selectedCategory]);

    const handleSliceClick = (entry) => {
        if (!selectedCategory) {
            setSelectedCategory(entry.name);
        }
    };

    return (
        <div className="statistics-container" style={{ padding: '0 0 20px 0', animation: 'fadeIn 0.3s ease' }}>
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedCategory && (
                        <button
                            onClick={() => setSelectedCategory(null)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                    )}
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedCategory || 'Expense Breakdown'}</h2>
                </div>
            </div>

            <div className="total-expense" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {selectedCategory ? `${selectedCategory} Total` : 'Total Expense'}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    ${statsData.total.toLocaleString()}
                </div>
            </div>

            {statsData.data.length > 0 ? (
                <>
                    <div style={{ height: '250px', marginBottom: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statsData.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={handleSliceClick}
                                    style={{ cursor: !selectedCategory ? 'pointer' : 'default' }}
                                >
                                    {statsData.data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            style={{ outline: 'none' }}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {!selectedCategory && (
                            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#aaa', marginTop: '-10px' }}>
                                Tap a slice to see details
                            </div>
                        )}
                    </div>

                    <div className="stats-list">
                        {statsData.data.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => handleSliceClick(item)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    marginBottom: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    cursor: !selectedCategory ? 'pointer' : 'default',
                                    transition: 'transform 0.2s',
                                    transform: 'scale(1)'
                                }}
                                onMouseEnter={(e) => { if (!selectedCategory) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' }}
                                onMouseLeave={(e) => { if (!selectedCategory) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontWeight: 'bold' }}>${item.value.toLocaleString()}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                        {statsData.total > 0 ? ((item.value / statsData.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>
                    No expenses found for this period.
                </div>
            )}
        </div>
    );
};

export default Statistics;
