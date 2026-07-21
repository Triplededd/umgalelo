/**
 * stats.js — pure aggregation functions for dashboard charts/cards.
 * No Supabase calls here, just math over already-loaded data.
 */

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Monthly totals for a given year (for monthly stokvels), or a
 *  chronological list of week totals (for weekly stokvels). Always
 *  returns [{ label, total }]. */
export function periodBreakdown(contributions, stokvel, year) {
  if (stokvel.period_type === "weekly") {
    const totals = new Map();
    contributions
      .filter((c) => c.period.startsWith(String(year)))
      .forEach((c) => totals.set(c.period, (totals.get(c.period) || 0) + Number(c.amount)));
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, total]) => ({ label: period.split("-W")[1] ? `W${period.split("-W")[1]}` : period, total }));
  }
  return MONTH_LABELS.map((label, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const total = contributions
      .filter((c) => c.period === key)
      .reduce((sum, c) => sum + Number(c.amount), 0);
    return { label, total };
  });
}

export function yearTotal(contributions, year) {
  return contributions
    .filter((c) => c.period.startsWith(String(year)))
    .reduce((sum, c) => sum + Number(c.amount), 0);
}

export function periodTotal(contributions, period) {
  return contributions
    .filter((c) => c.period === period)
    .reduce((sum, c) => sum + Number(c.amount), 0);
}

/** Members ranked by total lifetime contributions, highest first. */
export function memberLeaderboard(members, contributions) {
  const totals = new Map(members.map((m) => [m.id, 0]));
  contributions.forEach((c) => {
    totals.set(c.member_id, (totals.get(c.member_id) || 0) + Number(c.amount));
  });
  return members
    .map((m) => ({ member: m, total: totals.get(m.id) || 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Aggregate stats across every stokvel a user manages, for the landing page. */
export function portfolioSummary(stokvels, membersByStokvel, contributionsByStokvel) {
  const currentYear = new Date().getFullYear();
  let totalMembers = 0;
  let totalThisYear = 0;
  stokvels.forEach((s) => {
    totalMembers += (membersByStokvel[s.id] || []).length;
    totalThisYear += yearTotal(contributionsByStokvel[s.id] || [], currentYear);
  });
  return { stokvelCount: stokvels.length, totalMembers, totalThisYear, currentYear };
}
