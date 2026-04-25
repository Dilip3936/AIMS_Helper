function norm(txt) {
  return (txt || "").replace(/\u00A0/g, " ").trim();
}

const CODE_RE = /^[A-Z]{2,4}\s*\d{3,4}$/i;

function isGradeMissing(el) {
  if (!el) return true;
  const t = norm(el.textContent);
  return t === "" || t === "-" || t === "—";
}

function renderGrade(el, gradeText) {
  if (!el) return;
  el.textContent = ` ${gradeText}`;
  el.style.color = "green";
  el.style.fontSize = "large";
  el.style.fontWeight = "600";
}

function findCourseRows(root) {
  let rows = [...root.querySelectorAll("li.hierarchyLi.dataLi.tab_body_bg")];
  if (rows.length) return rows;

  rows = [...root.querySelectorAll("li.hierarchyLi.dataLi, li.dataLi, li.tab_body_bg")];
  if (rows.length) return rows;

  rows = [...root.querySelectorAll("li")].filter(li => {
    const spans = li.querySelectorAll("span");
    if (spans.length < 4) return false;
    const first = norm(spans[0]?.textContent);
    return CODE_RE.test(first);
  });
  return rows;
}

function getCells(li) {
  const code = li.querySelector("span.col1.col") || li.querySelector("span:nth-of-type(1)");
  const grade = li.querySelector("span.col8.col") || li.querySelector("span:nth-of-type(8)");
  return { codeSpan: code, gradeSpan: grade };
}

async function fillOnce() {
  const { courseGradePairs = [] } = await chrome.storage.local.get(["courseGradePairs"]);
  if (!Array.isArray(courseGradePairs) || courseGradePairs.length === 0) return;

  const byCourse = courseGradePairs.reduce((acc, p) => {
    const key = norm(p.courseCd);
    if (!key) return acc;
    (acc[key] ||= []).push(p);
    return acc;
  }, {});

  const rows = findCourseRows(document);
  let fills = 0;

  rows.forEach(li => {
    const { codeSpan, gradeSpan } = getCells(li);
    const code = norm(codeSpan?.textContent);
    if (!CODE_RE.test(code)) return;

    const entries = byCourse[code];
    if (!entries) return;

    if (isGradeMissing(gradeSpan)) {
      const last = entries[entries.length - 1];
      const display = last.gradeDesc || `G${last.gradeId}`;
      renderGrade(gradeSpan, display);
      fills++;
    }
  });
}

function init() {
  fillOnce();

  let attempts = 0;
  const retry = setInterval(() => {
    attempts++;
    fillOnce();
    if (attempts >= 5) clearInterval(retry);
  }, 1000);

  const observer = new MutationObserver((mutList) => {
    const added = mutList.some(m => Array.from(m.addedNodes).some(n =>
      n.nodeType === 1 && (n.matches?.("li") || n.querySelector?.("li"))
    ));
    if (added) fillOnce();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
