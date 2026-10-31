/**
 * S00 시작 화면: 계절에 맞는 그림을 고르고, 그림 영역에 잎(단풍잎·꽃잎)을 천천히 떨어뜨려요.
 * 움직임 줄이기 설정이면 잎을 만들지 않아요.
 */

const SHAPES = {
  maple: 'M12 1.5l1.7 4.3 3.5-1.7-1.1 4 4.2-.5-2.7 3.4 2.8 2.3-4.4.6.7 3.8-3.4-1.9L12 22.5l-1.3-6.7-3.4 1.9.7-3.8-4.4-.6 2.8-2.3-2.7-3.4 4.2.5-1.1-4 3.5 1.7z',
  petal: 'M12 2.5c1.2 1.6 1.6 1.2 2.8.4 2.4 3.6 3.4 7.4 2.2 11-.9 2.8-2.9 5-5 7.6-2.1-2.6-4.1-4.8-5-7.6-1.2-3.6-.2-7.4 2.2-11 1.2.8 1.6 1.2 2.8-.4z',
};

const SEASONS = {
  autumn: { shape: 'maple', colors: ['#D9542B', '#E8892E', '#C8402A', '#E9B23A'], art: 'assets/landing-autumn.jpg' },
  spring: { shape: 'petal', colors: ['#F6C6D3', '#F2AFC2', '#FADDE5', '#F8D2DC'], art: 'assets/landing-spring.jpg' },
};

/**
 * 오늘 날짜로 계절을 정해요. 시연용으로 주소 뒤에 ?season=spring|autumn|none 을 붙이면 그걸 따라요.
 * @param {Date} date
 * @returns {'spring'|'autumn'|null} 3~5월 봄, 9~11월 가을, 그 외에는 효과 없음
 */
export function pickSeason(date = new Date()) {
  const forced = new URLSearchParams(location.search).get('season');
  if (forced === 'none') return null;
  if (forced in SEASONS) return forced;
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 9 && month <= 11) return 'autumn';
  return null;
}

/**
 * 시작 화면 그림을 계절에 맞게 바꿔요. 효과가 없는 계절에는 가을 그림을 그대로 둬요.
 * @param {HTMLImageElement} img
 * @param {'spring'|'autumn'|null} season
 */
export function setSeasonArt(img, season) {
  if (season) img.src = SEASONS[season].art;
}

/**
 * 컨테이너 안에 잎을 만들어 떨어뜨려요. 위치·크기·속도는 잎마다 조금씩 달라요.
 * @param {HTMLElement} container .leaves 요소
 * @param {'spring'|'autumn'|null} season
 * @param {number} count 동시에 보이는 잎 개수 (8~12 권장)
 */
export function startLeaves(container, season, count = 10) {
  container.replaceChildren();
  if (!season || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const { shape, colors } = SEASONS[season];
  for (let i = 0; i < count; i += 1) {
    const leaf = document.createElement('span');
    leaf.className = 'leaf';
    const dur = 8 + Math.random() * 4; // 한 개가 떨어지는 데 8~12초
    leaf.style.setProperty('--x', `${Math.round(Math.random() * 92)}%`);
    leaf.style.setProperty('--size', `${14 + Math.round(Math.random() * 14)}px`);
    leaf.style.setProperty('--dur', `${dur.toFixed(1)}s`);
    leaf.style.setProperty('--delay', `${(-Math.random() * dur).toFixed(1)}s`); // 처음부터 여기저기 떠 있게
    leaf.style.setProperty('--op', (0.8 + Math.random() * 0.2).toFixed(2));
    leaf.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SHAPES[shape]}" fill="${colors[i % colors.length]}"/></svg>`;
    container.append(leaf);
  }
}
