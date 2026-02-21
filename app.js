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

function hebrewWeekdayLabel(date = new Date()) {
  const days = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "יום שבת"];
  return days[date.getDay()];
}

function greetingByTime(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  return "ערב טוב";
}

function numLtr(value) {
  return `<span class="num-ltr">${value}</span>`;
}

function ratioLtr(a, b) {
  return `<span class="num-ltr">${a}/${b}</span>`;
}

function mathExpr(expr) {
  return `<span class="num-ltr">${expr}</span>`;
}

let dateKey = todayISO();
const DB_NAME = "KidsPointsApp";
const DB_VERSION = 1;
const DAILY_MAX_POINTS = 100;
const TASKS_POINTS_BUDGET = 80;
const MORNING_BONUS_POINTS = 10;
const STREAK_BONUS_MAX = 10;
const LEARN_POINTS_PER_CORRECT = 2;
const LEARN_DAILY_CAP = 30;

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

const DAILY_POINTS_SOURCES = new Set(["task", "routine_bonus", "streak", "daily_completion"]);
const LEARN_POINTS_SOURCES = new Set(["learn"]);

const state = {
  profileId: null,
  screen: "profiles",
  routine: "morning",
  db: null,
  parentAuthorized: false,
  afterParentAuthAction: null,
  learnQuestions: {},
  learnStats: {}
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const LEARN_MODULES_OLDER = [
  {
    id: "eng",
    icon: "🇬🇧",
    title: "אנגלית",
    subtitle: "דקדוק ואוצר מילים (10+)",
    generate() {
      const bank = [
        {
          prompt: "Choose the correct word: She ___ to school every day.",
          options: ["go", "goes", "going", "gone"],
          answer: "goes"
        },
        {
          prompt: "Complete the sentence: Yesterday we ___ to the park.",
          options: ["go", "goes", "went", "going"],
          answer: "went"
        },
        {
          prompt: "Which word is the opposite of 'difficult'?",
          options: ["hard", "easy", "slow", "long"],
          answer: "easy"
        },
        {
          prompt: "Pick the correct sentence:",
          options: [
            "He don't like math.",
            "He doesn't likes math.",
            "He doesn't like math.",
            "He not like math."
          ],
          answer: "He doesn't like math."
        },
        {
          prompt: "Choose the best translation: 'יש לי שני אחים'.",
          options: [
            "I have two brothers.",
            "I has two brothers.",
            "I have two brother.",
            "I am have two brothers."
          ],
          answer: "I have two brothers."
        }
      ];
      return bank[randInt(0, bank.length - 1)];
    }
  },
  {
    id: "math",
    icon: "🧮",
    title: "חשבון ומתמטיקה",
    subtitle: "כפל, חילוק וסדר פעולות (10+)",
    generate() {
      const mode = randInt(1, 3);
      let answer = 0;
      let prompt = "";
      if (mode === 1) {
        const a = randInt(11, 19);
        const b = randInt(4, 9);
        answer = a * b;
        prompt = `כמה זה ${mathExpr(`${a} × ${b}`)} ?`;
      } else if (mode === 2) {
        const b = randInt(3, 9);
        const answerBase = randInt(6, 18);
        const a = b * answerBase;
        answer = answerBase;
        prompt = `כמה זה ${mathExpr(`${a} ÷ ${b}`)} ?`;
      } else {
        const a = randInt(4, 12);
        const b = randInt(3, 10);
        const c = randInt(2, 6);
        answer = (a + b) * c;
        prompt = `מה התוצאה של ${mathExpr(`(${a} + ${b}) × ${c}`)} ?`;
      }
      const options = shuffled([answer, answer + randInt(1, 4), Math.max(1, answer - randInt(1, 4)), answer + randInt(5, 9)]);
      return {
        prompt,
        options: options.filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 4),
        answer
      };
    }
  },
  {
    id: "geo",
    icon: "📐",
    title: "גאומטריה",
    subtitle: "היקפים, שטחים וזוויות (10+)",
    generate() {
      const mode = randInt(1, 4);
      let prompt = "";
      let answer = 0;
      if (mode === 1) {
        const w = randInt(4, 11);
        const h = randInt(3, 9);
        prompt = `מה היקף מלבן באורך ${w} וברוחב ${h}?`;
        answer = 2 * (w + h);
      } else if (mode === 2) {
        const w = randInt(4, 12);
        const h = randInt(3, 10);
        prompt = `מה שטח מלבן באורך ${w} וברוחב ${h}?`;
        answer = w * h;
      } else if (mode === 3) {
        prompt = "כמה מעלות יש בזווית ישרה?";
        answer = 90;
      } else {
        const sides = randInt(5, 8);
        const names = { 5: "מחומש", 6: "משושה", 7: "משובע", 8: "מתומן" };
        prompt = `כמה צלעות יש ל${names[sides]}?`;
        answer = sides;
      }
      const options = shuffled([answer, answer + 2, Math.max(1, answer - 2), answer + 5]).filter((x, i, arr) => arr.indexOf(x) === i);
      return {
        prompt,
        options: options.slice(0, 4),
        answer
      };
    }
  }
];

