
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_dimensi_suara_2024';

app.use(cors());
app.use(express.json());

// --- KONFIGURASI SMTP EMAIL ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', 
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, 
    auth: {
        user: process.env.SMTP_USER || 'email@domain.com',
        pass: process.env.SMTP_PASS || 'password_app'
    }
});

// --- KONFIGURASI FOLDER UPLOAD ---
const UPLOAD_DIRS = {
    base: path.join(__dirname, 'public/uploads'),
    covers: path.join(__dirname, 'public/uploads/covers'),
    audio: path.join(__dirname, 'public/uploads/audio'),
    contracts: path.join(__dirname, 'public/uploads/contracts'),
    others: path.join(__dirname, 'public/uploads/others')
};

Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'coverArt') {
            cb(null, UPLOAD_DIRS.covers);
        } else if (file.fieldname === 'audioFiles' || file.fieldname === 'audioClip') {
            cb(null, UPLOAD_DIRS.audio);
        } else if (['ktpFile', 'npwpFile', 'signatureFile'].includes(file.fieldname)) {
            cb(null, UPLOAD_DIRS.contracts);
        } else {
            cb(null, UPLOAD_DIRS.others);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// --- DATABASE ---
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10
};

const db = mysql.createPool(dbConfig);

const initDb = async () => {
    const connection = await db.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('Admin', 'User') DEFAULT 'User',
                full_name VARCHAR(255),
                contract_id INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Buat Admin Default jika belum ada
        const [admins] = await connection.query("SELECT * FROM users WHERE role = 'Admin'");
        if (admins.length === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await connection.query(
                "INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)",
                ['admin', 'admin@dimensisuara.com', hash, 'Admin', 'Super Admin']
            );
            console.log("Admin default created: admin / admin123");
        }

        // Init other tables (releases, tracks, contracts) as defined previously...
        // (Skipping repetition for brevity, assuming DB schema is handled by the sql file or previous init code)
        
        console.log("Database initialized.");
    } catch (err) {
        console.error("Init DB Error:", err);
    } finally {
        connection.release();
    }
};
initDb();

const getFileUrl = (req, folderName, filename) => {
    if (!filename) return '';
    return `${req.protocol}://${req.get('host')}/uploads/${folderName}/${filename}`;
};

// --- ROUTES ---

// ... (Auth & User Routes) ...

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'User tidak ditemukan' });

        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(401).json({ error: 'Password salah' });

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { username: user.username, role: user.role, fullName: user.full_name } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADMIN MANAGEMENT ROUTES (NEW)

