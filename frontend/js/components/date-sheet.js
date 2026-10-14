// 날짜 선택 바텀시트 — "Pick a date". 빠른 칩(Today/Tomorrow/This Sat/This Sun) + 월 그리드.
// 앱은 '오늘 기준'이지만 사용자가 가까운 날짜를 고를 수 있게 한다(과거는 비활성). 선택만 반환 —
// 좌표/사실을 만들지 않는다. onPick(ymd) 로 'YYYY-MM-DD' 를 넘긴다.
import { el, openSheet } from "./sheet.js";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const CHEVRON_L =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M15 5l-7 7 7 7"/></svg>';
const CHEVRON_R =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 5l7 7-7 7"/></svg>';

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfDay(d) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
function fmtLong(d) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// openDateSheet({ current: 'YYYY-MM-DD', onPick })
export function openDateSheet({ current, onPick } = {}) {
  const today = startOfDay(new Date());
  let selected = current ? startOfDay(new Date(`${current}T00:00`)) : new Date(today);
  if (selected < today) selected = new Date(today);
  let viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);

  return openSheet((close) => {
    const root = el("div", "date-sheet");
    root.append(el("h2", "sheet-title", "Pick a date"));

    // 빠른 칩 — Today / Tomorrow / This Sat / This Sun (해당 날짜로 점프·선택).
    const tomorrow = startOfDay(new Date(today.getTime() + 86400000));
    const nextDow = (dow) => {
      const d = startOfDay(new Date(today));
      const add = (dow - d.getDay() + 7) % 7; // 0=오늘이면 이번 주 그 요일(오늘 포함)
      d.setDate(d.getDate() + add);
      return d;
    };
    const quick = el("div", "date-quick");
    const quickDefs = [
      { label: "Today", date: new Date(today) },
      { label: "Tomorrow", date: tomorrow },
      { label: "This Sat", date: nextDow(6) },
      { label: "This Sun", date: nextDow(0) },
    ];
    for (const def of quickDefs) {
      const chip = el("button", "date-quick-chip", def.label);
      chip.type = "button";
      chip.addEventListener("click", () => {
        selected = def.date;
        viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
        paint();
      });
      quick.append(chip);
    }
    root.append(quick);

    // 월 헤더 + 이전/다음
    const monthRow = el("div", "date-month-row");
    const monthLabel = el("span", "date-month-label");
    const prev = el("button", "date-nav");
    prev.type = "button";
    prev.setAttribute("aria-label", "Previous month");
    prev.innerHTML = CHEVRON_L;
    const next = el("button", "date-nav");
    next.type = "button";
    next.setAttribute("aria-label", "Next month");
    next.innerHTML = CHEVRON_R;
    const navs = el("div", "date-navs");
    navs.append(prev, next);
    monthRow.append(monthLabel, navs);
    root.append(monthRow);

    // 요일 헤더
    const dow = el("div", "date-grid date-dow");
    for (const w of WEEKDAYS) dow.append(el("span", "date-dow-cell", w));
    root.append(dow);

    const grid = el("div", "date-grid date-days");
    root.append(grid);

    const selLabel = el("p", "date-selected");
    root.append(selLabel);

    const doneBtn = el("button", "btn-cta", "Done");
    doneBtn.type = "button";
    doneBtn.addEventListener("click", () => {
      onPick?.(ymd(selected));
      close();
    });
    root.append(doneBtn);

    // 이전 달이 오늘이 든 달보다 과거면 '이전' 비활성(과거 달 진입 금지).
    function canGoPrev() {
      const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      return first > new Date(today.getFullYear(), today.getMonth(), 1);
    }
    prev.addEventListener("click", () => {
      if (!canGoPrev()) return;
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
      paint();
    });
    next.addEventListener("click", () => {
      viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
      paint();
    });

    function paint() {
      monthLabel.textContent = viewMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      prev.disabled = !canGoPrev();
      selLabel.textContent = fmtLong(selected);
      for (const chip of quick.children) {
        const def = quickDefs.find((q) => q.label === chip.textContent);
        chip.classList.toggle("is-active", def && sameDay(def.date, selected));
      }
      grid.replaceChildren();
      const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
      const daysInMonth = new Date(
        viewMonth.getFullYear(),
        viewMonth.getMonth() + 1,
        0,
      ).getDate();
      for (let i = 0; i < first.getDay(); i++)
        grid.append(el("span", "date-cell is-empty"));
      for (let day = 1; day <= daysInMonth; day++) {
        const d = startOfDay(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
        const cell = el("button", "date-cell", String(day));
        cell.type = "button";
        if (d < today) {
          cell.disabled = true;
          cell.classList.add("is-past");
        } else {
          cell.addEventListener("click", () => {
            selected = d;
            paint();
          });
        }
        if (sameDay(d, today)) cell.classList.add("is-today");
        if (sameDay(d, selected)) cell.classList.add("is-selected");
        grid.append(cell);
      }
    }
    paint();
    return root;
  });
}
