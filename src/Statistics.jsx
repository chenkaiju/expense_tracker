import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const Statistics = ({ transactions }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const monthlyData = useMemo(() => {
        // 1. Filter by month and Expense type
        const filtered = transactions.filter(t => {
            if (!t.date || !t.type || t.type.toLowerCase() !== 'expense') return false;
            return t.date.startsWith(currentMonth); // Assumes YYYY-MM-DD
        });

        // 2. Group by category
        const grouped = filtered.reduce((acc, curr) => {
            const cat = curr.category || 'Other';
            const amount = parseFloat(curr.amount || 0);
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});

        // 3. Convert to array for Recharts
        const data = Object.keys(grouped).map(key => ({
            name: key,
            value: grouped[key]
        })).sort((a, b) => b.value - a.value);

        const total = data.reduce((sum, item) => sum + item.value, 0);

        return { data, total };
    }, [transactions, currentMonth]);

    const availableMonths = useMemo(() => {
        const months = new Set();
        transactions.forEach(t => {
            if (t.date) months.add(t.date.slice(0, 7));
        });
        return Array.from(months).sort().reverse();
    }, [transactions]);

    return (
        <div className="statistics-container" style={{ padding: '20px', animation: 'fadeIn 0.3s ease' }}>
            <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Statistics</h2>
                <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(e.target.value)}
                    style={{
                        padding: '5px 10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    {availableMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                    {!availableMonths.includes(currentMonth) && (
                        <option value={currentMonth}>{currentMonth}</option>
                    )}
                </select>
            </div>

            <div className="total-expense" style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Expense</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${monthlyData.total.toLocaleString()}</div>
            </div>

            {monthlyData.data.length > 0 ? (
                <>
                    <div style={{ height: '250px', marginBottom: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={monthlyData.data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {monthlyData.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="stats-list">
                        {monthlyData.data.map((item, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                marginBottom: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }}></div>
                                    <span>{item.name}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span>${item.value.toLocaleString()}</span>
                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                        {((item.value / monthlyData.total) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', color: '#aaa', marginTop: '50px' }}>
                    No expenses found for this month.
                </div>
            )}
        </div>
    );
};

export default Statistics;
