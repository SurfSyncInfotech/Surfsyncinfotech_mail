import { randomBytes } from "crypto";
import type { RowDataPacket } from "mysql2";
import { getPool } from "@/lib/db";

/**
 * Safe migration function to add missing tables from PRD.
 * Can be run multiple times without breaking existing data.
 */

async function tableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName],
  );
  return rows.length > 0;
}

async function createCompanyUsers() {
  if (await tableExists("company_users")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE company_users (
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
    )
  `);
  console.log("✓ Created table: company_users");
}

async function createSubscriptions() {
  if (await tableExists("subscriptions")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE subscriptions (
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
    )
  `);
  console.log("✓ Created table: subscriptions");
}

async function createInvoices() {
  if (await tableExists("invoices")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE invoices (
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
    )
  `);
  console.log("✓ Created table: invoices");
}

async function createMailboxAliases() {
  if (await tableExists("mailbox_aliases")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE mailbox_aliases (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      mailbox_id VARCHAR(32) NOT NULL,
      alias_email VARCHAR(160) NOT NULL,
      status ENUM('active','suspended') NOT NULL DEFAULT 'active',
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      UNIQUE KEY mailbox_aliases_email (alias_email),
      KEY mailbox_aliases_mailbox (mailbox_id),
      FOREIGN KEY (mailbox_id) REFERENCES mailboxes(id) ON DELETE CASCADE
    )
  `);
  console.log("✓ Created table: mailbox_aliases");
}

async function createEmailForwardingRules() {
  if (await tableExists("email_forwarding_rules")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE email_forwarding_rules (
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
    )
  `);
  console.log("✓ Created table: email_forwarding_rules");
}

async function createStorageUsage() {
  if (await tableExists("storage_usage")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE storage_usage (
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
    )
  `);
  console.log("✓ Created table: storage_usage");
}

async function createUsageLogs() {
  if (await tableExists("usage_logs")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE usage_logs (
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
    )
  `);
  console.log("✓ Created table: usage_logs");
}

async function createAuditLogs() {
  if (await tableExists("audit_logs")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE audit_logs (
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
    )
  `);
  console.log("✓ Created table: audit_logs");
}

async function createNotifications() {
  if (await tableExists("notifications")) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE notifications (
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
    )
  `);
  console.log("✓ Created table: notifications");
}

/**
 * Run all migrations to add missing PRD tables.
 * Safe to run multiple times - checks if tables exist before creating.
 */
export async function runMigrations() {
  console.log("Starting database migrations...");
  try {
    await createCompanyUsers();
    await createSubscriptions();
    await createInvoices();
    await createMailboxAliases();
    await createEmailForwardingRules();
    await createStorageUsage();
    await createUsageLogs();
    await createAuditLogs();
    await createNotifications();
    console.log("✓ All migrations completed successfully");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    throw error;
  }
}
