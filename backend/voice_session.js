/** 횟수와 무응답 시간으로 제한된 브라우저 음성 대화. 시작 클릭 없이 재생/녹음하지 않는다. */

/** 한 응답을 기다린다. no-speech로 엔진이 일찍 끝나도 설정한 무응답 기한은 유지한다. */
export function listenForReply(signal, silenceSeconds, onTranscript) {
  return new Promise((resolve, reject) => {
    const Engine = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Engine) { reject(new Error('Chrome에서 음성 대화를 시작해 주세요. 이 브라우저는 음성 인식을 지원하지 않아요.')); return; }
    let engine, retry, quietTimer, speechTimer, done = false, text = '', failed = false, speaking = false;
    /** 타이머·이벤트를 정리하고 현재 녹음만 중단한다. 늦은 콜백은 적용하지 않는다. */
    function finish(error, value) {
      if (done) return;
      done = true;
      clearTimeout(retry); clearTimeout(quietTimer); clearTimeout(speechTimer);
      signal.removeEventListener('abort', cancel);
      if (engine) {
        engine.onend = engine.onerror = engine.onresult = engine.onspeechstart = engine.onspeechend = null;
        try { engine.abort(); } catch { /* 이미 종료된 엔진 */ }
      }
      error ? reject(error) : resolve(value);
    }
    /** 명시적 중지/화면이동은 빈 전사를 보내지 않고 즉시 종료한다. */
    function cancel() { finish(new DOMException('Stopped', 'AbortError')); }
    /** 말하지 않는 동안만 타이머를 적용한다. 발화 중에는 별도 60초 상한을 쓴다. */
    function waitForSpeech() {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(() => finish(new Error(`${silenceSeconds}초 동안 답변이 없어 음성 대화를 마쳤어요.`)), silenceSeconds * 1000);
    }
    /** 브라우저가 no-speech로 일찍 닫으면 전체 무응답 타이머 안에서 다시 듣는다. */
    function begin() {
      if (done || signal.aborted) { cancel(); return; }
      engine = new Engine(); engine.lang = 'ko-KR'; engine.interimResults = false; engine.continuous = false;
      const attempt = engine;
      engine.onspeechstart = () => {
        if (done || attempt !== engine) return;
        speaking = true;
        clearTimeout(quietTimer);
        if (!speechTimer) speechTimer = setTimeout(() => finish(new Error('한 번에 60초까지 말할 수 있어요. 내용을 나누어 다시 시작해 주세요.')), 60000);
      };
      engine.onspeechend = () => { if (!done && attempt === engine) { speaking = false; waitForSpeech(); } };
      engine.onresult = event => {
        if (done || signal.aborted || attempt !== engine) return;
        text = Array.from(event.results).filter(item => item.isFinal).map(item => item[0].transcript).join(' ').trim().slice(0, 1000);
        if (text) onTranscript(text);
      };
      engine.onerror = event => {
        if (done || signal.aborted || attempt !== engine || event.error === 'no-speech') return;
        failed = true;
        finish(new Error(`음성 인식을 계속하지 못했어요 (${event.error}). 연결·마이크를 확인하고 다시 시작해 주세요.`));
      };
      engine.onend = () => {
        if (done || failed || attempt !== engine) return;
        if (text) { finish(null, text); return; }
        if (speaking) { speaking = false; waitForSpeech(); }
        engine.onend = engine.onerror = engine.onresult = engine.onspeechstart = engine.onspeechend = null;
        retry = setTimeout(begin, 500);
      };
      try { engine.start(); } catch { finish(new Error('마이크를 시작하지 못했어요. Chrome의 마이크 권한을 확인해 주세요.')); }
    }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    waitForSpeech(); begin();
  });
}

/** AI 답변 낭독이 끝난 뒤에만 다음 마이크를 열 수 있도록 종료를 기다린다. */
export function readVoiceReply(text, signal) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      reject(new Error('이 브라우저에서 답변을 읽을 수 없어 음성 대화를 멈췄어요. 텍스트로 이어가 주세요.')); return;
    }
    const speech = new SpeechSynthesisUtterance(text); speech.lang = 'ko-KR';
    let done = false;
    /** 늦은 TTS 이벤트와 중복 종료를 차단한다. */
    function finish(error) {
      if (done) return;
      done = true; clearTimeout(timer); signal.removeEventListener('abort', cancel);
      speech.onend = speech.onerror = null;
      if (error) { speechSynthesis.cancel(); reject(error); } else resolve();
    }
    /** 중지 시 읽기도 함께 멈춘다. */
    function cancel() { finish(new DOMException('Stopped', 'AbortError')); }
    const timer = setTimeout(() => finish(new Error('답변 읽기가 끝나지 않아 대화를 멈췄어요. 화면의 안내를 확인해 주세요.')), 60000);
    signal.addEventListener('abort', cancel, { once: true });
    speech.onend = () => finish();
    speech.onerror = () => finish(new Error('답변을 읽지 못해 음성 대화를 멈췄어요. 텍스트로 이어가 주세요.'));
    if (signal.aborted) { cancel(); return; }
    speechSynthesis.cancel();
    try { speechSynthesis.speak(speech); } catch { finish(new Error('답변 읽기를 시작하지 못했어요.')); }
  });
}

