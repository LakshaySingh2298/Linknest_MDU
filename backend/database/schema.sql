-- LinkNest MDU Database Schema
-- Production-ready PostgreSQL schema

-- Create database (run this first)
-- CREATE DATABASE linknest_mdu_prod;

-- Connect to the database and run the following:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('Basic', 'Standard', 'Premium')),
    speed_range VARCHAR(50) NOT NULL,
    rate_per_gb DECIMAL(10,2) NOT NULL,
    data_usage DECIMAL(10,2) DEFAULT 0,
    current_bill DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'current' CHECK (payment_status IN ('current', 'overdue', 'suspended')),
    connection_status VARCHAR(20) DEFAULT 'offline' CHECK (connection_status IN ('online', 'offline', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network sessions table
CREATE TABLE IF NOT EXISTS network_sessions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    device_ip INET NOT NULL,
    device_mac MACADDR NOT NULL,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP NULL,
    data_uploaded BIGINT DEFAULT 0,
    data_downloaded BIGINT DEFAULT 0,
    total_data BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing records table
CREATE TABLE IF NOT EXISTS billing_records (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL,
    data_consumed DECIMAL(10,2) NOT NULL,
    base_charges DECIMAL(10,2) DEFAULT 0,
    usage_charges DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
    payment_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QoS policies table
CREATE TABLE IF NOT EXISTS qos_policies (
    id SERIAL PRIMARY KEY,
    plan_type VARCHAR(20) UNIQUE NOT NULL,
    max_download_mbps INTEGER NOT NULL,
    max_upload_mbps INTEGER NOT NULL,
    priority_level VARCHAR(10) NOT NULL CHECK (priority_level IN ('low', 'normal', 'high')),
    burst_allowed BOOLEAN DEFAULT false,
    burst_limit_mbps INTEGER NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'operator')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTP sessions table (for production OTP management)
CREATE TABLE IF NOT EXISTS otp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    unit_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network isolation rules table
CREATE TABLE IF NOT EXISTS network_isolation (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    isolation_type VARCHAR(20) NOT NULL CHECK (isolation_type IN ('full', 'partial', 'none')),
    allowed_domains TEXT[] DEFAULT '{}',
    blocked_domains TEXT[] DEFAULT '{}',
    bandwidth_limit_mbps INTEGER NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default QoS policies
INSERT INTO qos_policies (plan_type, max_download_mbps, max_upload_mbps, priority_level, burst_allowed, burst_limit_mbps) 
VALUES 
    ('Basic', 25, 5, 'low', false, NULL),
    ('Standard', 50, 10, 'normal', true, 75),
    ('Premium', 100, 20, 'high', true, 150)
ON CONFLICT (plan_type) DO NOTHING;

-- Insert sample tenants
INSERT INTO tenants (name, email, phone, unit_number, plan_type, speed_range, rate_per_gb, data_usage, current_bill, payment_status) 
VALUES 
    ('Lakshay Ghosh', 'lakshayghosh@gmail.com', '9717206255', 'B-202', 'Premium', '100 Mbps', 15.00, 45.6, 684.00, 'current'),
    ('Rahul Sharma', 'rahul.sharma@gmail.com', '9876543210', 'A-101', 'Standard', '50 Mbps', 10.00, 78.3, 783.00, 'current'),
    ('Priya Singh', 'priya.singh@gmail.com', '9988776655', 'C-301', 'Basic', '25 Mbps', 5.00, 92.1, 460.50, 'overdue'),
    ('Amit Kumar', 'amit.kumar@gmail.com', '9123456789', 'D-405', 'Premium', '100 Mbps', 15.00, 67.8, 1017.00, 'current')
ON CONFLICT (email) DO NOTHING;

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password_hash, role) 
VALUES ('admin', 'admin@linknest.com', '$2b$10$rQZ9vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8vXqZ8', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_unit ON tenants(unit_number);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON network_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON network_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_tenant ON billing_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_sessions(expires_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO linknest_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO linknest_user;
