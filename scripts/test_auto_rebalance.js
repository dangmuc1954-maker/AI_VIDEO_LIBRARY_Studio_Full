// Test simulation of Sc and queue dispatching for Banana / Veo3

class Sc {
  constructor(e = () => 4, t = () => 4) {
    this.resolveLimit = e;
    this.resolveCategoryLimit = t;
  }
  reservations = new Map();
  slotCounts = new Map();
  categoryCounts = new Map();

  canRun(e) {
    const t = this.getCategoryLimit(e);
    if (t <= 0) return false;
    const A = this.getCategoryKey(e);
    if ((this.categoryCounts.get(A) || 0) >= t) return false;
    const o = this.getSlotKey(e);
    return (this.slotCounts.get(o) || 0) < this.getLimit(e);
  }

  reserve(e) {
    if (!this.canRun(e) || this.reservations.has(e.id)) return false;
    const t = this.getSlotKey(e), A = this.getCategoryKey(e);
    this.reservations.set(e.id, { accountId: e.accountId, slotKey: t, categoryKey: A });
    this.slotCounts.set(t, (this.slotCounts.get(t) || 0) + 1);
    this.categoryCounts.set(A, (this.categoryCounts.get(A) || 0) + 1);
    return true;
  }

  release(e) {
    const t = this.reservations.get(e);
    if (!t) return false;
    const A = (this.slotCounts.get(t.slotKey) || 1) - 1;
    A > 0 ? this.slotCounts.set(t.slotKey, A) : this.slotCounts.delete(t.slotKey);
    const o = (this.categoryCounts.get(t.categoryKey) || 1) - 1;
    o > 0 ? this.categoryCounts.set(t.categoryKey, o) : this.categoryCounts.delete(t.categoryKey);
    this.reservations.delete(e);
    return true;
  }

  getLimit(e) {
    if (e?.providerId === "muse" || e?.provider === "Muse AI" || e?.payload?.model === "muse-video") return 500;
    if (e?.providerId === "banana" || e?.providerId === "veo3" || e?.provider === "Veo3" || e?.provider === "Banana" || (e?.provider && /veo|banana/i.test(e.provider))) {
      return 3;
    }
    return Math.max(1, Math.floor(this.resolveLimit(e) || 1));
  }

  getCategoryLimit(e) {
    return 500;
  }

  getSlotKey(e) {
    const t = e.accountId || "unassigned";
    if ((e?.providerId === "banana" || e?.providerId === "veo3" || e?.provider === "Veo3" || e?.provider === "Banana") && e?.accountId) {
      return `${e.providerId}:${e.accountId}`;
    }
    return `${e.providerId}:${t}:${e.type}`;
  }

  getCategoryKey(e) {
    return e.type === "Video" ? "video" : "image";
  }
}


// Test dynamic auto rebalance if Acc2 finishes first
const scheduler = new Sc();
const accounts = [
  { accountId: "veo3-acc1", accountName: "Veo3 #1" },
  { accountId: "veo3-acc2", accountName: "Veo3 #2" }
];

const jobs = Array.from({ length: 7 }, (_, i) => ({
  id: `job-${i + 1}`,
  type: "Video",
  providerId: "veo3",
  provider: "Veo3",
  title: `Cảnh ${i + 1}`,
  accountId: accounts[i % accounts.length].accountId,
  payload: { accountSelection: "auto" },
  status: "Queued"
}));

// Function simulating resolveClaimJob / jB
function resolveClaimJob(job, canRunFn) {
  // If accountSelection === "auto"
  if (job.payload?.accountSelection === "auto") {
    // Check all eligible accounts
    const available = accounts.filter(acc => canRunFn({ ...job, accountId: acc.accountId }));
    if (available.length === 0) return null;
    // Sort by running count
    available.sort((a, b) => (scheduler.slotCounts.get(`veo3:${a.accountId}`) || 0) - (scheduler.slotCounts.get(`veo3:${b.accountId}`) || 0));
    return { accountId: available[0].accountId, account: available[0].accountName };
  }
  return { accountId: job.accountId, account: job.account };
}

function tick() {
  for (const j of jobs) {
    if (j.status === "Queued") {
      const resolved = resolveClaimJob(j, a => scheduler.canRun(a));
      if (resolved) {
        const candidate = { ...j, ...resolved };
        if (scheduler.canRun(candidate)) {
          scheduler.reserve(candidate);
          j.status = "Running";
          j.accountId = resolved.accountId;
          console.log(`  [CLAIMED] ${j.id} running on ${j.accountId}`);
        }
      } else {
        console.log(`  [QUEUED] ${j.id} waiting in queue`);
      }
    }
  }
}

console.log("--- TICK 1 ---");
tick();
console.log("Slot counts:", "Acc1:", scheduler.slotCounts.get("veo3:veo3-acc1"), "Acc2:", scheduler.slotCounts.get("veo3:veo3-acc2"));

console.log("\n--- SIMULATING: Acc2 finishes Job 2 first! ---");
scheduler.release("job-2");
jobs.find(j => j.id === "job-2").status = "Completed";
console.log("Job 2 on Acc2 completed! Acc2 now has 2 running jobs.");

console.log("\n--- TICK 2 ---");
tick();
console.log("\nResult for job-7:");
const j7 = jobs.find(j => j.id === "job-7");
console.log(`job-7 ran on: ${j7.accountId} (status: ${j7.status})`);