const LEARN_MODULES_YOUNGER = [
  {
    id: "count",
    icon: "🔢",
    title: "ספירה לגיל 4-5",
    subtitle: "כמה יש בתמונה?",
    generate() {
      const n = randInt(1, 6);
      const prompt = `כמה תפוחים יש כאן? ${"🍎".repeat(n)}`;
      const options = shuffled([n, Math.max(1, n - 1), Math.min(6, n + 1), randInt(1, 6)].filter((x, i, arr) => arr.indexOf(x) === i)).slice(0, 4);
      return { prompt, options, answer: n };
    }
  },
  {
    id: "colors",
    icon: "🎨",
    title: "צבעים",
    subtitle: "זיהוי צבע",
    generate() {
      const colors = [
        ["🟦", "כחול"],
        ["🟥", "אדום"],
        ["🟩", "ירוק"],
        ["🟨", "צהוב"]
      ];
      const pair = colors[randInt(0, colors.length - 1)];
      const distractors = shuffled(colors.filter((x) => x[1] !== pair[1]).map((x) => x[1])).slice(0, 3);
      return {
        prompt: `איזה צבע זה? ${pair[0]}`,
        options: shuffled([pair[1], ...distractors]),
        answer: pair[1]
      };
    }
  },
  {
    id: "shapes",
    icon: "🧩",
    title: "צורות פשוטות",
    subtitle: "מה הצורה?",
    generate() {
      const shapes = [
        ["⚪", "עיגול"],
        ["🟦", "ריבוע"],
        ["🔺", "משולש"],
        ["❤️", "לב"]
      ];
      const pair = shapes[randInt(0, shapes.length - 1)];
      const distractors = shuffled(shapes.filter((x) => x[1] !== pair[1]).map((x) => x[1])).slice(0, 3);
      return {
        prompt: `איזו צורה זאת? ${pair[0]}`,
        options: shuffled([pair[1], ...distractors]),
        answer: pair[1]
      };
    }
  }
];

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
  { id: "child9", name: "סופיה", age: 9, avatar: "🦘", morningTarget: "08:00", bedtimeTarget: "20:30", uiMode: "standard" },
  { id: "child4", name: "אנה", age: 4, avatar: "🐱", morningTarget: "08:00", bedtimeTarget: "19:45", uiMode: "visual" }
];

