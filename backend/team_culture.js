/** 문화정보 출처 선택·표시. 팀 복사본과 인계 패키지에서 사용하는 독립 모듈. */
import { state, save } from './state.js';

/** 공급자 사실과 날짜별 행사/상설시설을 구별하는 표시명. */
export function cultureLabel(value) {
  return value === 'tourapi_kor' || value === 'tour'
    ? '한국관광공사 · 문화시설' : '서울문화포털 · 전시·공연';
}

/** 입력 위치에 명시적 출처 선택을 추가한다. 조건 변경은 기존 확인 흐름을 다시 거친다. */
export function initCulture() {
  const category = document.querySelector('#s02 [data-field="category"]');
  if (!category || document.querySelector('#culture-source')) return;
  const box = document.createElement('div'); box.className = 'field';
  const label = document.createElement('label'); label.htmlFor = 'culture-source';
  label.textContent = '어떤 나들이를 찾을까요?';
  const select = document.createElement('select'); select.id = 'culture-source';
  for (const [value, text] of [['seoul', '전시·공연 일정'], ['tour', '도서관·박물관 등 문화시설']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
  }
  const note = document.createElement('p'); note.id = 'culture-source-note'; note.className = 'caption muted';
  box.append(label, select, note); category.before(box);
  /** 복원된 입력을 표시하고 문화시설 범위 밖 장르를 선택 가능한 것처럼 보이지 않는다. */
  function refresh() {
    select.value = state.form.cultureSource || 'seoul';
    const tour = select.value === 'tour';
    category.querySelectorAll('[data-category]').forEach(button => { button.disabled = tour && button.dataset.category !== '전체'; });
    note.textContent = tour
      ? '주변 문화시설을 전체 분류·장소 찾기로 조회해요. 행사 개최·운영일·요금은 확인이 필요해요. 실시간 조회만 지원해요.'
      : '선택한 날짜의 전시·공연 정보를 서울문화포털에서 찾아요.';
  }
  select.addEventListener('change', () => {
    state.form.cultureSource = select.value;
    state.confirmed = null;
    if (select.value === 'tour') {
      state.form.kind = 'place';
      document.querySelector('#s02 [data-category="전체"]').click();
    } else {
      document.querySelector(`#s02 [data-category="${CSS.escape(state.form.category || '전체')}"]`).click();
    }
    save(); refresh();
  });
  window.addEventListener('hashchange', refresh);
  refresh();
}

initCulture();
