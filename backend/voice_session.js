/** 횟수와 무응답 시간으로 제한된 브라우저 음성 대화. 시작 클릭 없이 재생/녹음하지 않는다. */

/** 최종 전사를 기다린다. promptAfterSeconds까지 발화/결과가 없으면 빈 문자열로 유도 질문을 요청한다. */
export function listenForReply(signal, silenceSeconds, onTranscript, onListening = () => {}, options = {}) {
  return new Promise((resolve, reject) => {
    const log = options.log || (() => {});
    const Engine = window.SpeechRecognition || window.webkitSpeechRecognition;
    log(`engine=${window.SpeechRecognition ? 'SpeechRecognition' : window.webkitSpeechRecognition ? 'webkitSpeechRecognition' : 'unsupported'} · online=${navigator.onLine} · secure=${window.isSecureContext}`);
    if (!Engine) { reject(new Error('이 브라우저는 음성 인식을 지원하지 않아요. 같은 입력칸에 직접 입력하거나 기기의 키보드 받아쓰기로 대화를 이어갈 수 있어요.')); return; }
    let engine, retry, quietTimer, speechTimer, promptTimer, done = false, text = '', failed = false, speaking = false;
    /** 타이머·이벤트를 정리하고 현재 녹음만 중단한다. 늦은 콜백은 적용하지 않는다. */
    function finish(error, value) {
      if (done) return;
      done = true;
      log(error ? `finish error=${error.name}: ${error.message}` : `finish final_chars=${value?.length || 0}`);
      onListening(false);
      clearTimeout(retry); clearTimeout(quietTimer); clearTimeout(speechTimer); clearTimeout(promptTimer);
      signal.removeEventListener('abort', cancel);
      if (engine) {
        engine.onend = engine.onerror = engine.onresult = engine.onspeechstart = engine.onspeechend = engine.onaudiostart = engine.onaudioend = engine.onstart = engine.onnomatch = engine.onsoundstart = engine.onsoundend = null;
        try { engine.abort(); } catch { /* 이미 종료된 엔진 */ }
      }
      error ? reject(error) : resolve(value);
    }
    /** 명시적 중지/화면이동은 빈 전사를 보내지 않고 즉시 종료한다. */
    function cancel() { finish(new DOMException('Stopped', 'AbortError')); }
    /** 말하지 않는 동안만 타이머를 적용한다. 발화 중에는 별도 60초 상한을 쓴다. */
    function waitForSpeech() {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(() => finish(new Error(`${options.totalSilenceSeconds || silenceSeconds}초 동안 인식된 답변이 없어 음성 대화를 마쳤어요. 직접 입력으로 이어갈 수 있어요.`)), silenceSeconds * 1000);
    }
    /** 브라우저가 no-speech로 일찍 닫으면 전체 무응답 타이머 안에서 다시 듣는다. */
    function begin() {
      if (done || signal.aborted) { cancel(); return; }
      engine = new Engine(); engine.lang = 'ko-KR'; engine.interimResults = options.interimResults !== false; engine.continuous = false;
      const attempt = engine;
      const requestedAt = performance.now();
      for (const name of ['start', 'nomatch', 'soundstart', 'soundend']) engine['on' + name] = () => { if (!done && attempt === engine) log(name); };
      engine.onaudiostart = () => { if (!done && !signal.aborted && attempt === engine) { log(`audiostart · start_to_audio_ms=${Math.round(performance.now() - requestedAt)}`); onListening(true); } };
      engine.onaudioend = () => { if (!done && !signal.aborted && attempt === engine) { log('audioend'); onListening(false); } };
      engine.onspeechstart = () => {
        if (done || attempt !== engine) return;
        speaking = true;
        clearTimeout(promptTimer);
        log('speechstart');
        onListening(true);
        clearTimeout(quietTimer);
        if (!speechTimer) speechTimer = setTimeout(() => finish(new Error('한 번에 60초까지 말할 수 있어요. 내용을 나누어 다시 시작해 주세요.')), 60000);
      };
      engine.onspeechend = () => { if (!done && attempt === engine) { log('speechend'); speaking = false; waitForSpeech(); } };
      engine.onresult = event => {
        if (done || signal.aborted || attempt !== engine) return;
        const items = Array.from(event.results);
        clearTimeout(promptTimer);
        text = items.filter(item => item.isFinal).map(item => item[0].transcript).join(' ').trim().slice(0, 1000);
        const interim = items.filter(item => !item.isFinal).map(item => item[0].transcript).join(' ').trim().slice(0, 1000);
        log(`result final_chars=${text.length} interim_chars=${interim.length} (내용 제외)`);
        options.onInterim?.(interim, text);
        if (text) onTranscript(text);
      };
      engine.onerror = event => {
        if (done || signal.aborted || attempt !== engine) return;
        log(`error=${event.error || 'unknown'} · ${event.message?.slice(0, 300) || '엔진 메시지 없음'}`);
        if (event.error === 'no-speech') return;
        failed = true;
        finish(new Error(`음성 인식을 계속하지 못했어요 (${event.error}). 연결·마이크를 확인하고 다시 시작해 주세요.`));
      };
      engine.onend = () => {
        if (done || failed || attempt !== engine) return;
        log(`end · final_chars=${text.length}`);
        onListening(false, text ? '' : 'no-result');
        if (text) { finish(null, text); return; }
        if (options.retryEmpty === false) { finish(new Error('인식 결과 없이 종료됐어요 (no-result). 이벤트 로그를 확인해 주세요.')); return; }
        if (speaking) { speaking = false; waitForSpeech(); }
        engine.onend = engine.onerror = engine.onresult = engine.onspeechstart = engine.onspeechend = engine.onaudiostart = engine.onaudioend = engine.onstart = engine.onnomatch = engine.onsoundstart = engine.onsoundend = null;
        log('retry in 500ms · no final result');
        retry = setTimeout(begin, 500);
      };
      try { log(`start() · lang=ko-KR · user_activation=${navigator.userActivation?.isActive}`); engine.start(); }
      catch (error) { finish(new Error(`마이크를 시작하지 못했어요 (${error.name}). 권한을 확인해 주세요.`)); }
    }
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) { cancel(); return; }
    waitForSpeech();
    if (options.promptAfterSeconds > 0 && options.promptAfterSeconds < silenceSeconds) {
      promptTimer = setTimeout(() => { log('initial silence · short prompt due'); finish(null, ''); }, options.promptAfterSeconds * 1000);
    }
    begin();
  });
}