const seedTasks = [
  ["child9", "morning", "לקום", "🌞", 5, false, true, 1],
  ["child9", "morning", "שירותים", "🚽", 4, false, false, 2],
  ["child9", "morning", "צחצוח שיניים", "🪥", 6, false, false, 3],
  ["child9", "morning", "שטיפת פנים", "💦", 4, false, false, 4],
  ["child9", "morning", "לאכול", "🍳", 6, false, false, 5],
  ["child9", "morning", "להתלבש", "👕", 7, false, true, 6],
  ["child9", "morning", "תיק מוכן", "🎒", 8, false, false, 7],
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

const APPROVAL_FREE_TASK_TITLES = new Set(["לקום", "לאכול", "תיק מוכן"]);
const SOPHIA_HOMEWORK_TITLES = new Set(["שיעורי בית", "קריאה 15 דקות", "הכנת בגדים למחר"]);
const SOPHIA_AFTERSCHOOL_TITLES = new Set(["חטיף בריא", "מנוחה 15 דקות", "עזרה בבית 10 דקות"]);

function normalizeHebrewTitle(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/["'`׳״]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSophiaHomeworkTitle(title = "") {
  const normalized = normalizeHebrewTitle(title);
  if (!normalized) return false;
  if (SOPHIA_HOMEWORK_TITLES.has(title)) return true;
  const keywords = ["שיעור", "שיעורי", "קריאה", "אנגלית", "חשבון", "מתמט", "גאומטר", "בגדים למחר"];
  return keywords.some((k) => normalized.includes(k));
}

const defaultScoring = {
  child9: { routineBonusOnTime: 20, streakBonusPerDay: 2, streakCap: 12, lateThresholdMin: 20, latePenaltyMode: "partial", partialPenaltyPercent: 50 },
  child4: { routineBonusOnTime: 15, streakBonusPerDay: 1, streakCap: 8, lateThresholdMin: 25, latePenaltyMode: "none", partialPenaltyPercent: 0 }
};

async function seedIfNeeded() {
  const profiles = await getAll("profiles");
  if (profiles.length > 0) return;

  for (const profile of seedProfiles) {
    await put("profiles", profile);
    await put("wallets", {
      id: `wallet_${profile.id}`,
      profileId: profile.id,
      balanceDaily: 0,
      balanceLearn: 0,
      lifetimeEarnedDaily: 0,
      lifetimeEarnedLearn: 0,
      lifetimeSpentDaily: 0,
      lifetimeSpentLearn: 0,
      balance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0
    });
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

  await put("settings", { id: "global", randomApprovalRate: 0, parentPinHash: await sha256("1234") });
  await put("settings", { id: "scoring", value: defaultScoring });
}

async function ensureGlobalSettings() {
  const existing = await getById("settings", "global");
  const fallbackHash = await sha256("1234");
  const next = {
    id: "global",
    randomApprovalRate: Number(existing?.randomApprovalRate ?? 0),
    parentPinHash: existing?.parentPinHash || fallbackHash
  };
  await put("settings", next);
}

async function enforceTaskApprovalDefaults() {
  const tasks = await getAll("tasks");
  for (const task of tasks) {
    if (APPROVAL_FREE_TASK_TITLES.has(task.title) && (task.allowRandomApproval || task.requiresParentApproval)) {
      await put("tasks", { ...task, allowRandomApproval: false, requiresParentApproval: false });
    }
  }
}

async function ensureHomeworkSplitForSophia() {
  const tasks = await getAll("tasks");
  const sophiaTasks = tasks.filter((t) => t.profileId === "child9");

  let homeworkOrder = 1;
  let afternoonOrder = 1;
  for (const task of sophiaTasks) {
    const isHomework = isSophiaHomeworkTitle(task.title);
    if (isHomework && task.routineType !== "homework") {
      await put("tasks", { ...task, routineType: "homework", order: homeworkOrder, active: true });
      homeworkOrder += 1;
    } else if (isHomework) {
      await put("tasks", { ...task, order: homeworkOrder, active: true });
      homeworkOrder += 1;
    } else if (task.routineType === "homework") {
      await put("tasks", { ...task, routineType: "afternoon", order: afternoonOrder, active: true });
      afternoonOrder += 1;
    } else if (task.routineType === "afternoon") {
      await put("tasks", { ...task, order: afternoonOrder, active: true });
      afternoonOrder += 1;
    }
  }

  const afterSchoolTemplates = [
    { title: "חטיף בריא", icon: "🥗", basePoints: 6 },
    { title: "מנוחה 15 דקות", icon: "🛋️", basePoints: 6 },
    { title: "עזרה בבית 10 דקות", icon: "🧹", basePoints: 7 }
  ];

  const updatedTasks = await getAll("tasks");
  const sophiaAfter = updatedTasks.filter(
    (t) => t.profileId === "child9" && t.routineType === "afternoon" && SOPHIA_AFTERSCHOOL_TITLES.has(t.title)
  );
  let nextOrder = Math.max(0, ...sophiaAfter.map((t) => t.order || 0)) + 1;

  for (const tpl of afterSchoolTemplates) {
    const exists = updatedTasks.find((t) => t.profileId === "child9" && t.title === tpl.title);
    if (!exists) {
      await add("tasks", {
        profileId: "child9",
        routineType: "afternoon",
        title: tpl.title,
        icon: tpl.icon,
        basePoints: tpl.basePoints,
        requiresParentApproval: false,
        allowRandomApproval: false,
        order: nextOrder,
        active: true
      });
      nextOrder += 1;
    } else if (exists.routineType !== "afternoon" || !exists.active) {
      await put("tasks", { ...exists, routineType: "afternoon", active: true, order: nextOrder });
      nextOrder += 1;
    }
  }
}

async function enforceProfileNames() {
  const p9 = await getById("profiles", "child9");
  const p4 = await getById("profiles", "child4");
  if (p9 && (p9.name !== "סופיה" || p9.avatar !== "🦘")) await put("profiles", { ...p9, name: "סופיה", avatar: "🦘" });
  if (p4 && (p4.name !== "אנה" || p4.avatar !== "🐱")) await put("profiles", { ...p4, name: "אנה", avatar: "🐱" });
}

function formatHM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function minutesBetween(hmA, hmB) {
  const [h1, m1] = hmA.split(":").map(Number);
  const [h2, m2] = hmB.split(":").map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function isoFromDate(dateObj) {
  const d = new Date(dateObj);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function scoreDateOf(transaction) {
  return transaction.scoreDate || (transaction.createdAt ? transaction.createdAt.slice(0, 10) : todayISO());
}

function parseISODate(iso) {
  return new Date(`${iso}T12:00:00`);
}

function weekStartISO(iso) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() - d.getDay());
  return isoFromDate(d);
}

function weekEndISO(iso) {
  const d = parseISODate(weekStartISO(iso));
  d.setDate(d.getDate() + 6);
  return isoFromDate(d);
}

async function getProfile() {
  return getById("profiles", state.profileId);
}

async function getTasksForRoutine(profileId, routineType) {
  const tasks = await getAll("tasks");
  const profileTasks = tasks.filter((t) => t.profileId === profileId && t.active);

  if (profileId === "child9" && routineType === "homework") {
    return profileTasks
      .filter((t) => (t.routineType === "homework" || t.routineType === "afternoon") && isSophiaHomeworkTitle(t.title))
      .sort((a, b) => a.order - b.order);
  }

  if (profileId === "child9" && routineType === "afternoon") {
    return profileTasks
      .filter((t) => (t.routineType === "afternoon" || t.routineType === "homework") && !isSophiaHomeworkTitle(t.title))
      .sort((a, b) => a.order - b.order);
  }

  return profileTasks.filter((t) => t.routineType === routineType).sort((a, b) => a.order - b.order);
}

async function getInstancesForDate(profileId, date) {
  const all = await getAll("taskInstances");
  return all.filter((x) => x.profileId === profileId && x.date === date);
}

async function ensureInstances(profileId, date = dateKey) {
  const tasks = await getAll("tasks");
  const instances = await getInstancesForDate(profileId, date);
  const currentIds = new Set(instances.map((i) => i.taskId));
  const taskMap = new Map(tasks.filter((t) => t.profileId === profileId).map((t) => [t.id, t]));

  for (const inst of instances) {
    const task = taskMap.get(inst.taskId);
    if (!task) continue;
    if (inst.routineType !== task.routineType) {
      await put("taskInstances", { ...inst, routineType: task.routineType });
    }
  }

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

async function recomputeWallet(profileId) {
  const wallet = await getById("wallets", `wallet_${profileId}`);
  const transactions = (await getAll("transactions")).filter((t) => t.profileId === profileId);
  let balanceDaily = 0;
  let balanceLearn = 0;
  let lifetimeEarnedDaily = 0;
  let lifetimeEarnedLearn = 0;
  let lifetimeSpentDaily = 0;
  let lifetimeSpentLearn = 0;

  for (const t of transactions) {
    const delta = Number(t.pointsDelta || 0);
    const isLearn = LEARN_POINTS_SOURCES.has(t.source);

    if (isLearn) {
      balanceLearn += delta;
      if (delta > 0) lifetimeEarnedLearn += delta;
      if (delta < 0) lifetimeSpentLearn += Math.abs(delta);
    } else {
      balanceDaily += delta;
      if (delta > 0) lifetimeEarnedDaily += delta;
      if (delta < 0) lifetimeSpentDaily += Math.abs(delta);
    }
  }

  const lifetimeEarned = lifetimeEarnedDaily + lifetimeEarnedLearn;
  const lifetimeSpent = lifetimeSpentDaily + lifetimeSpentLearn;
  await put("wallets", {
    ...wallet,
    balanceDaily,
    balanceLearn,
    lifetimeEarnedDaily,
    lifetimeEarnedLearn,
    lifetimeSpentDaily,
    lifetimeSpentLearn,
    balance: balanceDaily,
    lifetimeEarned,
    lifetimeSpent
  });
}

async function getDailyEarnedPoints(profileId, scoreDate, sources = null) {
  const allowed = sources ? new Set(sources) : null;
  const transactions = (await getAll("transactions")).filter(
    (t) => t.profileId === profileId && t.kind === "earn" && scoreDateOf(t) === scoreDate && (!allowed || allowed.has(t.source))
  );
  return transactions.reduce((sum, t) => sum + Number(t.pointsDelta || 0), 0);
}

async function addTransaction(profileId, kind, pointsDelta, source, note = "", options = {}) {
  const scoreDate = options.scoreDate || todayISO();
  let safeDelta = Number(pointsDelta);
  if (kind === "earn") {
    if (source === "learn") {
      const alreadyLearned = await getDailyEarnedPoints(profileId, scoreDate, ["learn"]);
      const leftLearn = Math.max(0, LEARN_DAILY_CAP - alreadyLearned);
      safeDelta = Math.min(Math.max(0, safeDelta), leftLearn);
    } else {
      const alreadyEarned = await getDailyEarnedPoints(profileId, scoreDate, [...DAILY_POINTS_SOURCES]);
      const leftToday = Math.max(0, DAILY_MAX_POINTS - alreadyEarned);
      safeDelta = Math.min(Math.max(0, safeDelta), leftToday);
    }
  }
  if (!Number.isFinite(safeDelta) || safeDelta === 0) return 0;

  await add("transactions", {
    profileId,
    kind,
    source,
    sourceId: options.sourceId ?? null,
    pointsDelta: safeDelta,
    scoreDate,
    note,
    createdAt: new Date().toISOString()
  });
  await recomputeWallet(profileId);
  return safeDelta;
}

async function removeEarnTransactionsForDate(profileId, scoreDate) {
  const transactions = await getAll("transactions");
  const toRemove = transactions.filter(
    (t) =>
      t.profileId === profileId &&
      t.kind === "earn" &&
      scoreDateOf(t) === scoreDate &&
      DAILY_POINTS_SOURCES.has(t.source)
  );
  for (const t of toRemove) {
    await del("transactions", t.id);
  }
}

async function getScoreSummary(profileId, scoreDate = todayISO()) {
  const transactions = (await getAll("transactions")).filter(
    (t) => t.profileId === profileId && t.kind === "earn" && DAILY_POINTS_SOURCES.has(t.source)
  );
  const byDate = new Map();
  for (const t of transactions) {
    const d = scoreDateOf(t);
    byDate.set(d, (byDate.get(d) || 0) + Number(t.pointsDelta || 0));
  }
  const dailyRaw = byDate.get(scoreDate) || 0;
  const daily = Math.min(DAILY_MAX_POINTS, dailyRaw);

  const weekStart = weekStartISO(scoreDate);
  const weekEnd = weekEndISO(scoreDate);
  const weekly = [...byDate.entries()]
    .filter(([d]) => d >= weekStart && d <= weekEnd)
    .reduce((sum, [, value]) => sum + Math.min(DAILY_MAX_POINTS, value), 0);

  const monthPrefix = scoreDate.slice(0, 7);
  const monthly = [...byDate.entries()]
    .filter(([d]) => d.startsWith(monthPrefix))
    .reduce((sum, [, value]) => sum + Math.min(DAILY_MAX_POINTS, value), 0);

  const monthDate = parseISODate(scoreDate);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  return {
    daily,
    dailyCap: DAILY_MAX_POINTS,
    weekly,
    weeklyCap: DAILY_MAX_POINTS * 7,
    monthly,
    monthlyCap: DAILY_MAX_POINTS * daysInMonth
  };
}

async function getLearnSummary(profileId, scoreDate = todayISO()) {
  const transactions = (await getAll("transactions")).filter((t) => t.profileId === profileId && t.kind === "earn" && t.source === "learn");
  const byDate = new Map();
  for (const t of transactions) {
    const d = scoreDateOf(t);
    byDate.set(d, (byDate.get(d) || 0) + Number(t.pointsDelta || 0));
  }
  const daily = Math.min(LEARN_DAILY_CAP, byDate.get(scoreDate) || 0);

  const weekStart = weekStartISO(scoreDate);
  const weekEnd = weekEndISO(scoreDate);
  const weekly = [...byDate.entries()]
    .filter(([d]) => d >= weekStart && d <= weekEnd)
    .reduce((sum, [, value]) => sum + Math.min(LEARN_DAILY_CAP, value), 0);

  const monthPrefix = scoreDate.slice(0, 7);
  const monthly = [...byDate.entries()]
    .filter(([d]) => d.startsWith(monthPrefix))
    .reduce((sum, [, value]) => sum + Math.min(LEARN_DAILY_CAP, value), 0);

  const monthDate = parseISODate(scoreDate);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  return {
    daily,
    dailyCap: LEARN_DAILY_CAP,
    weekly,
    weeklyCap: LEARN_DAILY_CAP * 7,
    monthly,
    monthlyCap: LEARN_DAILY_CAP * daysInMonth
  };
}

async function shouldRequireApproval(task) {
  if (task.requiresParentApproval) return true;
  if (APPROVAL_FREE_TASK_TITLES.has(task.title)) return false;
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

async function calcTaskPoints(profileId, task, completionHM, routineType, scaleFactor = 1) {
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

  return Math.max(0, Math.round(points * scaleFactor));
}

async function getTaskScaleFactor(profileId) {
  const tasks = (await getAll("tasks")).filter((t) => t.profileId === profileId && t.active);
  const rawTotal = tasks.reduce((sum, t) => sum + Number(t.basePoints || 0), 0);
  if (rawTotal <= 0) return 1;
  return TASKS_POINTS_BUDGET / rawTotal;
}

async function getTaskDisplayPoints(task, scale = null) {
  const factor = scale ?? (await getTaskScaleFactor(task.profileId));
  return Math.max(1, Math.round(Number(task.basePoints || 0) * factor));
}

async function getTaskDisplayMap(tasks) {
  if (tasks.length === 0) return {};
  const factor = await getTaskScaleFactor(tasks[0].profileId);
  const pairs = await Promise.all(tasks.map(async (task) => [task.id, await getTaskDisplayPoints(task, factor)]));
  return Object.fromEntries(pairs);
}

async function clearMilestoneMarkers(profileId, scoreDate) {
  await del("meta", `celebrate_routine_${profileId}_${scoreDate}_morning`);
  await del("meta", `celebrate_routine_${profileId}_${scoreDate}_afternoon`);
  await del("meta", `celebrate_routine_${profileId}_${scoreDate}_evening`);
  await del("meta", `medal_${profileId}_${scoreDate}`);
}

async function getStreakDaysEnding(profileId, date) {
  let streakDays = 0;
  const cursor = parseISODate(date);
  for (let i = 0; i < 365; i += 1) {
    const iso = isoFromDate(cursor);
    const ok = await isDayQualified(profileId, iso);
    if (!ok) break;
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streakDays;
}

async function recomputeDailyScores(profileId, scoreDate) {
  await removeEarnTransactionsForDate(profileId, scoreDate);

  const tasks = (await getAll("tasks")).filter((t) => t.profileId === profileId && t.active);
  const instances = await getInstancesForDate(profileId, scoreDate);
  const scale = await getTaskScaleFactor(profileId);
  const profile = await getById("profiles", profileId);
  const planned = [];

  for (const inst of instances) {
    const task = tasks.find((t) => t.id === inst.taskId);
    if (!task) continue;
    if (inst.status === "approved") {
      const completionHM = inst.completedAt || nowHM();
      const points = await calcTaskPoints(profileId, task, completionHM, task.routineType, scale);
      await put("taskInstances", { ...inst, pointsAwarded: points });
      planned.push({
        points,
        source: "task",
        sourceId: inst.id,
        note: `${task.title} (${task.routineType})`
      });
    } else if (inst.pointsAwarded !== 0) {
      await put("taskInstances", { ...inst, pointsAwarded: 0 });
    }
  }

  const morningTasks = tasks.filter((t) => t.routineType === "morning");
  if (morningTasks.length > 0) {
    const allDoneMorning = morningTasks.every((task) => {
      const inst = instances.find((x) => x.taskId === task.id);
      return inst && inst.status === "approved";
    });
    if (allDoneMorning) {
      const allOnTime = morningTasks.every((task) => {
        const inst = instances.find((x) => x.taskId === task.id);
        return inst && inst.completedAt && minutesBetween(inst.completedAt, profile.morningTarget) >= 0;
      });
      if (allOnTime) {
        planned.push({
          points: MORNING_BONUS_POINTS,
          source: "routine_bonus",
          sourceId: null,
          note: "בונוס בוקר בזמן"
        });
      }
    }
  }

  let streakDays = 0;
  const qualified = await isDayQualified(profileId, scoreDate);
  if (qualified) {
    streakDays = await getStreakDaysEnding(profileId, scoreDate);
    planned.push({
      points: STREAK_BONUS_MAX,
      source: "streak",
      sourceId: null,
      note: "בונוס עקביות יומי"
    });
  }

  let appliedDaily = 0;
  for (const row of planned) {
    const left = DAILY_MAX_POINTS - appliedDaily;
    if (left <= 0) break;
    const points = Math.min(Math.max(0, row.points), left);
    if (points <= 0) continue;
    const actual = await addTransaction(profileId, "earn", points, row.source, row.note, {
      scoreDate,
      sourceId: row.sourceId
    });
    appliedDaily += actual;
  }

  if (qualified && appliedDaily < DAILY_MAX_POINTS) {
    const completionTopUp = DAILY_MAX_POINTS - appliedDaily;
    const actualTopUp = await addTransaction(
      profileId,
      "earn",
      completionTopUp,
      "daily_completion",
      "השלמה ל-100 על כל משימות היום",
      { scoreDate }
    );
    appliedDaily += actualTopUp;
  }

  const streakMeta = await getById("meta", `streak_${profileId}`);
  if (streakMeta) {
    await put("meta", {
      ...streakMeta,
      currentDays: qualified ? streakDays : 0,
      bestDays: Math.max(streakMeta.bestDays || 0, qualified ? streakDays : 0),
      lastQualifiedDate: qualified ? scoreDate : streakMeta.lastQualifiedDate,
      lastRewardDate: qualified ? scoreDate : streakMeta.lastRewardDate
    });
  }

  await recomputeWallet(profileId);
}

async function approveTask(instanceId, approved, approver = "parent") {
  const instance = await getById("taskInstances", instanceId);
  const task = await getById("tasks", instance.taskId);
  if (!instance || !task) return;

  if (!approved) {
    await put("taskInstances", { ...instance, status: "rejected", pointsAwarded: 0, approvalBy: approver });
    await clearMilestoneMarkers(instance.profileId, instance.date);
    await recomputeDailyScores(instance.profileId, instance.date);
    toast("המשימה נדחתה");
    render();
    return;
  }

  const completionHM = instance.completedAt || nowHM();
  await put("taskInstances", {
    ...instance,
    completedAt: completionHM,
    status: "approved",
    pointsAwarded: 0,
    approvalBy: approver
  });
  await recomputeDailyScores(instance.profileId, instance.date);
  await maybeCelebrateMilestones(instance.profileId, instance.date, task.routineType);
  const summary = await getScoreSummary(instance.profileId, instance.date);
  toast(`נקודות היום: ${summary.daily}/${DAILY_MAX_POINTS}`);
  render();
}

async function resetTaskInstance(instanceId) {
  const instance = await getById("taskInstances", instanceId);
  if (!instance) return;
  await put("taskInstances", {
    ...instance,
    status: "pending",
    completedAt: null,
    pointsAwarded: 0,
    approvalBy: null
  });

  await clearMilestoneMarkers(instance.profileId, instance.date);

  await recomputeDailyScores(instance.profileId, instance.date);
  toast("הסימון אופס וחזר ללא בוצע");
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

async function redeemReward(rewardId) {
  const reward = await getById("rewards", rewardId);
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  if (!reward || !reward.active) return;

  if ((wallet?.balanceDaily || 0) < reward.cost) {
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

function statusLabel(status) {
  if (status === "approved") return "בוצע";
  if (status === "pending_approval") return "ממתין אישור";
  if (status === "rejected") return "נדחה";
  return "ממתין";
}

function launchConfettiFromButton(buttonElement) {
  const rect = buttonElement.getBoundingClientRect();
  const root = document.createElement("div");
  root.className = "fx-layer";
  const colors = ["#ff69b4", "#ffd84d", "#6ac6ff", "#8ce99a", "#c09bff", "#ff9f72"];
  for (let i = 0; i < 28; i += 1) {
    const dot = document.createElement("span");
    dot.className = "fx-confetti";
    dot.style.left = `${rect.left + rect.width / 2}px`;
    dot.style.top = `${rect.top + rect.height / 2}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty("--dx", `${(Math.random() - 0.5) * 260}px`);
    dot.style.setProperty("--dy", `${-90 - Math.random() * 170}px`);
    dot.style.animationDelay = `${Math.random() * 80}ms`;
    root.appendChild(dot);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 900);
}

function launchFireworks() {
  const root = document.createElement("div");
  root.className = "fx-layer";
  for (let i = 0; i < 60; i += 1) {
    const dot = document.createElement("span");
    dot.className = "fx-firework";
    dot.textContent = ["✨", "🎆", "🌟", "💫"][i % 4];
    dot.style.left = `${8 + Math.random() * 84}vw`;
    dot.style.top = `${10 + Math.random() * 70}vh`;
    dot.style.animationDelay = `${Math.random() * 400}ms`;
    root.appendChild(dot);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 1700);
}

function showMedal(profileName) {
  const medal = document.createElement("div");
  medal.className = "medal-overlay";
  medal.innerHTML = `
    <div class="medal-card">
      <div class="medal-icon">🏅</div>
      <h2>כל הכבוד ${profileName}!</h2>
      <p>השגת 100/100 נקודות היום</p>
    </div>
  `;
  document.body.appendChild(medal);
  setTimeout(() => medal.remove(), 2600);
}

function showRoutineCompletionModal(profileName, routineType) {
  const overlay = document.createElement("div");
  overlay.className = "routine-win-overlay";
  overlay.innerHTML = `
    <div class="routine-win-card">
      <div class="routine-win-emoji">🌈✨</div>
      <h2>כל הכבוד ${profileName}!</h2>
      <p>סיימת בהצלחה את משימות ה${routineLabel(routineType)}</p>
      <button class="big-btn secondary" id="routineWinHomeBtn">חזרה לתפריט הראשי</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#routineWinHomeBtn").addEventListener("click", () => {
    overlay.remove();
    state.screen = "home";
    render();
  });
}

async function isRoutineComplete(profileId, scoreDate, routineType) {
  const tasks = (await getAll("tasks")).filter((t) => t.profileId === profileId && t.routineType === routineType && t.active);
  if (tasks.length === 0) return false;
  const instances = await getInstancesForDate(profileId, scoreDate);
  return tasks.every((t) => {
    const inst = instances.find((x) => x.taskId === t.id);
    return inst && inst.status === "approved";
  });
}

async function maybeCelebrateMilestones(profileId, scoreDate, routineType) {
  if (await isRoutineComplete(profileId, scoreDate, routineType)) {
    const routineKey = `celebrate_routine_${profileId}_${scoreDate}_${routineType}`;
    const routineMarker = await getById("meta", routineKey);
    if (!routineMarker) {
      await put("meta", { id: routineKey, value: true, createdAt: new Date().toISOString() });
      const profile = await getById("profiles", profileId);
      showRoutineCompletionModal(profile?.name || "אלופה", routineType);
    }
  }

  const summary = await getScoreSummary(profileId, scoreDate);
  if (summary.daily >= DAILY_MAX_POINTS) {
    const medalKey = `medal_${profileId}_${scoreDate}`;
    const medalMarker = await getById("meta", medalKey);
    if (!medalMarker) {
      await put("meta", { id: medalKey, value: true, createdAt: new Date().toISOString() });
      const profile = await getById("profiles", profileId);
      showMedal(profile?.name || "אלופה");
      launchFireworks();
    }
  }
}

async function renderProfiles() {
  const profiles = await getAll("profiles");
  app.innerHTML = `
    <section class="screen">
      <div class="row">
        <div>
          <h1>🦄 ${greetingByTime()}</h1>
          <p class="weekday-label">${hebrewWeekdayLabel()}</p>
          <p>מי משתמשת עכשיו?</p>
        </div>
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
      await recomputeDailyScores(state.profileId, dateKey);
      render();
    });
  });

  document.getElementById("openAdminFromProfiles").addEventListener("click", () => openParentGate());
}

async function renderHome() {
  const profile = await getProfile();
  const instances = await getInstancesForDate(state.profileId, dateKey);
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  const summary = await getScoreSummary(state.profileId, dateKey);
  const learnSummary = await getLearnSummary(state.profileId, dateKey);
  const done = instances.filter((i) => i.status === "approved").length;
  const percent = Math.round((summary.daily / summary.dailyCap) * 100);
  const remaining = instances.filter((i) => i.status !== "approved");

  app.innerHTML = `
    <section class="screen">
      <div class="row card">
        <div>
          <h1>☁️ ${greetingByTime()} ${profile.name} ${profile.avatar}</h1>
          <p class="weekday-label">${hebrewWeekdayLabel()}</p>
          <p class="muted">היום שלי</p>
          <p class="muted">יעד בוקר: ${profile.morningTarget}</p>
        </div>
        <button class="big-btn ghost" id="switchProfile">החלפת פרופיל</button>
      </div>

      <div class="grid-2">
        <div class="card progress-wrap">
          <div class="ring" style="--p:${percent}" data-label="${percent}%"></div>
          <p class="muted">התקדמות לניקוד יומי</p>
        </div>
        <div class="card">
          <p class="muted">ניקוד משימות יומי (נפרד מלימודים)</p>
          <p class="points">${ratioLtr(summary.daily, summary.dailyCap)}</p>
          <p class="muted">שבועי: ${ratioLtr(summary.weekly, summary.weeklyCap)}</p>
          <p class="muted">חודשי: ${ratioLtr(summary.monthly, summary.monthlyCap)}</p>
          <p class="muted">ניקוד לימודים יומי (נפרד): ${ratioLtr(learnSummary.daily, learnSummary.dailyCap)}</p>
          <p class="muted">יתרת משימות (לתגמולים): ${numLtr(wallet?.balanceDaily || 0)}</p>
          <p class="muted">יתרת לימודים נפרדת: ${numLtr(wallet?.balanceLearn || 0)}</p>
          <p class="muted">היום הושלמו ${numLtr(done)} מתוך ${numLtr(instances.length)}</p>
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
      <button data-nav="learn" class="${state.screen === "learn" ? "active" : ""}">לימודים</button>
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
  const displayPointsByTaskId = await getTaskDisplayMap(tasks);

  const target = state.routine === "morning" ? profile.morningTarget : state.routine === "evening" ? profile.bedtimeTarget : "17:00";
  const leftMin = minutesBetween(nowHM(), target);
  const routineSubtitle = state.routine === "afternoon" ? "משימות אחריות וזמן בית" : "";

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>${routineLabel(state.routine)}</h1>
          <p class="muted">יעד זמן: ${numLtr(target)} ${leftMin >= 0 ? `(נשארו ${numLtr(leftMin)} דק')` : `(איחור ${numLtr(Math.abs(leftMin))} דק')`}</p>
          ${routineSubtitle ? `<p class="muted">${routineSubtitle}</p>` : ""}
        </div>
        <button class="big-btn ghost" id="toHome">היום שלי</button>
      </div>

      <div class="list">
        ${tasks
      .map((task) => {
        const inst = instances.find((i) => i.taskId === task.id);
        const done = inst?.status === "approved";
        const pending = inst?.status === "pending_approval";
        const doneBtnClass = state.parentAuthorized ? "warn" : "ghost";
        const doneBtnLabel = state.parentAuthorized ? "בטל" : "בטל (הורה)";
        return `
              <article class="task-item ${done ? "done" : pending ? "pending" : ""}">
                <div>
                  <h3>${task.icon} ${task.title}</h3>
                  <div class="task-meta">
                    <span>${numLtr(displayPointsByTaskId[task.id] || 0)} נק'</span>
                    ${task.requiresParentApproval ? "<span>• אישור הורה</span>" : ""}
                    ${inst ? statusTag(inst.status) : ""}
                  </div>
                </div>
                ${
                  done
                    ? `<button class="big-btn ${doneBtnClass}" data-uncomplete="${inst.id}">${doneBtnLabel}</button>`
                    : pending
                      ? `<button class="big-btn ghost" disabled>ממתין</button>`
                      : `<button class="big-btn secondary" data-complete="${inst.id}">סימון</button>`
                }
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
      launchConfettiFromButton(btn);
      await applyTaskCompletion(Number(btn.dataset.complete));
      render();
    });
  });

  app.querySelectorAll("[data-uncomplete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.uncomplete);
      if (!state.parentAuthorized) {
        await openParentGate(async () => {
          await resetTaskInstance(id);
          render();
        });
        return;
      }
      await resetTaskInstance(id);
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

  const tasks = await getTasksForRoutine(state.profileId, "homework");
  const instances = await getInstancesForDate(state.profileId, dateKey);
  const displayPointsByTaskId = await getTaskDisplayMap(tasks);

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>שיעורי בית</h1>
          <p class="muted">אנגלית, מתמטיקה וגאומטריה</p>
        </div>
        <button class="big-btn ghost" id="toHome">היום שלי</button>
      </div>
      <div class="list">
      ${tasks
      .map((task) => {
        const inst = instances.find((i) => i.taskId === task.id);
        const isDone = inst?.status === "approved";
        const isPending = inst?.status === "pending_approval";
        const doneBtnClass = state.parentAuthorized ? "warn" : "ghost";
        const doneBtnLabel = state.parentAuthorized ? "בטל" : "בטל (הורה)";
        return `
            <article class="task-item ${isDone ? "done" : isPending ? "pending" : ""}">
              <div>
                  <h3>${task.icon} ${task.title}</h3>
                  <div class="task-meta">
                  <span>${numLtr(displayPointsByTaskId[task.id] || 0)} נק'</span>
                  ${statusTag(inst?.status || "pending")}
                </div>
              </div>
              ${
                isDone
                  ? `<button class="big-btn ${doneBtnClass}" data-uncomplete="${inst.id}">${doneBtnLabel}</button>`
                  : isPending
                    ? `<button class="big-btn ghost" disabled>ממתין</button>`
                    : `<button class="big-btn secondary" data-complete="${inst.id}">סימון</button>`
              }
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
      launchConfettiFromButton(btn);
      await applyTaskCompletion(Number(btn.dataset.complete));
      render();
    });
  });

  app.querySelectorAll("[data-uncomplete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.uncomplete);
      if (!state.parentAuthorized) {
        await openParentGate(async () => {
          await resetTaskInstance(id);
          render();
        });
        return;
      }
      await resetTaskInstance(id);
      render();
    });
  });

  bindNav();
}

function ensureLearnModuleState(modules) {
  for (const module of modules) {
    if (!state.learnQuestions[module.id]) {
      state.learnQuestions[module.id] = module.generate();
    }
    if (!state.learnStats[module.id]) {
      state.learnStats[module.id] = { correct: 0, total: 0 };
    }
  }
}

async function renderLearnPlay() {
  const profile = await getProfile();
  const wallet = await getById("wallets", `wallet_${state.profileId}`);
  const modules = profile.age >= 9 ? LEARN_MODULES_OLDER : LEARN_MODULES_YOUNGER;
  ensureLearnModuleState(modules);
  const learnSummary = await getLearnSummary(state.profileId, dateKey);

  app.innerHTML = `
    <section class="screen">
      <div class="card row">
        <div>
          <h1>📚 לימודים ומשחקים</h1>
          <p class="muted">${profile.age >= 9 ? "תוכן מותאם גיל 10+" : "תוכן מותאם גיל 4-5"}</p>
        </div>
        <button class="big-btn ghost" id="learnToHome">היום שלי</button>
      </div>

      <div class="card">
        <h3>ניקוד לימודים</h3>
        <p class="points">${ratioLtr(learnSummary.daily, learnSummary.dailyCap)}</p>
        <p class="muted">שבועי לימודים: ${ratioLtr(learnSummary.weekly, learnSummary.weeklyCap)}</p>
        <p class="muted">חודשי לימודים: ${ratioLtr(learnSummary.monthly, learnSummary.monthlyCap)}</p>
        <p class="muted">יתרת לימודים מצטברת: ${numLtr(wallet?.balanceLearn || 0)}</p>
      </div>

      <div class="learn-grid">
        ${modules
      .map((module) => {
        const q = state.learnQuestions[module.id];
        const stats = state.learnStats[module.id];
        return `
            <article class="card learn-card">
              <div class="row">
                <h3>${module.icon} ${module.title}</h3>
                <span class="tag ok">${ratioLtr(stats.correct, stats.total)} נכון</span>
              </div>
              <p class="muted">${module.subtitle}</p>
              <p class="learn-question">${q.prompt}</p>
              <div class="learn-options">
                ${q.options
              .map(
                (opt) =>
                  `<button class="big-btn secondary learn-option-btn" data-learn-answer="${module.id}" data-value="${String(opt)}">${
                    typeof opt === "number" ? numLtr(opt) : opt
                  }</button>`
              )
              .join("")}
              </div>
            </article>
          `;
      })
      .join("")}
      </div>
    </section>
    ${bottomNav(profile.age >= 9)}
  `;

  document.getElementById("learnToHome").addEventListener("click", () => {
    state.screen = "home";
    render();
  });

  app.querySelectorAll("[data-learn-answer]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const moduleId = btn.dataset.learnAnswer;
      const module = modules.find((m) => m.id === moduleId);
      if (!module) return;
      const answer = state.learnQuestions[moduleId].answer;
      const chosen = btn.dataset.value;
      const isCorrect = String(answer) === String(chosen);
      state.learnStats[moduleId].total += 1;
      if (isCorrect) {
        state.learnStats[moduleId].correct += 1;
        const awarded = await addTransaction(
          state.profileId,
          "earn",
          LEARN_POINTS_PER_CORRECT,
          "learn",
          `לימודים: ${module.title}`,
          { scoreDate: dateKey }
        );
        launchConfettiFromButton(btn);
        if (awarded > 0) {
          toast(`נכון! +${awarded} נק' לימודים`);
        } else {
          toast("נכון! הגעת לתקרת ניקוד לימודים היומית");
        }
      } else {
        toast(`כמעט! התשובה הנכונה: ${answer}`);
      }
      state.learnQuestions[moduleId] = module.generate();
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
          <p class="muted">יתרת משימות לתגמולים</p>
          <p class="points">${numLtr(wallet?.balanceDaily || 0)}</p>
          <p class="muted">יתרת לימודים נשמרת בנפרד: ${numLtr(wallet?.balanceLearn || 0)}</p>
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
                  <div class="task-meta"><span>${numLtr(r.cost)} נק'</span> ${r.requiresApproval ? "<span>• דורש אישור הורה</span>" : ""}</div>
                </div>
                <button class="big-btn" data-redeem="${r.id}" ${(wallet?.balanceDaily || 0) < r.cost ? "disabled" : ""}>מימוש</button>
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

async function openParentGate(afterAuthAction = null) {
  state.afterParentAuthAction = typeof afterAuthAction === "function" ? afterAuthAction : null;
  pinInput.value = "";
  pinError.textContent = "";
  pinDialog.showModal();
}

pinDialog.addEventListener("close", () => {
  // Prevent stale callbacks from blocking later admin login attempts.
  if (!state.parentAuthorized) {
    state.afterParentAuthAction = null;
  }
});

pinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await ensureGlobalSettings();
  const global = await getById("settings", "global");
  const plainPin = pinInput.value.trim();
  const entered = await sha256(plainPin);
  const defaultHash = await sha256("1234");
  const isDefaultRecovery = plainPin === "1234" && global.parentPinHash !== defaultHash;
  if (entered !== global.parentPinHash && !isDefaultRecovery) {
    pinError.textContent = "PIN שגוי";
    return;
  }
  if (isDefaultRecovery) {
    await put("settings", { ...global, parentPinHash: defaultHash });
    toast("בוצע שחזור PIN לברירת מחדל (1234)");
  }

  state.parentAuthorized = true;
  pinDialog.close();
  if (typeof state.afterParentAuthAction === "function") {
    const action = state.afterParentAuthAction;
    state.afterParentAuthAction = null;
    try {
      await action();
      return;
    } catch (error) {
      console.error("Parent action failed after auth:", error);
    }
  }
  state.afterParentAuthAction = null;
  state.screen = "admin";
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
  const tasksMap = new Map(tasks.map((t) => [t.id, t]));
  const todayInstances = instances
    .filter((i) => i.date === dateKey && ["approved", "pending_approval", "rejected"].includes(i.status))
    .sort((a, b) => {
      const ta = tasksMap.get(a.taskId);
      const tb = tasksMap.get(b.taskId);
      return (ta?.order || 0) - (tb?.order || 0);
    });
  const doneTodayInstances = todayInstances.filter((i) => i.status !== "pending");

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

      <div class="card">
        <h3>ביטול סימון שבוצע (היום)</h3>
        <div class="list">
          ${doneTodayInstances
      .map((inst) => {
        const task = tasksMap.get(inst.taskId);
        return `<div class="task-item admin-reset-row">
                <div>
                  <h3>${task?.icon || "✅"} ${task?.title || "משימה"}</h3>
                  <div class="task-meta"><span>${statusLabel(inst.status)}</span></div>
                </div>
                <button class="big-btn warn" data-reset-instance="${inst.id}">ביטול סימון</button>
              </div>`;
      })
      .join("") || "<p class='muted'>אין סימונים שבוצעו היום</p>"}
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
  app.querySelectorAll("[data-reset-instance]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      await resetTaskInstance(Number(btn.dataset.resetInstance));
      render();
    })
  );

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
    await ensureInstances(profileId, dateKey);
    await recomputeDailyScores(profileId, dateKey);
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
    const profiles = await getAll("profiles");
    for (const profile of profiles) {
      await ensureInstances(profile.id, dateKey);
      await recomputeWallet(profile.id);
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
  dateKey = todayISO();
  if (!state.profileId && state.screen !== "admin") state.screen = "profiles";

  if (state.profileId) await ensureInstances(state.profileId, dateKey);

  if (state.screen === "profiles") return renderProfiles();
  if (state.screen === "home") return renderHome();
  if (state.screen === "routine") return renderRoutine();
  if (state.screen === "learn") return renderLearnPlay();
  if (state.screen === "rewards") return renderRewards();
  if (state.screen === "homework") return renderHomework();
  if (state.screen === "admin") return renderAdmin();
}

async function bootstrap() {
  state.db = await openDB();
  await seedIfNeeded();
  await ensureGlobalSettings();
  await enforceProfileNames();
  await enforceTaskApprovalDefaults();
  await ensureHomeworkSplitForSophia();
  const profiles = await getAll("profiles");
  for (const profile of profiles) {
    await ensureInstances(profile.id, dateKey);
    await recomputeDailyScores(profile.id, dateKey);
    await recomputeWallet(profile.id);
  }
  await render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=18");
  }
}

bootstrap();
