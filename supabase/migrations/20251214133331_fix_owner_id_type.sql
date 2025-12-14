/*
  # Fix Owner ID Type

  ## Changes
    - Change `owners.id` from `uuid` to `text` to match the application's ID generation pattern
    - Update foreign key references in documents table
    - Preserve existing data if any
  
  ## Notes
    - This aligns the database schema with the application's ID generation using `getNextId('Owner')`
    - All other tables use text IDs, so this makes the schema consistent
*/

-- First, drop the foreign key constraint on documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_related_owner_id_fkey;

-- Change the type of related_owner_id in documents to text
ALTER TABLE documents ALTER COLUMN related_owner_id TYPE text USING related_owner_id::text;

-- Drop and recreate the owners table with text id
DO $$
BEGIN
  -- Save existing data if any
  CREATE TEMP TABLE IF NOT EXISTS temp_owners AS 
  SELECT * FROM owners;
  
  -- Drop the old table
  DROP TABLE IF EXISTS owners CASCADE;
  
  -- Create new table with text id
  CREATE TABLE owners (
    id text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    document text,
    profession text,
    naturality text,
    marital_status text,
    rg text,
    municipal_registration text,
    address text,
    legal_representative text,
    legal_representative_cpf text,
    photo_url text,
    cnaes jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  
  -- Restore data if any exists (converting uuid to text)
  IF EXISTS (SELECT 1 FROM temp_owners LIMIT 1) THEN
    INSERT INTO owners
    SELECT 
      id::text,
      user_id,
      name,
      email,
      phone,
      document,
      profession,
      naturality,
      marital_status,
      rg,
      municipal_registration,
      address,
      legal_representative,
      legal_representative_cpf,
      photo_url,
      cnaes,
      created_at,
      updated_at
    FROM temp_owners;
  END IF;
  
  DROP TABLE IF EXISTS temp_owners;
END $$;

-- Re-enable RLS
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can read own owners"
  ON owners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own owners"
  ON owners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own owners"
  ON owners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own owners"
  ON owners FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate foreign key constraint on documents
ALTER TABLE documents 
ADD CONSTRAINT documents_related_owner_id_fkey 
FOREIGN KEY (related_owner_id) 
REFERENCES owners(id) 
ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_related_owner_id ON documents(related_owner_id);