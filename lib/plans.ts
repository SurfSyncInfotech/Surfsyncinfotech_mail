export type Plan = {
  id: "desk" | "studio" | "house" | "hall";
  name: string;
  suits: string;
  priceMonthlyInr: number;
  wasMonthlyInr: number;
  offPercent: number;
  renewsMonthlyInr: number;
  extraMonths: number;
  mailboxes: number;
  storagePerMailboxGb: number;
  notes: string[];
  featured?: boolean;
};

export const GST_PERCENT = 18;

export function getPlan(id: string) {
  return plans.find((plan) => plan.id === id);
}

export function monthlyGstPaise(plan: Plan) {
  return plan.priceMonthlyInr * GST_PERCENT;
}

export function monthlyTotalPaise(plan: Plan) {
  return plan.priceMonthlyInr * 100 + monthlyGstPaise(plan);
}

export const plans: Plan[] = [
  {
    id: "desk",
    name: "Desk",
    suits: "A principal and one or two colleagues.",
    priceMonthlyInr: 1,
    wasMonthlyInr: 399,
    offPercent: 93,
    renewsMonthlyInr: 149,
    extraMonths: 0,
    mailboxes: 3,
    storagePerMailboxGb: 10,
    notes: [
      "3 mailboxes",
      "10 GB storage each",
      "Mail on your domain",
      "Webmail, IMAP, and SMTP",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    suits: "A working team with a shared desk.",
    priceMonthlyInr: 49,
    wasMonthlyInr: 649,
    offPercent: 92,
    renewsMonthlyInr: 219,
    extraMonths: 2,
    mailboxes: 10,
    storagePerMailboxGb: 25,
    notes: [
      "10 mailboxes",
      "25 GB storage each",
      "Group addresses",
      "Quota visible per mailbox",
    ],
  },
  {
    id: "house",
    name: "House",
    suits: "The size most teams pick.",
    priceMonthlyInr: 99,
    wasMonthlyInr: 749,
    offPercent: 87,
    renewsMonthlyInr: 329,
    extraMonths: 2,
    mailboxes: 25,
    storagePerMailboxGb: 50,
    featured: true,
    notes: [
      "25 mailboxes",
      "50 GB storage each",
      "Admin: open, quota, suspend",
      "Daily and on-demand backups",
    ],
  },
  {
    id: "hall",
    name: "Hall",
    suits: "A firm with several rooms of people.",
    priceMonthlyInr: 149,
    wasMonthlyInr: 1499,
    offPercent: 90,
    renewsMonthlyInr: 799,
    extraMonths: 2,
    mailboxes: 50,
    storagePerMailboxGb: 100,
    notes: [
      "50 mailboxes",
      "100 GB storage each",
      "Room for departments",
      "Storage stated per mailbox",
    ],
  },
];
