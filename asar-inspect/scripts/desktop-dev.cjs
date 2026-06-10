onth: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function getDayOfWeek(value: string) {
  assertDateString(value);

  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function isRealDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toISOString().slice(0, 10) === value;
}

function isPlanType(value: string): value is PlanType {
  return PLAN_TYPES.includes(value as PlanType);
}

function formatWorkItem(item: WorkItemForReport) {
  return item.projectName === "미분류" ? item.content : `${item.projectName}: ${item.content}`;
}

function escapeMarkdown(value: string) {
  return value.replace(/\|/g, "\\|");
}
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
{
  "name": "daily-summary-desktop",
  "version": "0.1.0",
  "private": true,
  "type": "