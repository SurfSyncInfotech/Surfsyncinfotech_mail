-- Read-only checks for surfsync_mail.
-- Run this in MySQL Workbench, or with the mysql client, after selecting this database.
-- These queries do not print password hashes, reset tokens, mailbox passwords, or DKIM private keys.

USE surfsync_mail;

SHOW TABLES;

SELECT 'users' AS table_name, COUNT(*) AS rows_in_table FROM users
UNION ALL SELECT 'password_resets', COUNT(*) FROM password_resets
UNION ALL SELECT 'plans', COUNT(*) FROM plans
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'domains', COUNT(*) FROM domains
UNION ALL SELECT 'mailboxes', COUNT(*) FROM mailboxes
UNION ALL SELECT 'onboarding_records', COUNT(*) FROM onboarding_records
UNION ALL SELECT 'messages', COUNT(*) FROM messages;

SELECT id, name, email, role, company_id, created_at
FROM users
ORDER BY created_at;

SELECT id, name, monthly_price, currency, mailbox_limit, storage_gb, status, featured
FROM plans
ORDER BY monthly_price;

SELECT id, status, plan_id, plan_name, amount_inr, gst_paise, amount_paise, company_name, company_domain, payment_method, created_at, paid_at
FROM orders
ORDER BY created_at DESC;

SELECT id, name, status, admin_email, plan_name, mailbox_limit, storage_gb, amount, currency, renewal_date
FROM companies
ORDER BY name;

SELECT company_id, domain, verified, verified_at, created_at
FROM domains
ORDER BY domain;

SELECT company_id, email, status, used_gb, storage_gb, used_bytes, created_at
FROM mailboxes
ORDER BY email;

SELECT payment_id, company_id, admin_email, created_at
FROM onboarding_records
ORDER BY created_at;

SELECT id, mailbox, folder, from_email, to_email, subject, created_at
FROM messages
ORDER BY created_at DESC;
