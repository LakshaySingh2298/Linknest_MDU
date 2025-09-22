-- Seed data for LinkNest MDU Production Database
-- Run this after creating the database schema

-- Insert your tenant data (with your actual phone number)
INSERT INTO tenants (name, email, phone, unit_number, plan_type, speed_range, rate_per_gb, data_usage, current_bill, payment_status) 
VALUES 
    ('Lakshay Ghosh', 'lakshayghosh@gmail.com', '9717206255', 'B-202', 'Premium', '100 Mbps', 15.00, 45.6, 684.00, 'current'),
    ('Rahul Sharma', 'rahul.sharma@gmail.com', '9876543210', 'A-101', 'Standard', '50 Mbps', 10.00, 78.3, 783.00, 'current'),
    ('Priya Singh', 'priya.singh@gmail.com', '9988776655', 'C-301', 'Basic', '25 Mbps', 5.00, 92.1, 460.50, 'overdue'),
    ('Amit Kumar', 'amit.kumar@gmail.com', '9123456789', 'D-405', 'Premium', '100 Mbps', 15.00, 67.8, 1017.00, 'current')
ON CONFLICT (email) DO UPDATE SET
    phone = EXCLUDED.phone,
    unit_number = EXCLUDED.unit_number,
    plan_type = EXCLUDED.plan_type,
    data_usage = EXCLUDED.data_usage,
    current_bill = EXCLUDED.current_bill;

-- Insert QoS policies
INSERT INTO qos_policies (plan_type, max_download_mbps, max_upload_mbps, priority_level, burst_allowed, burst_limit_mbps) 
VALUES 
    ('Basic', 25, 5, 'low', false, NULL),
    ('Standard', 50, 10, 'normal', true, 75),
    ('Premium', 100, 20, 'high', true, 150)
ON CONFLICT (plan_type) DO UPDATE SET
    max_download_mbps = EXCLUDED.max_download_mbps,
    max_upload_mbps = EXCLUDED.max_upload_mbps,
    priority_level = EXCLUDED.priority_level,
    burst_allowed = EXCLUDED.burst_allowed,
    burst_limit_mbps = EXCLUDED.burst_limit_mbps;

-- Insert sample billing records
INSERT INTO billing_records (tenant_id, billing_month, data_consumed, usage_charges, gst_amount, total_amount, payment_status) 
SELECT 
    t.id,
    DATE_TRUNC('month', CURRENT_DATE) as billing_month,
    t.data_usage,
    t.data_usage * t.rate_per_gb as usage_charges,
    (t.data_usage * t.rate_per_gb) * 0.18 as gst_amount,
    t.current_bill,
    t.payment_status
FROM tenants t
ON CONFLICT DO NOTHING;

-- Verify the data
SELECT 'Tenants inserted:' as info, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'QoS policies inserted:' as info, COUNT(*) as count FROM qos_policies
UNION ALL
SELECT 'Billing records inserted:' as info, COUNT(*) as count FROM billing_records;
