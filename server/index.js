
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Configuration
// SESUAIKAN PASSWORD DAN USERNAME DI SINI
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      // Default XAMPP user
    password: '',      // Default XAMPP password (kosong)
    database: 'dimensi_suara_db'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database');
});

// --- API ROUTES ---

// 1. Get All Contracts
app.get('/api/contracts', (req, res) => {
    const sql = 'SELECT * FROM contracts ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Add New Contract
app.post('/api/contracts', (req, res) => {
    const { 
        contract_number, artist_name, type, start_date, 
        end_date, duration_years, royalty_rate, status, notes 
    } = req.body;

    const sql = `INSERT INTO contracts 
    (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        contract_number, artist_name, type, start_date, 
        end_date, duration_years, royalty_rate, status, notes
    ];

    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Contract added', id: result.insertId, ...req.body });
    });
});

// 3. Delete Contract
app.delete('/api/contracts/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM contracts WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Contract deleted' });
    });
});

// 4. Check Unique Contract Number
app.get('/api/contracts/check/:number', (req, res) => {
    const { number } = req.params;
    const sql = 'SELECT COUNT(*) as count FROM contracts WHERE contract_number = ?';
    db.query(sql, [number], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const isUnique = results[0].count === 0;
        res.json({ isUnique });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
