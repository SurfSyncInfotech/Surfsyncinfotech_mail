export type PaymentReceipt = {
  requestId: string;
  paidAt: string;
  companyName: string;
  companyDomain: string;
  adminName: string;
  adminEmail: string;
  contactNumber: string;
  planName: string;
  mailboxes: number;
  storage: string;
  priceLabel: string;
  gstLabel: string;
  totalLabel: string;
  paidWith: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function receiptWhen(iso: string) {
  const date = new Date(iso);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(safe);
  return `${formatted} IST`;
}

export function receiptDocument(receipt: PaymentReceipt) {
  const requestId = escapeHtml(receipt.requestId);
  const when = escapeHtml(receiptWhen(receipt.paidAt));
  const company = escapeHtml(receipt.companyName);
  const domain = escapeHtml(receipt.companyDomain);
  const admin = escapeHtml(receipt.adminName);
  const email = escapeHtml(receipt.adminEmail);
  const contact = escapeHtml(receipt.contactNumber);
  const plan = escapeHtml(receipt.planName);
  const storage = escapeHtml(receipt.storage);
  const price = escapeHtml(receipt.priceLabel);
  const gst = escapeHtml(receipt.gstLabel);
  const total = escapeHtml(receipt.totalLabel);
  const paidWith = escapeHtml(receipt.paidWith || "Card");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SurfSync Mail receipt ${requestId}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #0f172a; }
    body {
      font-family: "Plus Jakarta Sans", "Segoe UI", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { max-width: 720px; margin: 0 auto; padding: 8px 4px 0; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .name { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
    .tag { margin-top: 6px; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; }
    .stamp {
      min-width: 92px;
      border: 1.5px solid #2563eb;
      color: #1d4ed8;
      border-radius: 999px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.16em;
      padding: 8px 14px;
    }
    h1 { margin: 28px 0 0; font-size: 32px; line-height: 1.05; letter-spacing: -0.03em; }
    .lead { margin: 10px 0 0; max-width: 46ch; color: #475569; font-size: 14px; line-height: 1.6; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px; margin-top: 28px; padding-top: 22px; border-top: 1px solid #e6e8ef; }
    .label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; }
    .value { margin-top: 6px; font-size: 15px; font-weight: 600; }
    .muted { color: #475569; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; font-weight: 700; padding: 0 0 10px; border-bottom: 1px solid #e6e8ef; }
    td { padding: 14px 0; border-bottom: 1px solid #eef1f6; vertical-align: top; font-size: 15px; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .desc { color: #64748b; font-size: 13px; margin-top: 4px; }
    .total td { border-bottom: 0; padding-top: 18px; font-size: 18px; font-weight: 700; }
    .note { margin-top: 28px; padding: 14px 16px; background: #f4f7fb; border-radius: 12px; color: #475569; font-size: 13px; line-height: 1.6; }
    .foot { margin-top: 26px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="top">
      <div class="brand">
        <svg width="36" height="36" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="7" fill="#0B1220"></rect>
          <path d="M4.5 9.9c2.2-2.9 4.1-2.9 6.3 0s4.1 2.9 6.3 0 4.1-2.9 6.3 0" stroke="#7EB6FF" stroke-width="1.7" stroke-linecap="round"></path>
          <path d="M4.5 18.1c2.2-2.9 4.1-2.9 6.3 0s4.1 2.9 6.3 0 4.1-2.9 6.3 0" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round"></path>
        </svg>
        <div>
          <div class="name">SurfSync Mail</div>
          <div class="tag">Business email hosting</div>
        </div>
      </div>
      <div class="stamp">PAID</div>
    </header>
    <h1>Payment receipt</h1>
    <p class="lead">This records the monthly charge for ${company}, including GST. It is a payment receipt, not a GST tax invoice.</p>
    <section class="meta">
      <div>
        <div class="label">Receipt</div>
        <div class="value">${requestId}</div>
      </div>
      <div>
        <div class="label">Paid</div>
        <div class="value">${when}</div>
      </div>
      <div>
        <div class="label">Billed to</div>
        <div class="value">${company}</div>
        <div class="value muted">${domain}</div>
      </div>
      <div>
        <div class="label">Administrator</div>
        <div class="value">${admin}</div>
        <div class="value muted">${email}</div>
        <div class="value muted">${contact}</div>
      </div>
    </section>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            ${plan} plan, this month
            <div class="desc">${receipt.mailboxes} mailboxes · ${storage} each · paid with ${paidWith}</div>
          </td>
          <td class="num">${price}</td>
        </tr>
        <tr>
          <td>GST 18%</td>
          <td class="num">${gst}</td>
        </tr>
        <tr class="total">
          <td>Paid this month</td>
          <td class="num">${total}</td>
        </tr>
      </tbody>
    </table>
    <p class="note">The mailbox is opened from these company details after they are checked. Sign-in on this site opens later. Keep this receipt with the request number above.</p>
    <p class="foot">SurfSync Mail · ${requestId}</p>
  </main>
</body>
</html>`;
}

export function printReceipt(receipt: PaymentReceipt) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Payment receipt");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  iframe.srcdoc = receiptDocument(receipt);
  document.body.appendChild(iframe);
  const remove = () => iframe.remove();
  iframe.onload = () => {
    const frame = iframe.contentWindow;
    if (!frame) {
      remove();
      return;
    }
    frame.addEventListener("afterprint", remove, { once: true });
    window.setTimeout(() => {
      frame.focus();
      frame.print();
    }, 150);
    window.setTimeout(remove, 60000);
  };
}