/** AI 낭독 종료를 기다리고 본문 없이 요청/출력 시작/종료 시간을 기록한다. 중지 시 출력과 대기를 해제한다. */
export function readVoiceReply(text, signal, log = () => {}) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      reject(new Error('이 브라우저에서 답변을 읽을 수 없어 음성 대화를 멈췄어요. 텍스트로 이어가 주세요.')); return;
    }
    const speech = new SpeechSynthesisUtterance(text); speech.lang = 'ko-KR';
    const requestedAt = performance.now();
    let done = false, startedAt = null;
    /** 늦은 TTS 이벤트와 중복 종료를 차단한다. */
    function finish(error) {
      if (done) return;
      done = true; clearTimeout(timer); signal.removeEventListener('abort', cancel);
      speech.onstart = speech.onend = speech.onerror = null;
      log(`tts ${error ? 'stopped' : 'end'} · total_ms=${Math.round(performance.now() - requestedAt)} · playback_ms=${startedAt === null ? 'unknown' : Math.round(performance.now() - startedAt)}`);
      if (error) { speechSynthesis.cancel(); reject(error); } else resolve();
    }
    /** 중지 시 읽기도 함께 멈춘다. */
    function cancel() { finish(new DOMException('Stopped', 'AbortError')); }
    const timer = setTimeout(() => finish(new Error('답변 읽기가 끝나지 않아 대화를 멈췄어요. 화면의 안내를 확인해 주세요.')), 60000);
    signal.addEventListener('abort', cancel, { once: true });
    speech.onstart = () => {
      if (done || signal.aborted) return;
      startedAt = performance.now();
      log(`tts start · request_to_start_ms=${Math.round(startedAt - requestedAt)}`);
    };
    speech.onend = () => finish();
    speech.onerror = () => finish(new Error('답변을 읽지 못해 음성 대화를 멈췄어요. 텍스트로 이어가 주세요.'));
    if (signal.aborted) { cancel(); return; }
    speechSynthesis.cancel();
    try { log(`tts request · chars=${text.length} (내용 제외)`); speechSynthesis.speak(speech); } catch { finish(new Error('답변 읽기를 시작하지 못했어요.')); }
  });
}

