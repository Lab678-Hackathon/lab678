/**
 * AI 대화 연결이 없을 때 쓰는 규칙 기반 해석기.
 * 문장에서 관심사·날짜·시각·출발지 이름만 뽑아요. 확실하지 않으면 비워 두고 까치가 다시 물어봐요.
 * (좌표는 만들지 않아요. 출발지 이름은 장소 검색이나 현재 위치로만 좌표가 정해져요.)
 */
import { todayIso, minutes, hhmm } from './util.js';

const CATEGORY_WORDS = [
  ['국악', /국악|판소리|가야금|사물놀이|민요/],
  ['클래식', /클래식|오케스트라|교향|피아노|바이올린|실내악/],
  ['콘서트', /콘서트|가수|밴드|재즈/],
  ['연극', /연극|마당극/],
  ['체험', /체험|배우|만들기|클래스|강좌|수업|교육|공방/],
  ['축제', /축제|행사|페스티벌|장터|마켓|야시장/],
  ['공연', /공연|뮤지컬|무용|음악|노래|극장|무대/],
  ['전시', /전시|미술|그림|박물관|갤러리|사진전|작품|미술관|공예/],
  ['전체', /아무거나|뭐든|다 좋|상관없|전체|아무 데나|골고루/],
];

const WEEK = '일월화수목금토';

/** 오전/오후 표시가 없을 때 나들이 시간대로 보정 (1~7시는 오후로) */
function to24(h, ap) {
  if (ap === '오후' || ap === '저녁' || ap === '밤') return h < 12 ? h + 12 : h;
  if (ap === '오전' || ap === '아침') return h; // '오전 10시부터 12시까지'의 12시는 낮 12시
  if (ap === '낮') return h < 7 ? h + 12 : h;
  return h >= 1 && h <= 7 ? h + 12 : h;
}

/** "오후 2시 30분" / "2시 반" / "14시" / "14:30" 하나를 분으로 */
const TIME = /(오전|오후|아침|낮|저녁|밤)?\s*(\d{1,2})\s*(?:시|:)\s*(반|(\d{1,2})\s*분?)?/g;

/**
 * @param {string} text
 * @returns {{category?:string, date?:string, startTime?:string, endTime?:string, startQuery?:string, useHere?:boolean}}
 */
export function parseUtterance(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  const out = {};

  for (const [cat, re] of CATEGORY_WORDS) if (re.test(t)) { out.category = cat; break; }

  // 날짜
  if (/오늘/.test(t)) out.date = todayIso(0);
  else if (/내일/.test(t)) out.date = todayIso(1);
  else if (/모레/.test(t)) out.date = todayIso(2);
  const md = t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (md) {
    const y = Number(todayIso().slice(0, 4));
    out.date = `${y}-${String(md[1]).padStart(2, '0')}-${String(md[2]).padStart(2, '0')}`;
  } else {
    const wd = t.match(/(다음\s*주\s*)?([일월화수목금토])요일/);
    if (wd) {
      const now = new Date(`${todayIso()}T00:00:00+09:00`);
      let diff = (WEEK.indexOf(wd[2]) - now.getDay() + 7) % 7;
      if (wd[1]) diff += 7;
      out.date = todayIso(diff);
    }
  }

  // 시각: 처음 두 개를 시작·끝으로
  const times = [];
  let lastAp = null;
  for (const m of t.matchAll(TIME)) {
    const h = Number(m[2]);
    if (h > 24) continue;
    const ap = m[1] || lastAp;
    if (m[1]) lastAp = m[1];
    const mm = m[3] === '반' ? 30 : Number(m[4] || 0);
    times.push(to24(h, ap) * 60 + mm);
  }
  const now = new Date(Date.now() + 9 * 3600e3);
  const nowMin = now.getUTCHours() * 60 + Math.ceil(now.getUTCMinutes() / 10) * 10;
  if (/지금/.test(t) && !times.length) times.push(Math.min(nowMin, 22 * 60));
  const dur = t.match(/(\d{1,2})\s*시간/);
  if (times.length >= 2 && times[1] > times[0]) {
    out.startTime = hhmm(times[0]); out.endTime = hhmm(times[1]);
  } else if (times.length >= 1) {
    out.startTime = hhmm(times[0]);
    if (dur && !/\d\s*시\s*간/.test(t.replace(dur[0], ''))) out.endTime = hhmm(Math.min(times[0] + Number(dur[1]) * 60, 23 * 60 + 50));
  }
  if (/오후/.test(t) && !times.length) { out.startTime = '14:00'; out.endTime = '17:00'; }
  if (/오전/.test(t) && !times.length) { out.startTime = '10:00'; out.endTime = '12:00'; }

  // 출발지
  if (/현재\s*위치|지금\s*있는\s*곳|여기서/.test(t)) out.useHere = true;
  const from = t.match(/([가-힣A-Za-z0-9]*[가-힣](?:역|동|구|공원|시장|광장|대학교|학교|병원|아파트|센터))\s*(?:에서|부터)/);
  if (!out.useHere && from) out.startQuery = from[1];

  return out;
}

/** 나들이 시간이 60분 이상인지 */
export const longEnough = (s, e) => minutes(e) - minutes(s) >= 60;
