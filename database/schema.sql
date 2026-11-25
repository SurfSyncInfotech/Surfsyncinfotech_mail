-- SurfSync Mail schema.
-- Database: surfsync_mail
-- Safe to run again. Existing tables and rows are left in place.

CREATE DATABASE IF NOT EXISTS surfsync_mail
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE surfsync_mail;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','super_admin','company_admin','employee') NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  company_id VARCHAR(32) NULL,
  UNIQUE KEY users_email (email)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  KEY resets_token (token_hash),
  KEY resets_user (user_id)
);

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  monthly_price DECIMAL(12,2) NOT NULL,
  annual_price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  mailbox_limit INT NOT NULL,
  storage_gb INT NOT NULL,
  features JSON NOT NULL,
  status ENUM('active','inactive') NOT NULL,
  suits VARCHAR(200) NOT NULL,
  was_monthly_inr INT NOT NULL,
  off_percent INT NOT NULL,
  featured TINYINT(1) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY plans_name (name)
);

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL,
  admin_email VARCHAR(160) NOT NULL,
  plan_name VARCHAR(120) NULL,
  subscription_status VARCHAR(20) NULL,
  billing_cycle VARCHAR(20) NULL,
  mailbox_limit INT NULL,
  storage_gb INT NULL,
  renewal_date DATE NULL,
  payment_id VARCHAR(40) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  plan_id VARCHAR(40) NULL,
  amount DECIMAL(12,2) NULL,
  currency CHAR(3) NULL,
  KEY companies_admin (admin_email)
);

CREATE TABLE IF NOT EXISTS domains (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  domain VARCHAR(160) NOT NULL,
  verified TINYINT(1) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  verified_at DATETIME(3) NULL,
  dns_json JSON NULL,
  private_key TEXT NULL,
  KEY domains_company (company_id)
);

CREATE TABLE IF NOT EXISTS mailboxes (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  email VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL,
  used_gb DECIMAL(10,1) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  storage_gb INT NULL,
  used_bytes BIGINT NULL,
  KEY mailboxes_company (company_id)
);

CREATE TABLE IF NOT EXISTS onboarding_records (
  payment_id VARCHAR(40) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  admin_email VARCHAR(160) NOT NULL,
  temp_password VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  plan_id VARCHAR(20) NOT NULL,
  plan_name VARCHAR(40) NOT NULL,
  amount_inr INT NOT NULL,
  gst_paise INT NOT NULL,
  amount_paise INT NOT NULL,
  currency CHAR(3) NOT NULL,
  company_name VARCHAR(160) NOT NULL,
  company_domain VARCHAR(160) NOT NULL,
  admin_name VARCHAR(80) NOT NULL,
  admin_email VARCHAR(160) NOT NULL,
  contact_number VARCHAR(20) NOT NULL,
  status ENUM('pending_payment','paid','failed') NOT NULL,
  payment_method ENUM('card','upi','netbanking') NULL,
  razorpay_order_id VARCHAR(40) NULL,
  razorpay_payment_id VARCHAR(40) NULL,
  created_at DATETIME(3) NOT NULL,
  paid_at DATETIME(3) NULL,
  UNIQUE KEY orders_razorpay (razorpay_order_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  mailbox VARCHAR(160) NOT NULL,
  folder ENUM('inbox','sent','drafts','trash','spam') NOT NULL,
  from_email VARCHAR(160) NOT NULL,
  to_email VARCHAR(160) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body MEDIUMTEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY messages_box (mailbox, folder, created_at)
);

-- Missing tables from PRD
-- Link table for multi-tenant user membership (employees belong to companies)
CREATE TABLE IF NOT EXISTS company_users (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NOT NULL,
  role ENUM('admin','member') NOT NULL DEFAULT 'member',
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY company_users_unique (company_id, user_id),
  KEY company_users_company (company_id),
  KEY company_users_user (user_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Active company plan attachments (links companies to plans)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  plan_id VARCHAR(32) NOT NULL,
  status ENUM('active','cancelled','expired','past_due') NOT NULL DEFAULT 'active',
  billing_cycle ENUM('monthly','annual') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY subscriptions_company (company_id),
  KEY subscriptions_plan (plan_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);

-- Billing statements for accounts
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  subscription_id VARCHAR(32) NULL,
  invoice_number VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('draft','sent','paid','overdue','void') NOT NULL DEFAULT 'draft',
  due_date DATE NOT NULL,
  paid_date DATE NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY invoices_number (invoice_number),
  KEY invoices_company (company_id),
  KEY invoices_subscription (subscription_id),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- Alternate email addresses per mailbox
CREATE TABLE IF NOT EXISTS mailbox_aliases (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  mailbox_id VARCHAR(32) NOT NULL,
  alias_email VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY mailbox_aliases_email (alias_email),
  KEY mailbox_aliases_mailbox (mailbox_id),
  FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

-- Routing configurations per domain/mailbox
CREATE TABLE IF NOT EXISTS email_forwarding_rules (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  domain_id VARCHAR(32) NULL,
  mailbox_id VARCHAR(32) NULL,
  source_pattern VARCHAR(200) NOT NULL,
  destination_email VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY forwarding_domain (domain_id),
  KEY forwarding_mailbox (mailbox_id),
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
);

-- Historical snapshot of allocated vs used capacity
CREATE TABLE IF NOT EXISTS storage_usage (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  allocated_gb DECIMAL(10,2) NOT NULL,
  used_gb DECIMAL(10,2) NOT NULL,
  used_bytes BIGINT NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at DATETIME(3) NOT NULL,
  KEY storage_company (company_id),
  KEY storage_date (snapshot_date),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Operational resource tracking events
CREATE TABLE IF NOT EXISTS usage_logs (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  company_id VARCHAR(32) NOT NULL,
  user_id VARCHAR(32) NULL,
  event_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL,
  KEY usage_company (company_id),
  KEY usage_user (user_id),
  KEY usage_date (created_at),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Administrative and security action histories
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  user_id VARCHAR(32) NULL,
  company_id VARCHAR(32) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(32) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  KEY audit_user (user_id),
  KEY audit_company (company_id),
  KEY audit_date (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- System alerts and communication records
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  user_id VARCHAR(32) NULL,
  company_id VARCHAR(32) NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
  priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  action_url VARCHAR(500) NULL,
  created_at DATETIME(3) NOT NULL,
  read_at DATETIME(3) NULL,
  KEY notifications_user (user_id),
  KEY notifications_company (company_id),
  KEY notifications_status (status),
  KEY notifications_date (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
