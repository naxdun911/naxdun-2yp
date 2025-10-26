 -- Add historical data table to track building occupancy over time
CREATE TABLE building_history (
    id SERIAL PRIMARY KEY,
    building_id VARCHAR(10) NOT NULL,
    current_crowd INT NOT NULL CHECK (current_crowd >= 0),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_building_history
        FOREIGN KEY (building_id) 
        REFERENCES buildings(building_id)
        ON DELETE CASCADE
);

-- Create index for better query performance
CREATE INDEX idx_building_history_building_id ON building_history(building_id);
CREATE INDEX idx_building_history_timestamp ON building_history(timestamp);
CREATE INDEX idx_building_history_building_timestamp ON building_history(building_id, timestamp);