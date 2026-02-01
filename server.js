
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

const upload = multer({ storage: multer.memoryStorage() });

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

// --- IMPROVED GOOGLE AUTH (Supports User OAuth2 Token) ---
async function getDriveClient(req) {
    const authHeader = req.headers.authorization;
    
    // Priority 1: User OAuth2 Access Token from Frontend
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: token });
        return google.drive({ version: 'v3', auth: oauth2Client });
    }

    // Priority 2: Service Account (Fallback)
    const possiblePaths = [
        path.join(__dirname, 'service-account.json'),
        path.join(process.cwd(), 'service-account.json'),
        '/var/www/vhosts/ruangdimensirecords.com/cms.ruangdimensirecords.com/service-account.json'
    ];
    
    let credentials;
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                break;
            } catch (e) {}
        }
    }

    if (credentials) {
        const auth = new google.auth.GoogleAuth({ 
            credentials, 
            scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'] 
        });
        return google.drive({ version: 'v3', auth });
    }

    return null;
}

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
        fields: 'id',
        supportsAllDrives: true
    });
    return response.data.id;
};

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: '' },
        googleDrive: { connected: false, message: '' },
        serverTime: new Date().toISOString()
    };

    try {
        await db.query('SELECT 1');
        status.database.connected = true;
        status.database.message = "Database OK";
    } catch (err) {
        status.database.message = err.message;
    }

    try {
        const drive = await getDriveClient(req);
        if (drive) {
            const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
            if (folderId) {
                const folder = await drive.files.get({ fileId: folderId, fields: 'id, name', supportsAllDrives: true });
                status.googleDrive.connected = true;
                status.googleDrive.message = `Folder: "${folder.data.name}"`;
            } else {
                status.googleDrive.message = "Folder ID Kosong";
            }
        } else {
            status.googleDrive.message = "Drive Client Gagal";
        }
    } catch (err) {
        status.googleDrive.message = err.message;
    }
    res.json(status);
});

app.post('/api/contracts', upload.fields([
    { name: 'ktpFile', maxCount: 1 },
    { name: 'npwpFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
    let driveFolderId = null;
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        
        const drive = await getDriveClient(req);
        if (drive) {
            const parentId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
            if (parentId) {
                const folderResponse = await drive.files.create({
                    requestBody: {
                        name: contractNumber,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentId]
                    },
                    fields: 'id',
                    supportsAllDrives: true
                });
                driveFolderId = folderResponse.data.id;

                if (req.files['ktpFile']) {
                    await uploadToDrive(drive, req.files['ktpFile'][0].buffer, `KTP-${contractNumber}.jpg`, 'image/jpeg', driveFolderId);
                }
                if (req.files['npwpFile']) {
                    await uploadToDrive(drive, req.files['npwpFile'][0].buffer, `NPWP-${contractNumber}.jpg`, 'image/jpeg', driveFolderId);
                }
                if (req.files['signatureFile']) {
                    await uploadToDrive(drive, req.files['signatureFile'][0].buffer, `Signature-${contractNumber}.jpg`, 'image/jpeg', driveFolderId);
                }
            }
        }

        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.query(sql, [contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status || 'Pending', driveFolderId]);
        res.status(201).json({ success: true, message: "Berhasil disimpan ke Drive & DB." });
    } catch (err) {
        console.error("Critical Upload Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

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
        await db.query('UPDATE contracts SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
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
    if (req.path.startsWith('/api')) return res.status(404).json({ error: "Not Found" });
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
