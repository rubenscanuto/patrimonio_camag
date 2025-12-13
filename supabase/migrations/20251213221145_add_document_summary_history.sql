/*
  # Add Summary Edit History to Documents

  1. Changes
    - Add `summary_history` column to `documents` table
      - Type: JSONB array storing edit history
      - Each entry contains: timestamp, content, editedBy
    
  2. Notes
    - This allows tracking all edits made to document summaries
    - Users can undo changes and view edit history
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'summary_history'
  ) THEN
    ALTER TABLE documents ADD COLUMN summary_history JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;