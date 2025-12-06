-- Voither Narrative Studio D1 Migrations
-- Drop tables if they exist for a clean slate during development resets
DROP TABLE IF EXISTS Sessions;
DROP TABLE IF EXISTS Patients;
-- Create Patients Table
-- Stores unique patient information, identified by a unique patient_id.
CREATE TABLE Patients (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    context TEXT,
    metadata TEXT, -- JSON object for additional patient details
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
);
-- Create Sessions Table
-- Stores individual session data, linked to a patient. Clinician details are stored here.
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    clinician_name TEXT,
    crm TEXT,
    stages TEXT, -- JSON array of pipeline stages
    report TEXT, -- JSON object for the final NarrativeReportData
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    last_active INTEGER DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES Patients(id) ON DELETE CASCADE
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_id ON Patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_patient_id ON Sessions(patient_id);