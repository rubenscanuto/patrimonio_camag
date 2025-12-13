/*
  # Create Patrimônio360 Database Schema

  ## Overview
  Complete database schema for the Patrimônio360 property management application.
  This migration creates all necessary tables with proper relationships, security policies, and audit trails.

  ## New Tables

  ### 1. `owners` - Property Owners (Individuals or Companies)
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `name` (text, required) - Owner name
    - `email` (text) - Contact email
    - `phone` (text) - Contact phone
    - `document` (text) - CPF or CNPJ
    - `profession` (text)
    - `naturality` (text)
    - `marital_status` (text)
    - `rg` (text) - RG or Inscrição Estadual
    - `municipal_registration` (text)
    - `address` (text)
    - `legal_representative` (text)
    - `legal_representative_cpf` (text)
    - `photo_url` (text)
    - `cnaes` (jsonb) - CNAE codes for companies
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. `property_tags` - Tags for categorizing properties
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `label` (text, required)
    - `color` (text, required)
    - `created_at` (timestamptz)

  ### 3. `properties` - Real Estate Properties
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `owner_id` (uuid, foreign key to owners)
    - `name` (text, required)
    - `address` (text, required)
    - `address_components` (jsonb) - Structured address data
    - `value` (numeric, required) - Current accounting value
    - `purchase_value` (numeric, required)
    - `purchase_date` (text)
    - `seller` (text)
    - `status` (text, required) - 'Occupied', 'Vacant', 'Under Maintenance'
    - `image_url` (text)
    - `tenant_name` (text)
    - `contract_expiry` (text)
    - `registry_data` (jsonb) - Property registry information
    - `custom_fields` (jsonb) - User-defined fields
    - `tags` (text[]) - Array of tag IDs
    - `coordinates` (jsonb) - Lat/lng coordinates
    - `market_value` (numeric) - Estimated market value
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 4. `maintenance_records` - Property maintenance history
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `property_id` (text, foreign key to properties)
    - `date` (text, required)
    - `description` (text, required)
    - `cost` (numeric, required, default 0)
    - `status` (text, required) - 'Pending' or 'Completed'
    - `created_at` (timestamptz)

  ### 5. `documents` - Document vault
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `name` (text, required)
    - `category` (text, required) - Document category
    - `upload_date` (text, required)
    - `summary` (text)
    - `related_property_id` (text, foreign key to properties)
    - `related_owner_id` (uuid, foreign key to owners)
    - `content_raw` (text) - Raw document content for analysis
    - `ai_analysis` (jsonb) - AI analysis results
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 6. `employees` - Team members and collaborators
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `name` (text, required)
    - `role` (text, required)
    - `assigned_properties` (text[]) - Array of property IDs
    - `contact` (text, required)
    - `active_tasks` (integer, default 0)
    - `status` (text, required) - 'Active' or 'On Leave'
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 7. `ai_configs` - AI API configurations
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `label` (text, required)
    - `provider` (text, required) - 'Google Gemini', 'OpenAI', etc.
    - `api_key` (text, required)
    - `model_name` (text, required)
    - `is_active` (boolean, default false)
    - `created_at` (timestamptz)

  ### 8. `cloud_accounts` - Cloud storage integrations
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `provider` (text, required)
    - `account_name` (text, required)
    - `credentials` (jsonb)
    - `is_connected` (boolean, default false)
    - `auth_date` (text)
    - `created_at` (timestamptz)

  ### 9. `indices_database` - Economic indices history
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `date` (text, required) - Format: YYYY-MM
    - `indices` (jsonb, required) - Index values (IPCA, IGPM, etc.)
    - `created_at` (timestamptz)

  ### 10. `logs` - Audit trail
    - `id` (text, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `timestamp` (text, required)
    - `action` (text, required) - 'Create', 'Update', 'Delete', etc.
    - `entity_type` (text, required)
    - `description` (text, required)
    - `user_name` (text)
    - `details` (text)
    - `created_at` (timestamptz)

  ### 11. `trash` - Soft delete recycle bin
    - `id` (text, primary key) - Original item ID
    - `user_id` (uuid, foreign key to auth.users)
    - `deleted_at` (text, required)
    - `original_data` (jsonb, required)
    - `entity_type` (text, required)
    - `name` (text, required)
    - `created_at` (timestamptz)

  ### 12. `user_profiles` - Extended user information
    - `id` (uuid, primary key, foreign key to auth.users)
    - `name` (text, required)
    - `email` (text, required)
    - `company_name` (text, required)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security

  All tables have Row Level Security (RLS) enabled with policies that:
  - Allow authenticated users to read only their own data
  - Allow authenticated users to create/update/delete only their own data
  - Ensure complete data isolation between users

  ## Indexes

  Key indexes created for:
  - Foreign key relationships
  - Frequently queried fields
  - User-scoped data access
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- OWNERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);

-- ============================================================================
-- PROPERTY TAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_tags (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE property_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tags"
  ON property_tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON property_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON property_tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON property_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_property_tags_user_id ON property_tags(user_id);

-- ============================================================================
-- PROPERTIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES owners(id) ON DELETE SET NULL,
  name text NOT NULL,
  address text NOT NULL,
  address_components jsonb,
  value numeric NOT NULL DEFAULT 0,
  purchase_value numeric NOT NULL DEFAULT 0,
  purchase_date text,
  seller text,
  status text NOT NULL DEFAULT 'Vacant',
  image_url text,
  tenant_name text,
  contract_expiry text,
  registry_data jsonb,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT ARRAY[]::text[],
  coordinates jsonb,
  market_value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own properties"
  ON properties FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- ============================================================================
-- MAINTENANCE RECORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_records (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id text NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date text NOT NULL,
  description text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own maintenance records"
  ON maintenance_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own maintenance records"
  ON maintenance_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own maintenance records"
  ON maintenance_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own maintenance records"
  ON maintenance_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_user_id ON maintenance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_property_id ON maintenance_records(property_id);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  upload_date text NOT NULL,
  summary text,
  related_property_id text REFERENCES properties(id) ON DELETE SET NULL,
  related_owner_id uuid REFERENCES owners(id) ON DELETE SET NULL,
  content_raw text,
  ai_analysis jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_id ON documents(related_property_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(related_owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- ============================================================================
-- EMPLOYEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  assigned_properties text[] DEFAULT ARRAY[]::text[],
  contact text NOT NULL,
  active_tasks integer DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own employees"
  ON employees FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
  ON employees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- ============================================================================
-- AI CONFIGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_configs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  model_name text NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own AI configs"
  ON ai_configs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI configs"
  ON ai_configs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI configs"
  ON ai_configs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI configs"
  ON ai_configs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_configs_user_id ON ai_configs(user_id);

-- ============================================================================
-- CLOUD ACCOUNTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloud_accounts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_name text NOT NULL,
  credentials jsonb DEFAULT '{}'::jsonb,
  is_connected boolean DEFAULT false,
  auth_date text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cloud_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cloud accounts"
  ON cloud_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cloud accounts"
  ON cloud_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cloud accounts"
  ON cloud_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cloud accounts"
  ON cloud_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cloud_accounts_user_id ON cloud_accounts(user_id);

-- ============================================================================
-- INDICES DATABASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS indices_database (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date text NOT NULL,
  indices jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE indices_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own indices"
  ON indices_database FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own indices"
  ON indices_database FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own indices"
  ON indices_database FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own indices"
  ON indices_database FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_indices_database_user_id ON indices_database(user_id);
CREATE INDEX IF NOT EXISTS idx_indices_database_date ON indices_database(date);

-- ============================================================================
-- LOGS (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  description text NOT NULL,
  user_name text,
  details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
  ON logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_entity_type ON logs(entity_type);

-- ============================================================================
-- TRASH (Recycle Bin)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trash (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at text NOT NULL,
  original_data jsonb NOT NULL,
  entity_type text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own trash"
  ON trash FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trash"
  ON trash FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trash"
  ON trash FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trash_user_id ON trash(user_id);
CREATE INDEX IF NOT EXISTS idx_trash_entity_type ON trash(entity_type);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_owners_updated_at') THEN
    CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_properties_updated_at') THEN
    CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
    CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employees_updated_at') THEN
    CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;