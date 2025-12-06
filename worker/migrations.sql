-- Voither Narrative Studio D1 Migrations
-- Drop tables if they exist for a clean slate during development resets
DROP TABLE IF EXISTS Sessions;
DROP TABLE IF EXISTS Patients;
-- Create Patients Table
-- Stores unique patient information, identified by a composite key of patient_id and crm.
CREATE TABLE Patients (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    context TEXT,
    crm TEXT NOT NULL,
    metadata TEXT, -- JSON object for additional details
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    UNIQUE(patient_id, crm)
);
-- Create Sessions Table
-- Stores individual session data, linked to a patient.
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    stages TEXT, -- JSON array of pipeline stages
    report TEXT, -- JSON object for the final NarrativeReportData
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    last_active INTEGER DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES Patients(id) ON DELETE CASCADE
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_id ON Patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_patient_id ON Sessions(patient_id);