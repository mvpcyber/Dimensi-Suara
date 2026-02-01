
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import multer from 'multer';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MULTER SETUP (Memory storage for easy piping to Drive) ---
const upload = multer({ storage: multer.memoryStorage() });

// --- DATABASE CONNECTION ---
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 
};

const db = mysql.createPool(dbConfig);

// --- GOOGLE AUTH ---
async function getGoogleAuth() {
    const possiblePaths = [
        path.join(__dirname, 'service-account.json'),
        path.join(process.cwd(), 'service-account.json'),
        '/var/www/vhosts/ruangdimensirecords.com/cms.ruangdimensirecords.com/service-account.json'
    ];
    
    let credentials;
    let foundPath = 'Tidak ditemukan';

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                foundPath = filePath;
                break;
            } catch (e) {
                console.error(`Gagal memproses JSON di ${filePath}:`, e.message);
            }
        }
    }

    if (!credentials) return { auth: null, pathChecked: possiblePaths.join(' | ') };

    const auth = new google.auth.GoogleAuth({ 
        credentials, 
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'] 
    });
    
    return { auth, foundPath };
}

// Helper to pipe buffer to Drive
const uploadToDrive = async (drive, buffer, fileName, mimeType, parentId) => {
    const media = {
        mimeType: mimeType,
        body: Readable.from(buffer)
    };
    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [parentId]
        },
        media: media,
        fields: 'id'
    });
    return response.data.id;
};

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Menghubungkan...' },
        googleDrive: { connected: false, message: 'Menunggu...', email: '', suggestion: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' },
        serverTime: new Date().toISOString()
    };

    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = `Koneksi MySQL Berhasil (127.0.0.1)`;
    } catch (err) {
        status.database.message = `MySQL Error: ${err.message}`;
    }

    const { auth, foundPath } = await getGoogleAuth();
    status.fileSystem.serviceAccountExists = !!auth;
    status.fileSystem.pathChecked = foundPath;

    if (auth) {
        try {
            const drive = google.drive({ version: 'v3', auth });
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;
            const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
            
            if (folderId) {
                try {
                    const folder = await drive.files.get({ fileId: folderId, fields: 'id, name' });
                    status.googleDrive.connected = true;
                    status.googleDrive.message = `Terhubung ke Folder Utama: "${folder.data.name}"`;
                } catch (driveErr) {
                    status.googleDrive.message = `Drive API Error: ${driveErr.message}`;
                }
            } else {
                status.googleDrive.message = 'ID Folder belum diatur.';
            }
        } catch (err) {
            status.googleDrive.message = `Auth Error: ${err.message}`;
        }
    } else {
        status.googleDrive.message = 'File service-account.json tidak ditemukan.';
    }
    res.json(status);
});

// Contracts: Create with File Upload
app.post('/api/contracts', upload.fields([
    { name: 'ktpFile', maxCount: 1 },
    { name: 'npwpFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        
        const { auth } = await getGoogleAuth();
        let driveFolderId = null;

        if (auth) {
            const drive = google.drive({ version: 'v3', auth });
            const parentId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

            if (parentId) {
                // 1. Create Sub-folder for this contract
                const folderResponse = await drive.files.create({
                    requestBody: {
                        name: contractNumber,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentId]
                    },
                    fields: 'id'
                });
                driveFolderId = folderResponse.data.id;

                // 2. Upload Files to that folder
                if (req.files['ktpFile']) {
                    const file = req.files['ktpFile'][0];
                    await uploadToDrive(drive, file.buffer, `KTP-${contractNumber}.jpg`, file.mimetype, driveFolderId);
                }
                if (req.files['npwpFile']) {
                    const file = req.files['npwpFile'][0];
                    await uploadToDrive(drive, file.buffer, `NPWP-${contractNumber}.jpg`, file.mimetype, driveFolderId);
                }
                if (req.files['signatureFile']) {
                    const file = req.files['signatureFile'][0];
                    await uploadToDrive(drive, file.buffer, `Signature-${contractNumber}.jpg`, file.mimetype, driveFolderId);
                }
            }
        }

        // 3. Save to Database
        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [
            contractNumber, 
            artistName, 
            startDate, 
            endDate, 
            durationYears, 
            royaltyRate, 
            status || 'Pending',
            driveFolderId
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId, message: "Kontrak dan file berhasil disimpan." });
    } catch (err) {
        console.error("Database/Drive Error:", err);
        res.status(500).json({ success: false, error: "Gagal menyimpan: " + err.message });
    }
});

// Contracts: Get All
app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const sql = `UPDATE contracts SET status = ? WHERE id = ?`;
        const [result] = await db.query(sql, [status, id]);
        res.json({ success: true, message: "Status kontrak berhasil diperbarui." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM contracts WHERE id = ?', [id]);
        res.json({ success: true, message: "Kontrak dihapus." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.path} tidak ditemukan.` });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Build frontend tidak ditemukan.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});
