const app = document.getElementById("app");
const pinDialog = document.getElementById("pinDialog");
const pinForm = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");

const todayISO = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
};

const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const dateKey = todayISO();
const DB_NAME = "KidsPointsApp";
const DB_VERSION = 1;

const stores = [
  "profiles",
  "settings",
  "tasks",
  "taskInstances",
  "wallets",
  "transactions",
  "rewards",
  "redemptions",
  "meta"
];

const state = {
  profileId: null,
  screen: "profiles",
  routine: "morning",
  db: null,
  parentAuthorized: false
};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of stores) {
        if (!db.objectStoreNames.contains(name)) {
          if (["tasks", "taskInstances", "transactions", "redemptions"].includes(name)) {
            db.createObjectStore(name, { keyPath: "id", autoIncrement: true });
          } else {
            db.createObjectStore(name, { keyPath: "id" });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = "readonly") {
  return state.db.transaction(storeName, mode).objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function getById(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function add(storeName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").add(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function del(storeName, id) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function sha256(text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const seedProfiles = [
  { id: "child9", name: "סופיה", age: 9, avatar: "🦊", morningTarget: "08:00", bedtimeTarget: "20:30", uiMode: "standard" },
  { id: "child4", name: "אנה", age: 4, avatar: "🐼", morningTarget: "08:00", bedtimeTarget: "19:45", uiMode: "visual" }
];

const seedTasks = [
  ["child9", "morning", "לקום", "🌞", 5, false, true, 1],
  ["child9", "morning", "שירותים", "🚽", 4, false, false, 2],
  ["child9", "morning", "צחצוח שיניים", "🪥", 6, false, false, 3],
  ["child9", "morning", "שטיפת פנים", "💦", 4, false, false, 4],
  ["child9", "morning", "לאכול", "🍳", 6, false, true, 5],
  ["child9", "morning", "להתלבש", "👕", 7, false, true, 6],
  ["child9", "morning", "תיק מוכן", "🎒", 8, true, false, 7],
  ["child9", "afternoon", "שיעורי בית", "📚", 10, true, false, 1],
  ["child9", "afternoon", "קריאה 15 דקות", "📖", 8, false, false, 2],
  ["child9", "afternoon", "הכנת בגדים למחר", "🧺", 6, false, false, 3],
  ["child9", "evening", "מקלחת", "🛁", 7, false, false, 1],
  ["child9", "evening", "פיג'מה", "🩳", 5, false, false, 2],
  ["child9", "evening", "שיניים", "🪥", 6, false, false, 3],
  ["child9", "evening", "סידור חדר קצר", "🧸", 5, false, true, 4],
  ["child9", "evening", "ספר", "📘", 4, false, false, 5],
  ["child9", "evening", "במיטה", "🛌", 6, false, false, 6],

  ["child4", "morning", "לקום", "🌞", 5, false, false, 1],
  ["child4", "morning", "שירותים", "🚽", 4, false, false, 2],
  ["child4", "morning", "שיניים", "🪥", 5, false, false, 3],
  ["child4", "morning", "לאכול", "🍎", 5, false, false, 4],
  ["child4", "morning", "להתלבש", "👗", 6, false, false, 5],
  ["child4", "afternoon", "לסדר צעצועים", "🧩", 5, false, true, 1],
  ["child4", "afternoon", "חטיף בריא", "🥕", 4, false, false, 2],
  ["child4", "evening", "מקלחת", "🛁", 6, false, false, 1],
  ["child4", "evening", "פיג'מה", "🧸", 5, false, false, 2],
  ["child4", "evening", "שיניים", "🪥", 5, false, false, 3],
  ["child4", "evening", "סיפור", "📗", 4, false, false, 4],
  ["child4", "evening", "במיטה", "🌙", 6, false, false, 5]
];

const seedRewards = [
  { id: "r1", title: "בחירת קינוח", cost: 40, requiresApproval: true, active: true },
  { id: "r2", title: "20 דקות מסך", cost: 60, requiresApproval: true, active: true },
  { id: "r3", title: "בחירת פעילות שבת", cost: 120, requiresApproval: true, active: true }
];

const defaultScoring = {
  child9: { routineBonusOnTime: 20, streakBonusPerDay: 2, streakCap: 12, lateThresholdMin: 20, latePenaltyMode: "partial", partialPenaltyPercent: 50 },
  child4: { routineBonusOnTime: 15, streakBonusPerDay: 1, streakCap: 8, lateThresholdMin: 25, latePenaltyMode: "none", partialPenaltyPercent: 0 }
};

async function seedIfNeeded() {
  const profiles = await getAll("profiles");
  if (profiles.length > 0) return;

  for (const profile of seedProfiles) {
    await put("profiles", profile);
    await put("wallets", { id: `wallet_${profile.id}`, profileId: profile.id, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    await put("meta", { id: `streak_${profile.id}`, profileId: profile.id, currentDays: 0, bestDays: 0, lastQualifiedDate: null, lastRewardDate: null });
  }

  for (const [profileId, routineType, title, icon, basePoints, requiresParentApproval, allowRandomApproval, order] of seedTasks) {
    await add("tasks", {
      profileId,
      routineType,
      title,
      icon,
      basePoints,
      requiresParentApproval,
      allowRandomApproval,
      order,
      active: true
    });
  }

  for (const reward of seedRewards) {
    await put("rewards", reward);
  }

  await put("settings", { id: "global", randomApprovalRate: 20, parentPinHash: await sha256("1234") });
  await put("settings", { id: "scoring", value: defaultScoring });
}

async function enforceProfileNames() {
  const p9 = await getById("profiles", "child9");
  const p4 = await getById("profiles", "child4");
  if (p9 && p9.name !== "סופיה") await put("profiles", { ...p9, name: "סופיה" });
  if (p4 && p4.name !== "אנה") await put("profiles", { ...p4, name: "אנה" });
}

function formatHM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function minutesBetween(hmA, hmB) {
  const [h1, m1] = hmA.split(":").map(Number);
  const [h2, m2] = hmB.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

async function getProfile() {
  return getById("profiles", state.profileId);
}

async function getTasksForRoutine(profileId, routineType) {
  const tasks = await getAll("tasks");
  return tasks.filter((t) => t.profileId === profileId && t.routineType === routineType && t.active).sort((a, b) => a.order - b.order);
}

async function getInstancesForDate(profileId, date) {
  const all = await getAll("taskInstances");
  return all.filter((x) => x.profileId === profileId && x.date === date);
}

async function ensureInstances(profileId, date = dateKey) {
  const tasks = await getAll("tasks");
  const instances = await getInstancesForDate(profileId, date);
  const currentIds = new Set(instances.map((i) => i.taskId));

  for (const task of tasks.filter((t) => t.profileId === profileId && t.active)) {
    if (!currentIds.has(task.id)) {
      await add("taskInstances", {
        profileId,
        taskId: task.id,
        date,
        status: "pending",
        completedAt: null,
        pointsAwarded: 0,
        approvalBy: null,
        routineType: task.routineType
      });
    }
  }
}

async function addTransaction(profileId, kind, pointsDelta, source, note = "") {
  const wallet = await getById("wallets", `wallet_${profileId}`);
  const next = {
    ...wallet,
    balance: wallet.balance + pointsDelta,
    lifetimeEarned: wallet.lifetimeEarned + (pointsDelta > 0 ? pointsDelta : 0),
    lifetimeSpent: wallet.lifetimeSpent + (pointsDelta < 0 ? Math.abs(pointsDelta) : 0)
  };
  await put("wallets", next);
  await add("transactions", {
    profileId,
    kind,
    source,
    pointsDelta,
    balanceAfter: next.balance,
    note,
    createdAt: new Date().toISOString()
  });
}

async function shouldRequireApproval(task) {
  if (task.requiresParentApproval) return true;
  if (!task.allowRandomApproval) return false;
  const settings = await getById("settings", "global");
  const rate = settings?.randomApprovalRate || 0;
  return Math.random() * 100 < rate;
}

async function applyTaskCompletion(instanceId) {
  const instance = await getById("taskInstances", instanceId);
  const task = await getById("tasks", instance.taskId);
  if (!task || instance.status === "approved") return;

  const requireApproval = await shouldRequireApproval(task);
  const completionTime = formatHM(new Date());

  if (requireApproval) {
    await put("taskInstances", {
      ...instance,
      completedAt: completionTime,
      status: "pending_approval"
    });
    toast("המשימה נשלחה לאישור הורה");
    return;
  }

  await approveTask(instance.id, true, "system");
}

async function getScoring(profileId) {
  const scoring = await getById("settings", "scoring");
  return scoring?.value?.[profileId] || defaultScoring[profileId];
}

async function calcTaskPoints(profileId, task, completionHM, routineType) {
  const score = await getScoring(profileId);
  let points = task.basePoints;

  let target = null;
  const profile = await getById("profiles", profileId);
  if (routineType === "morning") target = profile.morningTarget;
  if (routineType === "evening") target = profile.bedtimeTarget;

  if (target) {
    const lateness = minutesBetween(target, completionHM);
    if (lateness > score.lateThresholdMin) {
      if (score.latePenaltyMode === "zero") points = 0;
      if (score.latePenaltyMode === "partial") points = Math.round(points * (1 - score.partialPenaltyPercent / 100));
    }
  }

  return Math.max(points, 0);
}

async function approveTask(instanceId, approved, approver = "parent") {
  const instance = await getById("taskInstances", instanceId);
  const task = await getById("tasks", instance.taskId);
  if (!instance || !task) return;

  if (!approved) {
    await put("taskInstances", { ...instance, status: "rejected", approvalBy: approver });
    toast("המשימה נדחתה");
    render();
    return;
  }

  const completionHM = instance.completedAt || nowHM();
  const points = await calcTaskPoints(instance.profileId, task, completionHM, task.routineType);

  await put("taskInstances", {
    ...instance,
    completedAt: completionHM,
    status: "approved",
    pointsAwarded: points,
    approvalBy: approver
  });
  await addTransaction(instance.profileId, "earn", points, "task", `${task.title} (${task.routineType})`);

  await maybeRoutineBonus(instance.profileId, instance.date, "morning");
  await maybeStreakBonus(instance.profileId, instance.date);

  toast(`נוספו ${points} נקודות`);
  render();
}

async function maybeRoutineBonus(profileId, date, routineType) {
  if (routineType !== "morning") return;

  const profile = await getById("profiles", profileId);
  const tasks = await getTasksForRoutine(profileId, "morning");
  const instances = await getInstancesForDate(profileId, date);
  const scoring = await getScoring(profileId);
  const done = tasks.every((task) => {
    const inst = instances.find((x) => x.taskId === task.id);
    return inst && inst.status === "approved";
  });

  if (!done) return;

  const allOnTime = tasks.every((task) => {
    const inst = instances.find((x) => x.taskId === task.id);
    return inst && inst.completedAt && minutesBetween(inst.completedAt, profile.morningTarget) >= 0;
  });

  if (!allOnTime) return;

  const bonusKey = `bonus_morning_${profileId}_${date}`;
  const marker = await getById("meta", bonusKey);
  if (marker) return;

  await addTransaction(profileId, "earn", scoring.routineBonusOnTime, "routine_bonus", "בונוס בוקר בזמן");
  await put("meta", { id: bonusKey, value: true });
  toast(`בונוס בוקר: +${scoring.routineBonusOnTime}`);
}

async function isDayQualified(profileId, date) {
  const tasks = await getAll("tasks");
  const instances = await getInstancesForDate(profileId, date);
  const activeTaskIds = tasks.filter((t) => t.profileId === profileId && t.active).map((t) => t.id);
  if (activeTaskIds.length === 0) return false;

  return activeTaskIds.every((taskId) => {
    const inst = instances.find((x) => x.taskId === taskId);
    return inst && inst.status === "approved";
  });
}

function previousDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function maybeStreakBonus(profileId, date) {
  const qualified = await isDayQualified(profileId, date);
  if (!qualified) return;

  const streak = await getById("meta", `streak_${profileId}`);
  const scoring = await getScoring(profileId);

  if (streak.lastRewardDate === date) return;

  const isContinuous = streak.lastQualifiedDate && previousDate(date) === streak.lastQualifiedDate;
  const currentDays = isContinuous ? streak.currentDays + 1 : 1;
  const bestDays = Math.max(streak.bestDays, currentDays);
  const bonus = Math.min(currentDays * scoring.streakBonusPerDay, scoring.streakCap);

  await put("meta", {
    ...streak,
    currentDays,
    bestDays,
    lastQualifiedDate: date,
    lastRewardDate: date
  });

  await addTransaction(profileId, "earn", bonus, "streak", `בונוס רצף ${currentDays} ימים`);
  toast(`בונוס רצף: +${bonus}`);
}

async function redeemReward(rewardId) {
  const reward = await getById("rewards", rewardId);
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  if (!reward || !reward.active) return;

  if (wallet.balance < reward.cost) {
    toast("אין מספיק נקודות");
    return;
  }

  if (reward.requiresApproval) {
    await add("redemptions", {
      profileId: state.profileId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      cost: reward.cost,
      status: "pending_approval",
      createdAt: new Date().toISOString()
    });
    toast("המימוש ממתין לאישור הורה");
  } else {
    await addTransaction(state.profileId, "redeem", -reward.cost, "reward", reward.title);
    await add("redemptions", {
      profileId: state.profileId,
      rewardId: reward.id,
      rewardTitle: reward.title,
      cost: reward.cost,
      status: "approved",
      createdAt: new Date().toISOString()
    });
    toast("המימוש בוצע");
  }

  render();
}

function routineLabel(r) {
  return { morning: "בוקר", afternoon: "אחרי מסגרת", evening: "ערב", homework: "שיעורי בית" }[r] || r;
}

function statusTag(status) {
  if (status === "approved") return `<span class="tag ok">בוצע</span>`;
  if (status === "pending_approval") return `<span class="tag warn">ממתין אישור</span>`;
  if (status === "rejected") return `<span class="tag bad">נדחה</span>`;
  return `<span class="tag warn">ממתין</span>`;
}

async function renderProfiles() {
  const profiles = await getAll("profiles");
  app.innerHTML = `
    <section class="screen">
      <div class="row">
        <h1>מי משתמשת עכשיו?</h1>
        <button class="big-btn ghost" id="openAdminFromProfiles">אזור הורה</button>
      </div>
      <div class="profile-grid">
        ${profiles
      .map(
        (p) => `
              <button class="profile-tile" data-profile="${p.id}">
                <div class="avatar">${p.avatar}</div>
                <h2>${p.name}</h2>
                <p class="muted">גיל ${p.age}</p>
              </button>
            `
      )
      .join("")}
      </div>
    </section>
  `;

  app.querySelectorAll("[data-profile]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.profileId = btn.dataset.profile;
      state.screen = "home";
      await ensureInstances(state.profileId, dateKey);
      render();
    });
  });

  document.getElementById("openAdminFromProfiles").addEventListener("click", openParentGate);
}

async function renderHome() {
  const profile = await getProfile();
  const instances = await getInstancesForDate(state.profileId, dateKey);
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  const done = instances.filter((i) => i.status === "approved").length;
  const percent = instances.length ? Math.round((done / instances.length) * 100) : 0;
  const remaining = instances.filter((i) => i.status !== "approved");

  app.innerHTML = `
    <section class="screen">
      <div class="row card">
        <div>
          <h1>${profile.avatar} ${profile.name} - היום שלי</h1>
          <p class="muted">יעד בוקר: ${profile.morningTarget}</p>
        </div>
        <button class="big-btn ghost" id="switchProfile">החלפת פרופיל</button>
      </div>

      <div class="grid-2">
        <div class="card progress-wrap">
          <div class="ring" style="--p:${percent}" data-label="${percent}%"></div>
          <p class="muted">התקדמות יומית</p>
        </div>
        <div class="card">
          <p class="muted">נקודות בארנק</p>
          <p class="points">${wallet.balance}</p>
          <p class="muted">היום הושלמו ${done} מתוך ${instances.length}</p>
        </div>
      </div>

      <div class="card">
        <h3>מה נשאר להיום</h3>
        <div class="list">
          ${remaining
      .slice(0, 5)
      .map((r) => `<div class="row"><span>${routineLabel(r.routineType)}</span>${statusTag(r.status)}</div>`)
      .join("") || '<p class="muted">כל הכבוד, הכל הושלם</p>'}
        </div>
      </div>
    </section>

    ${bottomNav(profile.age >= 9)}
  `;

  document.getElementById("switchProfile").addEventListener("click", () => {
    state.profileId = null;
    state.screen = "profiles";
    render();
  });
  bindNav();
}

function bottomNav(withHomework) {
  return `
    <nav class="bottom-nav">
      <button data-nav="morning" class="${state.screen === "routine" && state.routine === "morning" ? "active" : ""}">בוקר</button>
      <button data-nav="afternoon" class="${state.screen === "routine" && state.routine === "afternoon" ? "active" : ""}">אחרי מסגרת</button>
      <button data-nav="evening" class="${state.screen === "routine" && state.routine === "evening" ? "active" : ""}">ערב</button>
      <button data-nav="rewards" class="${state.screen === "rewards" ? "active" : ""}">תגמולים</button>
      <button data-nav="${withHomework ? "homework" : "home"}" class="${state.screen === "homework" ? "active" : ""}">${withHomework ? "שיעורים" : "בית"}</button>
    </nav>
  `;
}

function bindNav() {
  app.querySelectorAll("[data-nav]").forEach((b) => {
    b.addEventListener("click", () => {
      const next = b.dataset.nav;
      if (["morning", "afternoon", "evening"].includes(next)) {
        state.screen = "routine";
        state.routine = next;
      } else {
        state.screen = next;
      }
      render();
    });
  });
}

async function renderRoutine() {
  const profile = await getProfile();
  const tasks = await getTasksForRoutine(state.profileId, state.routine);
  const instances = await getInstancesForDate(state.profileId, dateKey);

  const target = state.routine === "morning" ? profile.morningTarget : state.routine === "evening" ? profile.bedtimeTarget : "17:00";
  const leftMin = minutesBetween(nowHM(), target);

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>${routineLabel(state.routine)}</h1>
          <p class="muted">יעד זמן: ${target} ${leftMin >= 0 ? `(נשארו ${leftMin} דק')` : `(איחור ${Math.abs(leftMin)} דק')`}</p>
        </div>
        <button class="big-btn ghost" id="toHome">היום שלי</button>
      </div>

      <div class="list">
        ${tasks
      .map((task) => {
        const inst = instances.find((i) => i.taskId === task.id);
        const done = inst?.status === "approved";
        const pending = inst?.status === "pending_approval";
        return `
              <article class="task-item ${done ? "done" : pending ? "pending" : ""}">
                <div>
                  <h3>${task.icon} ${task.title}</h3>
                  <div class="task-meta">
                    <span>${task.basePoints} נק'</span>
                    ${task.requiresParentApproval ? "<span>• אישור הורה</span>" : ""}
                    ${inst ? statusTag(inst.status) : ""}
                  </div>
                </div>
                <button class="big-btn ${done || pending ? "ghost" : "secondary"}" data-complete="${inst.id}" ${done || pending ? "disabled" : ""}>
                  ${done ? "בוצע" : pending ? "ממתין" : "סימון"}
                </button>
              </article>
            `;
      })
      .join("")}
      </div>
    </section>
    ${bottomNav(profile.age >= 9)}
  `;

  document.getElementById("toHome").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  app.querySelectorAll("[data-complete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await applyTaskCompletion(Number(btn.dataset.complete));
      render();
    });
  });

  bindNav();
}

async function renderHomework() {
  const profile = await getProfile();
  if (profile.age < 9) {
    state.screen = "home";
    return render();
  }

  state.routine = "afternoon";
  const tasks = (await getTasksForRoutine(state.profileId, "afternoon")).filter((t) => t.title.includes("שיעורי") || t.title.includes("קריאה") || t.title.includes("בגדים"));
  const instances = await getInstancesForDate(state.profileId, dateKey);

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>שיעורי בית</h1>
          <p class="muted">צילום הוא אופציונלי בשלב זה (אפשר להרחיב בהמשך)</p>
        </div>
        <button class="big-btn ghost" id="toHome">היום שלי</button>
      </div>
      <div class="list">
      ${tasks
      .map((task) => {
        const inst = instances.find((i) => i.taskId === task.id);
        return `
            <article class="task-item ${inst?.status === "approved" ? "done" : inst?.status === "pending_approval" ? "pending" : ""}">
              <div>
                <h3>${task.icon} ${task.title}</h3>
                <div class="task-meta">
                  <span>${task.basePoints} נק'</span>
                  ${statusTag(inst?.status || "pending")}
                </div>
              </div>
              <button class="big-btn ${inst?.status === "approved" || inst?.status === "pending_approval" ? "ghost" : "secondary"}" data-complete="${inst.id}" ${inst?.status === "approved" || inst?.status === "pending_approval" ? "disabled" : ""}>${inst?.status === "approved" ? "בוצע" : inst?.status === "pending_approval" ? "ממתין" : "סימון"}</button>
            </article>
          `;
      })
      .join("")}
      </div>
    </section>
    ${bottomNav(true)}
  `;

  document.getElementById("toHome").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  app.querySelectorAll("[data-complete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await applyTaskCompletion(Number(btn.dataset.complete));
      render();
    });
  });

  bindNav();
}

async function renderRewards() {
  const profile = await getProfile();
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  const rewards = (await getAll("rewards")).filter((r) => r.active);
  const redemptions = (await getAll("redemptions")).filter((r) => r.profileId === state.profileId).slice(-6).reverse();

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>חנות תגמולים</h1>
          <p class="muted">יתרה נוכחית</p>
          <p class="points">${wallet.balance}</p>
        </div>
        <button class="big-btn ghost" id="toHome">היום שלי</button>
      </div>

      <div class="list">
        ${rewards
      .map(
        (r) => `
              <article class="task-item">
                <div>
                  <h3>${r.title}</h3>
                  <div class="task-meta"><span>${r.cost} נק'</span> ${r.requiresApproval ? "<span>• דורש אישור הורה</span>" : ""}</div>
                </div>
                <button class="big-btn" data-redeem="${r.id}" ${wallet.balance < r.cost ? "disabled" : ""}>מימוש</button>
              </article>
            `
      )
      .join("")}
      </div>

      <div class="card">
        <h3>היסטוריית מימושים</h3>
        <div class="list">
          ${redemptions
      .map((r) => `<div class="row"><span>${r.rewardTitle}</span>${statusTag(r.status === "approved" ? "approved" : "pending_approval")}</div>`)
      .join("") || "<p class='muted'>אין מימושים עדיין</p>"}
        </div>
      </div>
    </section>
    ${bottomNav(profile.age >= 9)}
  `;

  document.getElementById("toHome").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  app.querySelectorAll("[data-redeem]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await redeemReward(btn.dataset.redeem);
    });
  });

  bindNav();
}

async function openParentGate() {
  pinInput.value = "";
  pinError.textContent = "";
  pinDialog.showModal();
}

pinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const global = await getById("settings", "global");
  const entered = await sha256(pinInput.value.trim());
  if (entered !== global.parentPinHash) {
    pinError.textContent = "PIN שגוי";
    return;
  }

  state.parentAuthorized = true;
  state.screen = "admin";
  pinDialog.close();
  render();
});

async function renderAdmin() {
  if (!state.parentAuthorized) return openParentGate();

  const profile = state.profileId ? await getProfile() : null;
  const settings = await getById("settings", "global");
  const scoring = await getById("settings", "scoring");
  const tasks = await getAll("tasks");
  const instances = await getAll("taskInstances");
  const pendingTasks = instances.filter((i) => i.status === "pending_approval");
  const pendingRewards = (await getAll("redemptions")).filter((r) => r.status === "pending_approval");

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>אזור הורה</h1>
          <p class="muted">ניהול מלא של משימות, ניקוד, אישורים וגיבוי</p>
        </div>
        <button class="big-btn ghost" id="exitAdmin">יציאה</button>
      </div>

      <div class="card">
        <h3>אישורים ממתינים</h3>
        <div class="list">
          ${pendingTasks
      .map((p) => `<div class="row"><span>משימה #${p.id} (${routineLabel(p.routineType)})</span><div><button class="big-btn secondary" data-approve-task="${p.id}">אישור</button> <button class="big-btn warn" data-reject-task="${p.id}">דחייה</button></div></div>`)
      .join("") || "<p class='muted'>אין משימות ממתינות</p>"}
          ${pendingRewards
      .map((r) => `<div class="row"><span>${r.rewardTitle} (${r.cost} נק')</span><div><button class="big-btn secondary" data-approve-redemption="${r.id}">אישור</button> <button class="big-btn warn" data-reject-redemption="${r.id}">דחייה</button></div></div>`)
      .join("") || "<p class='muted'>אין מימושים ממתינים</p>"}
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>הגדרות אבטחה וכללים</h3>
          <label>אחוז אישור אקראי
            <input id="randomRate" type="number" min="0" max="100" value="${settings.randomApprovalRate}" />
          </label>
          <label>PIN חדש (אופציונלי)
            <input id="newPin" type="password" inputmode="numeric" />
          </label>
          <button class="big-btn" id="saveGlobal">שמירה</button>
        </div>

        <div class="card">
          <h3>מדיניות ניקוד (בת 9)</h3>
          <label>בונוס בוקר
            <input id="s9_bonus" type="number" value="${scoring.value.child9.routineBonusOnTime}" />
          </label>
          <label>בונוס רצף ליום
            <input id="s9_streak" type="number" value="${scoring.value.child9.streakBonusPerDay}" />
          </label>
          <label>תקרת רצף
            <input id="s9_cap" type="number" value="${scoring.value.child9.streakCap}" />
          </label>
          <button class="big-btn" id="saveScoring9">שמירה</button>
        </div>
      </div>

      <div class="card">
        <h3>משימות פעילות</h3>
        <div class="list">
          ${tasks
      .sort((a, b) => a.profileId.localeCompare(b.profileId) || a.routineType.localeCompare(b.routineType) || a.order - b.order)
      .map(
        (t) => `<div class="row"><span>${t.profileId} / ${routineLabel(t.routineType)} / ${t.title} (${t.basePoints})</span><div><button class="big-btn ghost" data-toggle-approval="${t.id}">${t.requiresParentApproval ? "ביטול אישור חובה" : "הפעלת אישור חובה"}</button></div></div>`
      )
      .join("")}
        </div>
      </div>

      <div class="card">
        <h3>הוספת משימה חדשה</h3>
        <div class="grid-2">
          <label>פרופיל
            <select id="newTaskProfile">
              <option value="child9">בת 9</option>
              <option value="child4">בת 4</option>
            </select>
          </label>
          <label>בלוק
            <select id="newTaskRoutine">
              <option value="morning">בוקר</option>
              <option value="afternoon">אחרי מסגרת</option>
              <option value="evening">ערב</option>
            </select>
          </label>
          <label>כותרת
            <input id="newTaskTitle" />
          </label>
          <label>אייקון
            <input id="newTaskIcon" value="⭐" />
          </label>
          <label>נקודות
            <input id="newTaskPoints" type="number" value="5" />
          </label>
        </div>
        <button class="big-btn" id="addTask">הוספה</button>
      </div>

      <div class="card row">
        <button class="big-btn secondary" id="backupBtn">גיבוי JSON</button>
        <label class="big-btn ghost" for="restoreInput">שחזור מגיבוי</label>
        <input id="restoreInput" type="file" accept="application/json" hidden />
      </div>

      <div class="card">
        <p class="muted">פרופיל נוכחי: ${profile ? profile.name : "לא נבחר"}</p>
      </div>
    </section>
  `;

  document.getElementById("exitAdmin").addEventListener("click", () => {
    state.parentAuthorized = false;
    state.screen = state.profileId ? "home" : "profiles";
    render();
  });

  app.querySelectorAll("[data-approve-task]").forEach((btn) => btn.addEventListener("click", () => approveTask(Number(btn.dataset.approveTask), true, "parent")));
  app.querySelectorAll("[data-reject-task]").forEach((btn) => btn.addEventListener("click", () => approveTask(Number(btn.dataset.rejectTask), false, "parent")));

  app.querySelectorAll("[data-approve-redemption]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.approveRedemption);
      const red = await getById("redemptions", id);
      if (!red || red.status !== "pending_approval") return;
      await addTransaction(red.profileId, "redeem", -red.cost, "reward", red.rewardTitle);
      await put("redemptions", { ...red, status: "approved" });
      toast("מימוש אושר");
      render();
    })
  );

  app.querySelectorAll("[data-reject-redemption]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.rejectRedemption);
      const red = await getById("redemptions", id);
      if (!red) return;
      await put("redemptions", { ...red, status: "rejected" });
      toast("מימוש נדחה");
      render();
    })
  );

  app.querySelectorAll("[data-toggle-approval]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const task = await getById("tasks", Number(btn.dataset.toggleApproval));
      await put("tasks", { ...task, requiresParentApproval: !task.requiresParentApproval });
      toast("הגדרת אישור עודכנה");
      render();
    })
  );

  document.getElementById("saveGlobal").addEventListener("click", async () => {
    const randomRate = Math.max(0, Math.min(100, Number(document.getElementById("randomRate").value || 0)));
    const newPin = document.getElementById("newPin").value.trim();
    const payload = { ...settings, randomApprovalRate: randomRate };
    if (newPin) payload.parentPinHash = await sha256(newPin);
    await put("settings", payload);
    toast("הגדרות נשמרו");
    render();
  });

  document.getElementById("saveScoring9").addEventListener("click", async () => {
    const next = structuredClone(scoring.value);
    next.child9.routineBonusOnTime = Number(document.getElementById("s9_bonus").value || 0);
    next.child9.streakBonusPerDay = Number(document.getElementById("s9_streak").value || 0);
    next.child9.streakCap = Number(document.getElementById("s9_cap").value || 0);
    await put("settings", { id: "scoring", value: next });
    toast("ניקוד עודכן");
  });

  document.getElementById("addTask").addEventListener("click", async () => {
    const profileId = document.getElementById("newTaskProfile").value;
    const routineType = document.getElementById("newTaskRoutine").value;
    const title = document.getElementById("newTaskTitle").value.trim();
    const icon = document.getElementById("newTaskIcon").value.trim() || "⭐";
    const basePoints = Number(document.getElementById("newTaskPoints").value || 0);

    if (!title) {
      toast("צריך כותרת למשימה");
      return;
    }

    const all = await getAll("tasks");
    const maxOrder = Math.max(0, ...all.filter((t) => t.profileId === profileId && t.routineType === routineType).map((x) => x.order));
    await add("tasks", { profileId, routineType, title, icon, basePoints, requiresParentApproval: false, allowRandomApproval: true, order: maxOrder + 1, active: true });
    toast("משימה נוספה");
    render();
  });

  document.getElementById("backupBtn").addEventListener("click", backupData);
  document.getElementById("restoreInput").addEventListener("change", restoreData);
}

async function backupData() {
  const payload = {};
  for (const s of stores) payload[s] = await getAll(s);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kids-points-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("גיבוי הורד");
}

async function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function restoreData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    for (const s of stores) {
      await clearStore(s);
      for (const item of data[s] || []) {
        await put(s, item);
      }
    }
    toast("שחזור הושלם");
    render();
  } catch {
    toast("שחזור נכשל - קובץ לא תקין");
  }
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

async function render() {
  if (!state.profileId && state.screen !== "admin") state.screen = "profiles";

  if (state.profileId) await ensureInstances(state.profileId, dateKey);

  if (state.screen === "profiles") return renderProfiles();
  if (state.screen === "home") return renderHome();
  if (state.screen === "routine") return renderRoutine();
  if (state.screen === "rewards") return renderRewards();
  if (state.screen === "homework") return renderHomework();
  if (state.screen === "admin") return renderAdmin();
}

async function bootstrap() {
  state.db = await openDB();
  await seedIfNeeded();
  await enforceProfileNames();
  await render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=3");
  }
}

bootstrap();
