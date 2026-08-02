-- Add country column to searches table.
-- Defaults to 'usa' for backward compatibility with existing searches.

ALTER TABLE searches ADD COLUMN country TEXT NOT NULL DEFAULT 'usa';
