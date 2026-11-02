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

// SIMULATION: 2 Accounts (Acc1, Acc2), 7 Video Jobs
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
  // Round-robin pre-assignment from frontend
  accountId: accounts[i % accounts.length].accountId,
  status: "Queued"
}));

console.log("Initial 7 jobs created:");
jobs.forEach(j => console.log(`  ${j.id} -> ${j.accountId} (status: ${j.status})`));

console.log("\n--- TICK 1 (Starting initial batch) ---");
for (const j of jobs) {
  if (j.status === "Queued" && scheduler.canRun(j)) {
    scheduler.reserve(j);
    j.status = "Running";
    console.log(`  [CLAIMED] ${j.id} running on ${j.accountId}`);
  } else if (j.status === "Queued") {
    console.log(`  [QUEUED] ${j.id} for ${j.accountId} waiting in queue (concurrency limit reached)`);
  }
}

console.log("\nRunning jobs by slot:");
console.log("  veo3:veo3-acc1 count:", scheduler.slotCounts.get("veo3:veo3-acc1"));
console.log("  veo3:veo3-acc2 count:", scheduler.slotCounts.get("veo3:veo3-acc2"));

console.log("\n--- SIMULATING: Acc1 finishes Job 1 ---");
scheduler.release("job-1");
const j1 = jobs.find(j => j.id === "job-1");
j1.status = "Completed";
console.log("  job-1 Completed! Slot for Acc1 released.");
console.log("  veo3:veo3-acc1 count:", scheduler.slotCounts.get("veo3:veo3-acc1"));

console.log("\n--- TICK 2 (Scheduler checks queued jobs) ---");
for (const j of jobs) {
  if (j.status === "Queued" && scheduler.canRun(j)) {
    scheduler.reserve(j);
    j.status = "Running";
    console.log(`  [CLAIMED] ${j.id} running on ${j.accountId}`);
  }
}

console.log("\nFinal state of jobs:");
jobs.forEach(j => console.log(`  ${j.id} (${j.accountId}): ${j.status}`));
