
CREATE DATABASE IF NOT EXISTS dimensi_suara_db;

USE dimensi_suara_db;

CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    artist_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT NOT NULL,
    royalty_rate INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contoh Data Dummy (Opsional)
INSERT INTO contracts (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status)
VALUES 
('DS.001-01012024', 'Budi Doremi', 'Exclusive', '2024-01-01', '2025-01-01', 1, 70, 'Active'),
('DS.002-02012024', 'Sheila On 7', 'Distribution', '2024-02-01', '2026-02-01', 2, 80, 'Active');
