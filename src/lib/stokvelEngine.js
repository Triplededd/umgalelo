/**
 * stokvelEngine.js
 * Pure functions for contribution/payout math — no Supabase calls here,
 * so this stays easy to test and reuse.
 */

/** Expected contribution for a member this period: their override amount,
 *  falling back to the stokvel's default fixed amount. */
export function expectedAmount(stokvel, member) {
  if (member.contribution_override != null) return member.contribution_override;
  return stokvel.default_contribution ?? 0;
}

/** Build a per-member summary for a given period's contributions. */
export function buildContributionSummary(stokvel, members, contributions, period) {
  const paidByMember = new Map(
    contributions.filter((c) => c.period === period).map((c) => [c.member_id, c])
  );
  const rows = members.map((m) => {
    const paid = paidByMember.get(m.id);
    const expected = expectedAmount(stokvel, m);
    return {
      member: m,
      expected,
      paidAmount: paid ? paid.amount : 0,
      isPaid: Boolean(paid),
      isShort: paid ? paid.amount < expected : false,
    };
  });
  const totalExpected = rows.reduce((s, r) => s + r.expected, 0);
  const totalCollected = rows.reduce((s, r) => s + r.paidAmount, 0);
  return { rows, totalExpected, totalCollected, outstanding: totalExpected - totalCollected };
}

/** Members who haven't received a payout yet in the current rotation cycle. */
export function pendingRecipients(members, payoutRounds) {
  const paidIds = new Set(payoutRounds.map((p) => p.member_id));
  return members.filter((m) => !paidIds.has(m.id));
}

/** Compute the current period label: 'YYYY-MM' for monthly, 'YYYY-Www' for weekly. */
export function currentPeriod(periodType) {
  const now = new Date();
  if (periodType === "weekly") {
    const onejan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Fisher-Yates shuffle for a randomized payout order. Returns a new array
 *  — doesn't mutate the input. */
export function randomOrder(members) {
  const arr = [...members];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate a short, readable invite code like "UMG-7F3K". */
export function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `UMG-${code}`;
}
