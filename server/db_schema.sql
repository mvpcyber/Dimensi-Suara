
CREATE DATABASE IF NOT EXISTS dimensi_suara_db;
USE dimensi_suara_db;

-- Tabel Kontrak
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    artist_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT NOT NULL,
    royalty_rate INT NOT NULL,
    status ENUM('Pending', 'Review', 'Proses', 'Selesai') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Rilis (Header)
CREATE TABLE IF NOT EXISTS releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    upc VARCHAR(50),
    status ENUM('Pending', 'Processing', 'Live', 'Rejected', 'Draft') DEFAULT 'Pending',
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    artist_name VARCHAR(255),
    aggregator VARCHAR(100),
    drive_folder_id VARCHAR(255),
    language VARCHAR(100),
    label VARCHAR(255),
    version VARCHAR(100),
    is_new_release BOOLEAN DEFAULT TRUE,
    original_release_date DATE,
    planned_release_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Lagu (Tracks)
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_id INT,
    title VARCHAR(255) NOT NULL,
    track_number INT,
    isrc VARCHAR(50),
    duration VARCHAR(20),
    instrumental VARCHAR(10) DEFAULT 'No',
    genre VARCHAR(100),
    explicit_lyrics VARCHAR(10) DEFAULT 'No',
    composer VARCHAR(255),
    lyricist VARCHAR(255),
    lyrics TEXT,
    audio_url VARCHAR(255),
    clip_url VARCHAR(255),
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);
