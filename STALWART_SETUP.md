# Stalwart Mail Server Integration Guide

This guide explains how to set up and integrate Stalwart Mail Server with SurfSync Mail.

## Architecture Overview

```
SurfSync API (apisyncmail.surfsyncinfotech.in)
    ↓
Stalwart Mail Server (mail.surfsyncinfotech.xyz)
    ↓
Email sending/receiving via SMTP/IMAP
```

## What is Stalwart Mail Server?

Stalwart is a modern mail server that provides:
- **SMTP** - Outgoing email sending
- **IMAP/JMAP** - Email retrieval
- **DKIM** - Email signing and verification
- **Spam filtering** - Built-in protection
- **Sieve** - Email filtering rules

## Prerequisites

1. Server access to `mail.surfsyncinfotech.xyz` (62.72.13.157)
2. Domain DNS properly configured (MX, SPF, DKIM, DMARC)
3. Stalwart Mail Server installed on the server

## Step 1: Install Stalwart Mail Server

### On Ubuntu/Debian:

```bash
# Download and install Stalwart
wget https://github.com/stalwartlabs/mail-server/releases/latest/download/stalwart-mail-server.deb
sudo dpkg -i stalwart-mail-server.deb

# Or using Docker (recommended)
docker run -d \
  --name stalwart-mail \
  -p 25:25 \
  -p 587:587 \
  -p 8080:8080 \
  -p 993:993 \
  -v /opt/stalwart:/opt/stalwart \
  stalwartlabs/mail-server:latest
```

### On CentOS/RHEL:

```bash
# Using Docker
docker run -d \
  --name stalwart-mail \
  -p 25:25 \
  -p 587:587 \
  -p 8080:8080 \
  -p 993:993 \
  -v /opt/stalwart:/opt/stalwart \
  stalwartlabs/mail-server:latest
```

## Step 2: Configure Stalwart

Edit the Stalwart configuration file (`/opt/stalwart/etc/config.toml`):

```toml
[server]
hostname = "mail.surfsyncinfotech.xyz"

[smtp]
enable = true
port = 25
submission-port = 587

[imap]
enable = true
port = 993

[http]
enable = true
port = 8080

[auth]
# Configure authentication method
type = "sql"
# Add database connection details for user authentication

[dkim]
enable = true
# DKIM keys will be managed via API
```

## Step 3: Set Environment Variables

Add these to your `.env.local` file:

```env
# Stalwart Mail Server Configuration
STALWART_HOST=mail.surfsyncinfotech.xyz
STALWART_PORT=8080
STALWART_ADMIN_USERNAME=admin
STALWART_ADMIN_PASSWORD=your-secure-password
STALWART_USE_HTTPS=true
```

## Step 4: Test Connection

Use the test endpoint to verify Stalwart is accessible:

**POST** `{{baseUrl}}/api/admin/stalwart/test`

**Headers:**
- `Authorization: Bearer <super_admin-token>`
- `Content-Type: application/json`

**Expected Response:**
```json
{
  "success": true,
  "message": "Stalwart connection successful",
  "data": {
    "status": "ok"
  }
}
```

## Step 5: Integrate with Mailbox Creation

When creating a mailbox via API, integrate with Stalwart:

### Current Flow:
```
API → Create mailbox in database → Return success
```

### New Flow with Stalwart:
```
API → Create mailbox in database → Create mailbox in Stalwart → Return success
```

### Example Integration Code:

```typescript
import { createStalwartMailbox } from "@/lib/stalwart";

// In your mailbox creation API route
const dbResult = await createMailboxInDatabase(email, password);

if (dbResult.success) {
  const stalwartResult = await createStalwartMailbox(email, password);
  if (!stalwartResult.success) {
    // Rollback database creation if Stalwart fails
    await deleteMailboxFromDatabase(email);
    return error;
  }
}
```

## Step 6: Configure DKIM

When a domain is verified, configure DKIM in Stalwart:

```typescript
import { configureStalwartDKIM } from "@/lib/stalwart";

// In your domain verification API route
const dkimResult = await configureStalwartDKIM(
  domain,
  "surfsync", // selector
  privateKey // from database
);
```

## Step 7: Email Sending Integration

Update your email sending API to use Stalwart:

```typescript
import { sendStalwartEmail } from "@/lib/stalwart";

// In your send email API route
const result = await sendStalwartEmail({
  from: "info@surfsyncinfotech.in",
  to: ["recipient@example.com"],
  subject: "Test Email",
  text: "This is a test email",
  html: "<p>This is a test email</p>",
});
```

## API Functions Available

The `lib/stalwart.ts` library provides these functions:

| Function | Purpose |
|----------|---------|
| `getStalwartConfig()` | Get Stalwart configuration from env vars |
| `stalwartConfigured()` | Check if Stalwart is configured |
| `createStalwartMailbox()` | Create a mailbox in Stalwart |
| `deleteStalwartMailbox()` | Delete a mailbox from Stalwart |
| `updateStalwartPassword()` | Update mailbox password |
| `getStalwartMailbox()` | Get mailbox information |
| `configureStalwartDKIM()` | Configure DKIM for a domain |
| `sendStalwartEmail()` | Send email via Stalwart |
| `testStalwartConnection()` | Test Stalwart connection |

## Deployment Checklist

- [ ] Install Stalwart Mail Server on `mail.surfsyncinfotech.xyz`
- [ ] Configure Stalwart with proper settings
- [ ] Open firewall ports: 25, 587, 8080, 993
- [ ] Set environment variables in `.env.local`
- [ ] Test connection via `/api/admin/stalwart/test`
- [ ] Integrate mailbox creation with Stalwart
- [ ] Integrate password updates with Stalwart
- [ ] Integrate DKIM configuration with Stalwart
- [ ] Integrate email sending with Stalwart
- [ ] Test end-to-end email flow

## Troubleshooting

### Connection Failed

- Check if Stalwart is running: `docker ps` or `systemctl status stalwart`
- Verify firewall ports are open
- Check network connectivity between API server and Stalwart server

### Authentication Failed

- Verify `STALWART_ADMIN_USERNAME` and `STALWART_ADMIN_PASSWORD`
- Check Stalwart admin credentials in configuration

### DKIM Not Working

- Verify DKIM selector matches between API and Stalwart
- Check private key format (PEM)
- Verify DNS DKIM record is properly set

## Important Notes

1. **Security**: Never commit real passwords to git
2. **HTTPS**: Use HTTPS in production for Stalwart API calls
3. **Backups**: Backup Stalwart configuration and data regularly
4. **Monitoring**: Monitor Stalwart logs for errors and issues
5. **Scaling**: Stalwart can handle multiple domains and mailboxes

## For Your Manager

### Summary for Manager:

1. **Stalwart Mail Server** needs to be installed on `mail.surfsyncinfotech.xyz`
2. **API integration code** is already written and ready
3. **Environment variables** need to be set in `.env.local`
4. **DNS MX priority** needs to be fixed (waiting for approval)
5. **After Stalwart is deployed**, email sending/receiving will work

### Current Status:
- ✅ Database schema updated with all PRD tables
- ✅ Stalwart API client library created
- ✅ Stalwart test endpoint created
- ⏳ Stalwart server installation (needs to be done on mail.surfsyncinfotech.xyz)
- ⏳ MX priority fix (waiting for manager approval)