/** 시작 1회로 듣기→해석→읽기를 반복한다. 세션 자체는 저장하거나 자동 재개하지 않는다. */
export class VoiceSession {
  constructor({ submit, onTranscript, onState, onLog = () => {}, onInterim = () => {} }) {
    this.submit = submit; this.onTranscript = onTranscript; this.onState = onState;
    this.onLog = onLog; this.onInterim = onInterim;
    this.controller = null; this.turns = 0; this.limit = 5;
  }
  /** 현재 실행 세션 유무. */
  get active() { return Boolean(this.controller); }
  /** 현재 세션만 취소한다. 중지 후 늦은 API/TTS/음성 결과로 재개하지 않는다. */
  stop(message = '음성 대화를 멈췄어요. 입력한 조건은 유지됩니다.') {
    if (!this.controller) return;
    const controller = this.controller; this.controller = null; controller.abort();
    this.onLog(`session stopped · ${message}`);
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
    const phase = (name, message) => { this.onLog(`phase=${name}`); this.onState({ active: true, phase: name, turns: this.turns, limit: maxTurns, message }); };
    try {
      if (initialPrompt) {
        phase('speaking', '인사하고 있어요. 소리가 안 들리면 스피커를 켜 주세요. ‘듣는 중’이 표시되면 말씀해 주세요.');
        await readVoiceReply(initialPrompt, signal, this.onLog);
        if (signal.aborted) return;
      }
      while (this.controller === controller && this.turns < maxTurns) {
        phase('starting', '마이크 연결을 기다려요. 권한 안내가 나오면 허용해 주세요.');
        this.onInterim('', '');
        /** 첫 무응답 유도와 일반 듣기가 같은 결과/중지 경계를 사용한다. */
        const listen = (seconds, options = {}) => listenForReply(signal, seconds, this.onTranscript, (listening, reason) => {
          if (this.controller !== controller || signal.aborted) return;
          phase(listening ? 'listening' : 'starting', listening ? `듣고 있어요. 지금 말씀해 주세요. ${silenceSeconds}초 동안 답변이 없으면 마칩니다.`
            : reason === 'no-result' ? '인식된 문장이 없어 다시 듣습니다. 직접 입력으로도 대화할 수 있어요.' : '마이크 연결을 기다리고 있어요.');
        }, { ...options, totalSilenceSeconds: silenceSeconds, log: this.onLog, onInterim: (interim, confirmed) => {
          if (this.controller === controller && !signal.aborted) this.onInterim(interim, confirmed);
        } });
        let text = await listen(silenceSeconds, this.turns === 0 ? { promptAfterSeconds: 3 } : {});
        if (signal.aborted) return;
        if (!text) {
          phase('speaking', '어떤 나들이를 원하세요?');
          await readVoiceReply('어떤 나들이를 원하세요?', signal, this.onLog);
          if (signal.aborted) return;
          phase('starting', '답변을 기다려요. ‘듣는 중’이 표시되면 말씀해 주세요.');
          text = await listen(silenceSeconds - 3);
        }
        if (signal.aborted) return;
        phase('thinking', '말씀하신 조건을 확인하고 있어요…');
        const result = await this.submit(text, signal);
        if (signal.aborted) return;
        if (!result?.assistant_text) throw new Error('대화 응답을 확인하지 못해 자동 대화를 멈췄어요. 화면 안내를 확인해 주세요.');
        this.turns++;
        phase('speaking', '답변을 읽고 있어요. 읽기가 끝나면 다시 듣습니다.');
        await readVoiceReply(result.assistant_text, signal, this.onLog);
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
