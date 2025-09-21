-- Drop existing tables if they exist
DROP TABLE IF EXISTS network_sessions CASCADE;
DROP TABLE IF EXISTS billing_records CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Admins table
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tenants table
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  unit_number VARCHAR(20) NOT NULL,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('Basic', 'Standard', 'Premium')),
  speed_range VARCHAR(20) NOT NULL,
  rate_per_gb DECIMAL(10,2) NOT NULL,
  data_usage DECIMAL(10,2) DEFAULT 0,
  current_bill DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'current' CHECK (payment_status IN ('current', 'pending', 'overdue')),
  connection_status VARCHAR(20) DEFAULT 'offline' CHECK (connection_status IN ('online', 'offline')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Billing records table
CREATE TABLE billing_records (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  data_consumed DECIMAL(10,2) NOT NULL,
  rate_per_gb DECIMAL(10,2) NOT NULL,
  usage_charges DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, billing_month)
);

-- Network sessions table
CREATE TABLE network_sessions (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  device_mac VARCHAR(17) NOT NULL,
  device_ip VARCHAR(15),
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  data_uploaded BIGINT DEFAULT 0,
  data_downloaded BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_unit_number ON tenants(unit_number);
CREATE INDEX idx_billing_records_tenant_id ON billing_records(tenant_id);
CREATE INDEX idx_billing_records_billing_month ON billing_records(billing_month);
CREATE INDEX idx_network_sessions_tenant_id ON network_sessions(tenant_id);
CREATE INDEX idx_network_sessions_is_active ON network_sessions(is_active);
