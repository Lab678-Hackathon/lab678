/**
 * 콘텐츠 설정 — Topic 교체 대상
 * 해커톤 주제가 바뀌면 이 파일을 먼저 수정한다.
 *
 * 금지: API 호출, DOM 조작, 판정 로직
 * 허용: 문자열, 메뉴 구조, 브랜드 정보
 */
export const CONTENT = {
  brand: {
    /** 서비스명 — index.html <title>에도 반영 */
    name: "AI Hackathon Framework",
    tagline: "Your AI-powered app, ready in hours.",
  },

  /**
   * 메뉴 정의. key = router.js에 등록한 이름과 일치.
   * 순서가 nav 표시 순서.
   */
  menu: {
    home: "Home",
    // 주제별 메뉴 추가:
    // discover: "Discover",
    // plan: "Plan",
  },

  copy: {
    /** AI 고지 문구 — 제거하지 않는다 */
    aiNotice: "AI-assisted results · unconfirmed details marked",
    /** 결과 없음 */
    empty: "No results found. Try adjusting your conditions.",
    /** 오류 */
    error: "Something went wrong. Please try again.",
    /** 비회원 로그인 유도 */
    loginPrompt: "Sign in to save your results and preferences.",
  },
};
