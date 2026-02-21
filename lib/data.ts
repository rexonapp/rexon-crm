/* ─────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────── */

   export type DealStage =
   | "discovery"
   | "proposal"
   | "negotiation"
   | "closed"
   | "lost";
 
 export interface Deal {
   id: number;
   name: string;
   company: string;
   value: string;
   valueRaw: number;
   stage: DealStage;
   initials: string;
   color: string;
   probability: number;
   closeDate: string;
   owner: string;
 }
 
 export interface Activity {
   id: number;
   color: string;
   text: string;
   boldParts: string[];
   time: string;
   type: "deal" | "lead" | "call" | "email" | "win";
 }
 
 export interface PipelineStage {
   label: string;
   value: number;
   amount: string;
   pct: number;
   color: string;
 }
 
 export interface TeamMember {
   id: number;
   name: string;
   initials: string;
   role: string;
   deals: number;
   quota: number;
   pct: number;
   color: string;
 }
 
 export interface Stat {
   label: string;
   value: string;
   change: string;
   dir: "up" | "down";
   icon: string;
 }
 
 export interface NavItem {
   icon: string;
   label: string;
   href: string;
   badge?: string;
 }
 
 /* ─────────────────────────────────────────────
    NAVIGATION
    ───────────────────────────────────────────── */
 
 export const MAIN_NAV: NavItem[] = [
   { icon: "◉", label: "Dashboard", href: "/" },
   { icon: "⊞", label: "Contacts", href: "/contacts", badge: "1.2k" },
   { icon: "◆", label: "Deals", href: "/deals", badge: "42" },
   { icon: "◯", label: "Companies", href: "/companies" },
   { icon: "◎", label: "Pipeline", href: "/pipeline" },
 ];
 
 export const MANAGEMENT_NAV: NavItem[] = [
   { icon: "✦", label: "Reports", href: "/reports" },
   { icon: "◈", label: "Campaigns", href: "/campaigns" },
   { icon: "⊹", label: "Automations", href: "/automations" },
   { icon: "⚙", label: "Settings", href: "/settings" },
 ];
 
 /* ─────────────────────────────────────────────
    DASHBOARD STATS
    ───────────────────────────────────────────── */
 
 export const STATS: Stat[] = [
   {
     label: "Total Revenue",
     value: "$2.4M",
     change: "+18.2% vs last month",
     dir: "up",
     icon: "💰",
   },
   {
     label: "Active Deals",
     value: "142",
     change: "+6 this week",
     dir: "up",
     icon: "◆",
   },
   {
     label: "New Leads",
     value: "89",
     change: "-3.1% vs last month",
     dir: "down",
     icon: "✦",
   },
   {
     label: "Win Rate",
     value: "67%",
     change: "+4.5% vs last month",
     dir: "up",
     icon: "◎",
   },
 ];
 
 /* ─────────────────────────────────────────────
    DEALS
    ───────────────────────────────────────────── */
 
 export const DEALS: Deal[] = [
   {
     id: 1,
     name: "Sophia Chen",
     company: "Nexus Capital",
     value: "$124,000",
     valueRaw: 124000,
     stage: "negotiation",
     initials: "SC",
     color: "#4f5dde",
     probability: 75,
     closeDate: "Feb 28, 2026",
     owner: "Jordan Reed",
   },
   {
     id: 2,
     name: "Marcus Webb",
     company: "OrbitX Systems",
     value: "$89,500",
     valueRaw: 89500,
     stage: "proposal",
     initials: "MW",
     color: "#c9a84c",
     probability: 50,
     closeDate: "Mar 15, 2026",
     owner: "Priya Mehta",
   },
   {
     id: 3,
     name: "Elena Vasquez",
     company: "TerraVault Inc.",
     value: "$215,000",
     valueRaw: 215000,
     stage: "closed",
     initials: "EV",
     color: "#2dd4ab",
     probability: 100,
     closeDate: "Feb 14, 2026",
     owner: "Jordan Reed",
   },
   {
     id: 4,
     name: "James Thornton",
     company: "Prism Analytics",
     value: "$67,200",
     valueRaw: 67200,
     stage: "discovery",
     initials: "JT",
     color: "#f87171",
     probability: 25,
     closeDate: "Apr 1, 2026",
     owner: "Carlos Ruiz",
   },
   {
     id: 5,
     name: "Aiko Tanaka",
     company: "Luminary Labs",
     value: "$145,800",
     valueRaw: 145800,
     stage: "proposal",
     initials: "AT",
     color: "#a78bfa",
     probability: 55,
     closeDate: "Mar 22, 2026",
     owner: "Priya Mehta",
   },
   {
     id: 6,
     name: "Ravi Patel",
     company: "StellarCore Ltd.",
     value: "$98,000",
     valueRaw: 98000,
     stage: "negotiation",
     initials: "RP",
     color: "#fb923c",
     probability: 70,
     closeDate: "Mar 5, 2026",
     owner: "Carlos Ruiz",
   },
 ];
 
 /* ─────────────────────────────────────────────
    ACTIVITY FEED
    ───────────────────────────────────────────── */
 
 export const ACTIVITIES: Activity[] = [
   {
     id: 1,
     color: "#c9a84c",
     text: "Sophia Chen moved to Negotiation stage. Deal value updated to $124K.",
     boldParts: ["Sophia Chen"],
     time: "2 minutes ago",
     type: "deal",
   },
   {
     id: 2,
     color: "#2dd4ab",
     text: "Elena Vasquez marked deal Closed Won.",
     boldParts: ["Elena Vasquez", "Closed Won"],
     time: "14 minutes ago",
     type: "win",
   },
   {
     id: 3,
     color: "#7b9ef0",
     text: "James Thornton opened the proposal document 3 times.",
     boldParts: ["James Thornton"],
     time: "1 hour ago",
     type: "email",
   },
   {
     id: 4,
     color: "#f87171",
     text: "New lead from Prism Analytics was assigned to you.",
     boldParts: ["Prism Analytics"],
     time: "3 hours ago",
     type: "lead",
   },
   {
     id: 5,
     color: "#a78bfa",
     text: "Aiko Tanaka scheduled a discovery call for Friday at 10 AM.",
     boldParts: ["Aiko Tanaka"],
     time: "Yesterday",
     type: "call",
   },
   {
     id: 6,
     color: "#fb923c",
     text: "Ravi Patel responded to the proposal with questions.",
     boldParts: ["Ravi Patel"],
     time: "Yesterday",
     type: "email",
   },
 ];
 
 /* ─────────────────────────────────────────────
    PIPELINE
    ───────────────────────────────────────────── */
 
 export const PIPELINE_STAGES: PipelineStage[] = [
   { label: "Discovery",    value: 12, amount: "$340K",  pct: 38, color: "#7b9ef0" },
   { label: "Proposal",     value: 8,  amount: "$520K",  pct: 55, color: "#fbbf24" },
   { label: "Negotiation",  value: 5,  amount: "$780K",  pct: 72, color: "#2dd4ab" },
   { label: "Closed Won",   value: 14, amount: "$1.2M",  pct: 88, color: "#c9a84c" },
 ];
 
 /* ─────────────────────────────────────────────
    TEAM
    ───────────────────────────────────────────── */
 
 export const TEAM_MEMBERS: TeamMember[] = [
   {
     id: 1,
     name: "Jordan Reed",
     initials: "JR",
     role: "Sales Director",
     deals: 18,
     quota: 20,
     pct: 92,
     color: "#c9a84c",
   },
   {
     id: 2,
     name: "Priya Mehta",
     initials: "PM",
     role: "Account Executive",
     deals: 14,
     quota: 18,
     pct: 78,
     color: "#7b9ef0",
   },
   {
     id: 3,
     name: "Carlos Ruiz",
     initials: "CR",
     role: "Sales Rep",
     deals: 11,
     quota: 17,
     pct: 65,
     color: "#2dd4ab",
   },
 ];
 
 /* ─────────────────────────────────────────────
    STAGE CONFIG
    ───────────────────────────────────────────── */
 
 export const STAGE_CONFIG: Record<
   DealStage,
   { label: string; bg: string; color: string }
 > = {
   discovery:   { label: "Discovery",   bg: "rgba(59,91,219,0.12)",   color: "#7b9ef0" },
   proposal:    { label: "Proposal",    bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
   negotiation: { label: "Negotiation", bg: "rgba(45,212,171,0.12)",  color: "#2dd4ab" },
   closed:      { label: "Closed Won",  bg: "rgba(201,168,76,0.15)",  color: "#c9a84c" },
   lost:        { label: "Lost",        bg: "rgba(248,113,113,0.12)", color: "#f87171" },
 };