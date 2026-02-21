"use client";

import { useRouter } from "next/navigation";

function StatCard({
  label,
  value,
  change,
  up,
}: {
  label: string;
  value: string;
  change: string;
  up: boolean;
}) {
  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
        {label}
      </div>
      <div className="text-3xl font-bold text-foreground leading-none mb-2">
        {value}
      </div>
      <div
        className={`text-xs flex items-center gap-1 ${
          up ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
        }`}
      >
        <span>{up ? "↑" : "↓"}</span>
        {change}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();

  const quickActions = [
    {
      icon: "◉",
      title: "Manage Agents",
      desc: "View, add, and edit agent profiles",
      path: "/agents",
    },
    {
      icon: "◆",
      title: "Domain Manager",
      desc: "Register domains and check availability",
      path: "/domains",
    },
  ];

  return (
    /*
      ml-56  → clears the fixed sidebar (w-56 = 14rem)
      pt-14  → clears the fixed topnav (h-14 = 3.5rem)
      min-h-screen so the bg fills the viewport
    */
    <main className="ml-56 pt-14 min-h-screen bg-background">
      <div className="p-7 pb-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3.5 mb-7">
          <StatCard label="Total Agents" value="142" change="6 this week" up />
          <StatCard
            label="Active Domains"
            value="89"
            change="3.1% vs last"
            up={false}
          />
          <StatCard
            label="Verified Agents"
            value="98"
            change="4.5% vs last"
            up
          />
          <StatCard
            label="Pending KYC"
            value="12"
            change="2 new today"
            up={false}
          />
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {quickActions.map((card) => (
            <div
              key={card.title}
              onClick={() => router.push(card.path)}
              className="bg-card border rounded-xl p-6 cursor-pointer transition-all hover:border-foreground hover:shadow-md flex flex-col gap-2"
            >
              <span className="text-2xl">{card.icon}</span>
              <h3 className="text-base font-semibold text-foreground">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground">{card.desc}</p>
              <span className="text-xs font-medium text-foreground mt-1">
                Open →
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}