// Get All Admins
app.get('/api/admins', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, email, full_name, created_at FROM users WHERE role = 'Admin'");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add New Admin
app.post('/api/admins', async (req, res) => {
    const { username, email, password, fullName } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, 'Admin', ?)",
            [username, email, hash, fullName]
        );
        res.json({ success: true, message: 'Admin baru berhasil ditambahkan' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Management Routes (Existing)
app.get('/api/users/candidates', async (req, res) => {
    try {
        const sql = `
            SELECT * FROM contracts 
            WHERE status = 'Selesai' 
            AND id NOT IN (SELECT contract_id FROM users WHERE contract_id IS NOT NULL)
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/generate', async (req, res) => {
    const { contractId, email } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [contracts] = await connection.query('SELECT * FROM contracts WHERE id = ?', [contractId]);
        if (contracts.length === 0) throw new Error('Kontrak tidak ditemukan');
        const contract = contracts[0];

        const cleanName = contract.artist_name.replace(/\s+/g, '').toLowerCase().substring(0, 10);
        const randomStr = Math.random().toString(36).slice(-4);
        const username = `${cleanName}${randomStr}`;
        const rawPassword = Math.random().toString(36).slice(-8); 
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        await connection.query(
            `INSERT INTO users (username, email, password_hash, role, full_name, contract_id) 
             VALUES (?, ?, ?, 'User', ?, ?)`,
            [username, email, passwordHash, contract.artist_name, contractId]
        );

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Aktivasi Akun Artist - Dimensi Suara',
            html: `
                <h3>Selamat Bergabung, ${contract.artist_name}!</h3>
                <p>Akun CMS Anda telah dibuat:</p>
                <p>Username: <b>${username}</b><br>Password: <b>${rawPassword}</b></p>
                <p>Login di: <a href="${req.protocol}://${req.get('host')}">Dashboard</a></p>
            `
        };
        await transporter.sendMail(mailOptions);

        await connection.commit();
        res.json({ success: true, message: `User ${username} dibuat & email terkirim.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, email, role, full_name, created_at FROM users");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EXISTING FILE & DATA ROUTES (Release, Contract) ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Checking...' },
        storage: { connected: false, message: 'Checking...' }
    };
    try {
        await db.query('SELECT 1');
        status.database = { connected: true, message: 'Online' };
    } catch(e) { status.database = { connected: false, message: e.message }; }
    
    try {
        fs.accessSync(UPLOAD_DIRS.base, fs.constants.W_OK);
        status.storage = { connected: true, message: 'Writable' };
    } catch(e) { status.storage = { connected: false, message: e.message }; }
    
    res.json(status);
});

// Upload Release
app.post('/api/upload-release', upload.fields([{ name: 'coverArt', maxCount: 1 }, { name: 'audioFiles' }]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const metadata = JSON.parse(req.body.metadata);
        
        let coverArtUrl = '';
        if (req.files['coverArt'] && req.files['coverArt'][0]) {
            coverArtUrl = getFileUrl(req, 'covers', req.files['coverArt'][0].filename);
        }

        const [releaseResult] = await connection.query(
            `INSERT INTO releases (title, upc, status, artist_name, label, language, version, is_new_release, original_release_date, planned_release_date, aggregator, cover_art_url, submission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [metadata.title, metadata.upc, 'Pending', metadata.primaryArtists.join(', '), metadata.label, metadata.language, metadata.version, metadata.isNewRelease ? 1 : 0, metadata.originalReleaseDate || null, metadata.plannedReleaseDate || null, metadata.aggregator || null, coverArtUrl]
        );
        const releaseId = releaseResult.insertId;

        const uploadedAudioFiles = req.files['audioFiles'] || [];
        for (let i = 0; i < metadata.tracks.length; i++) {
            const track = metadata.tracks[i];
            let audioUrl = '';
            if (uploadedAudioFiles[i]) audioUrl = getFileUrl(req, 'audio', uploadedAudioFiles[i].filename);

            await connection.query(
                `INSERT INTO tracks (release_id, title, track_number, isrc, duration, genre, explicit_lyrics, composer, lyricist, lyrics, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [releaseId, track.title, track.trackNumber, track.isrc, track.duration, track.genre, track.explicitLyrics, track.composer, track.lyricist, track.lyrics, audioUrl]
            );
        }
        await connection.commit();
        res.json({ success: true, message: "Rilis berhasil disimpan!" });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// Contracts Endpoints
app.post('/api/contracts', upload.fields([{ name: 'ktpFile', maxCount: 1 }, { name: 'npwpFile', maxCount: 1 }, { name: 'signatureFile', maxCount: 1 }]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        const sql = `INSERT INTO contracts (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status || 'Pending', 'LOCAL'];
        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE contracts SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Releases Endpoint
app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        const releasesWithTracks = await Promise.all(rows.map(async (release) => {
            const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
            return {
                ...release,
                id: release.id.toString(),
                primaryArtists: release.artist_name ? release.artist_name.split(', ') : [],
                isNewRelease: !!release.is_new_release,
                tracks: tracks.map(t => ({
                    ...t,
                    id: t.id.toString(),
                    trackNumber: t.track_number,
                    explicitLyrics: t.explicit_lyrics,
                    artists: [{ name: release.artist_name, role: 'MainArtist' }],
                    contributors: [],
                    audioFileUrl: t.audio_url 
                })),
                coverArtUrl: release.cover_art_url 
            };
        }));
        res.json(releasesWithTracks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: `Not found: ${req.path}` });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Backend Running. Frontend build not found.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