/** 시작 1회로 듣기→해석→읽기를 반복한다. 세션 자체는 저장하거나 자동 재개하지 않는다. */
export class VoiceSession {
  constructor({ submit, onTranscript, onState }) {
    this.submit = submit; this.onTranscript = onTranscript; this.onState = onState;
    this.controller = null; this.turns = 0; this.limit = 5;
  }
  /** 현재 실행 세션 유무. */
  get active() { return Boolean(this.controller); }
  /** 현재 세션만 취소한다. 중지 후 늦은 API/TTS/음성 결과로 재개하지 않는다. */
  stop(message = '음성 대화를 멈췄어요. 입력한 조건은 유지됩니다.') {
    if (!this.controller) return;
    const controller = this.controller; this.controller = null; controller.abort();
    this.onState({ active: false, phase: 'idle', turns: this.turns, limit: this.limit, message });
  }
  /** 유효한 설정으로만 시작하며 횟수/준비/동의/좌표 선택/오류 중 먼저 만나는 조건에서 끝난다. */
  async start({ maxTurns, silenceSeconds, initialPrompt = '' }) {
    if (this.active) return;
    if (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 10 || !Number.isInteger(silenceSeconds) || silenceSeconds < 5 || silenceSeconds > 60) {
      this.onState({ active: false, phase: 'idle', turns: 0, limit: maxTurns, message: '대화 횟수는 1~10회, 무응답 시간은 5~60초로 설정해 주세요.' }); return;
    }
    const controller = new AbortController(); this.controller = controller; this.turns = 0; this.limit = maxTurns;
    const signal = controller.signal;
    /** 각 단계는 같은 세션에서만 화면에 반영한다. */
    const phase = (name, message) => this.onState({ active: true, phase: name, turns: this.turns, limit: maxTurns, message });
    try {
      if (initialPrompt) {
        phase('speaking', 'AI가 먼저 질문해요. 안내가 끝나면 말씀해 주세요.');
        await readVoiceReply(initialPrompt, signal);
        if (signal.aborted) return;
      }
      while (this.controller === controller && this.turns < maxTurns) {
        phase('listening', `듣고 있어요. ${silenceSeconds}초 동안 답변이 없으면 마칩니다.`);
        const text = await listenForReply(signal, silenceSeconds, this.onTranscript);
        if (signal.aborted) return;
        phase('thinking', '말씀하신 조건을 확인하고 있어요…');
        const result = await this.submit(text, signal);
        if (signal.aborted) return;
        if (!result?.assistant_text) throw new Error('대화 응답을 확인하지 못해 자동 대화를 멈췄어요. 화면 안내를 확인해 주세요.');
        this.turns++;
        phase('speaking', '답변을 읽고 있어요. 읽기가 끝나면 다시 듣습니다.');
        await readVoiceReply(result.assistant_text, signal);
        if (signal.aborted) return;
        if (result.end_session) { this.stop('요청하신 대화를 마쳤어요.'); return; }
        if (result.conflicts?.length) { this.stop('변경할 조건을 화면에서 확인해 주세요. 자동 대화를 멈췄어요.'); return; }
        if (result.ready_to_search) { this.stop('조건이 준비됐어요. 화면에서 확인하고 추천받기를 눌러 주세요.'); return; }
        const draft = result.updated_condition_draft;
        if (draft?.start_query && !draft.start_location) { this.stop('출발지 검색 결과에서 장소를 골라 주세요. 선택 후 음성 대화를 다시 시작할 수 있어요.'); return; }
      }
      if (this.controller === controller) this.stop(`설정한 ${maxTurns}회 대화를 마쳤어요. 입력 조건을 확인하거나 다시 시작해 주세요.`);
    } catch (error) {
      if (this.controller === controller) this.stop(error.name === 'AbortError' ? '음성 대화를 멈췄어요.' : error.message);
    }
  }
}
