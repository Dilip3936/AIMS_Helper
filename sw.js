function minimalHeaders() {
  const h = new Headers();
  h.set("Accept", "*/*");
  return h;
}

async function fetchAndStoreGradeCatalog(studentId) {
  const url = `https://aims.iith.ac.in/aims/courseReg/loadStdCrsHistSrchFlds/${encodeURIComponent(studentId)}`;
  const res = await fetch(url, { method: "GET", headers: minimalHeaders(), credentials: "include" });
  if (!res.ok) {
    console.error("grade catalog fetch failed", res.status);
    return;
  }

  const json = await res.json().catch(() => null);
  if (!json || !Array.isArray(json.grades)) {
    console.error("grade catalog invalid payload");
    return;
  }

  const catalog = {};
  for (const g of json.grades) {
    if (g && typeof g.gradeId === "number" && typeof g.gradeDesc === "string") {
      catalog[String(g.gradeId)] = g.gradeDesc;
    }
  }
  await chrome.storage.local.set({ gradeCatalog: catalog });
}

function buildHistoryUrl({ studentId, gradeId }) {
  const base = "https://aims.iith.ac.in/aims/courseReg/loadMyCoursesHistroy";
  const gradeArrayJson = JSON.stringify([String(gradeId)]);
  const params = new URLSearchParams({
    studentId: String(studentId),
    courseCd: "",
    courseName: "",
    orderBy: "1",
    degreeIds: "",
    acadPeriodIds: "",
    regTypeIds: "",
    gradeIds: gradeArrayJson,
    resultIds: "",
    isGradeIds: ""
  });
  return `${base}?${params.toString()}`;
}

async function storeCourseGrades(gradeId, responseText) {
  let arr;
  try {
    arr = JSON.parse(responseText);
  } catch {
    console.error("history JSON parse failed");
    return;
  }

  const { gradeCatalog = {} } = await chrome.storage.local.get(["gradeCatalog"]);
  const gradeDesc = gradeCatalog[String(gradeId)] || `G${gradeId}`;

  const pairs = arr
    .filter(item => item && typeof item.courseCd === "string")
    .map(item => ({ courseCd: item.courseCd, gradeId, gradeDesc }));

  const { courseGradePairs = [] } = await chrome.storage.local.get(["courseGradePairs"]);
  const merged = [...courseGradePairs, ...pairs];

  const seen = new Set();
  const deduped = merged.filter(p => {
    const key = `${p.courseCd}::${p.gradeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await chrome.storage.local.set({ courseGradePairs: deduped });
}

async function fetchHistory({ studentId, gradeId }) {
  const url = buildHistoryUrl({ studentId, gradeId });
  const res = await fetch(url, { method: "GET", headers: minimalHeaders(), credentials: "include" });
  const text = await res.text().catch(() => "");
  if (res.ok) {
    await storeCourseGrades(gradeId, text);
  } else {
    console.error("history fetch failed", gradeId, res.status);
  }
}
async function runGradeFetch(studentId) {
  await fetchAndStoreGradeCatalog(studentId);
  for (let i = 1; i <= 16; i++) {
    try {
      await fetchHistory({ studentId, gradeId: i });
    } catch (e) {
      console.error("history fetch error", i, e);
    }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "RUN_GRADE_FETCH" && msg.studentId) {
    runGradeFetch(String(msg.studentId))
      .then(() => sendResponse({ ok: true }))
      .catch(err => {
        console.error("grade fetch run failed", err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true; 
  }
});