/** 실제 마이크 PCM 입력의 RMS/dBFS를 측정한다. 원본 음성 저장/전송·스피커 재생은 하지 않는다. */
export class MicrophoneMeter {
  constructor(onUpdate) {
    this.onUpdate = onUpdate; this.context = null; this.stream = null; this.source = null;
    this.analyser = null; this.timer = null; this.version = 0; this.pending = false;
    this.baselineDb = null; this.peakDb = -60; this.calibrationUntil = 0; this.calibrationSamples = [];
  }
  /** 사용자 클릭 안에서 오디오 컨텍스트를 준비한다. 아직 마이크 권한을 요청하지 않는다. */
  async prepare() {
    const Engine = window.AudioContext || window.webkitAudioContext;
    if (!Engine) throw new Error('이 브라우저에서 입력 미터를 지원하지 않아요.');
    this.context ||= new Engine();
    if (this.context.state === 'suspended') await this.context.resume();
  }
  /** 허용된 실제 입력 스트림을 분석기에 연결한다. 늦게 온 권한 결과는 즉시 종료한다. */
  async start() {
    if (this.stream || this.pending) return;
    const mine = ++this.version; this.pending = true;
    this.baselineDb = null; this.peakDb = -60; this.calibrationUntil = 0; this.calibrationSamples = [];
    this.onUpdate({ state: 'waiting', percent: 0, db: -60, message: '마이크 입력 권한을 확인하고 있어요.' });
    try {
      await this.prepare();
      if (mine !== this.version) return;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('보안 연결에서 마이크 입력을 확인해 주세요.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (mine !== this.version) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser(); this.analyser.fftSize = 1024;
      this.source.connect(this.analyser);
      const samples = new Float32Array(this.analyser.fftSize);
      const label = stream.getAudioTracks()[0]?.label || '기본 마이크';
      /** 100ms마다 실제 샘플에서 값을 계산한다. 음성 인식 결과와는 별도 지표다. */
      const measure = () => {
        if (mine !== this.version || !this.analyser) return;
        this.analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((total, value) => total + value * value, 0) / samples.length);
        const db = Math.max(-60, Math.min(0, 20 * Math.log10(Math.max(rms, 0.001))));
        this.peakDb = Math.max(this.peakDb, db);
        const calibrating = this.calibrationUntil > performance.now();
        if (calibrating) this.calibrationSamples.push(db);
        else if (this.calibrationUntil) {
          this.calibrationSamples.sort((a, b) => a - b);
          this.baselineDb = this.calibrationSamples[Math.floor(this.calibrationSamples.length / 2)] ?? null;
          this.calibrationUntil = 0;
        }
        this.onUpdate({ state: 'measuring', rms, db: Math.round(db), peakDb: Math.round(this.peakDb), baselineDb: this.baselineDb === null ? null : Math.round(this.baselineDb),
          deltaDb: this.baselineDb === null ? null : Math.round(db - this.baselineDb), calibrating,
          percent: Math.round((db + 60) * 100 / 60), label,
          message: calibrating ? '2초 동안 조용히 있어 주세요. 배경 입력을 측정해요.' : db > -50 ? '입력 신호가 있어요. 잡음인지 말소리인지는 이 수치만으로 확정할 수 없어요.' : '입력이 매우 작거나 없어요. 마이크 선택·음소거를 확인해 주세요.' });
      };
      measure(); this.timer = setInterval(measure, 100);
    } catch (error) {
      if (mine !== this.version) return;
      this.release();
      this.onUpdate({ state: 'error', percent: 0, db: -60,
        message: error.name === 'NotAllowedError' ? '마이크 입력 권한이 거절됐어요. 브라우저·Windows 마이크 설정을 확인해 주세요.' : error.message });
    } finally { if (mine === this.version) this.pending = false; }
  }
  /** 분석기·마이크 트랙만 해제한다. 오디오를 재생하거나 파일로 만들지 않는다. */
  release() {
    clearInterval(this.timer); this.timer = null;
    this.source?.disconnect(); this.source = null; this.analyser = null;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
  }
  /** 사용자가 조용한 상태에서 요청한 2초 중앙값을 배경 입력 기준으로 삼는다. 말소리 판정은 하지 않는다. */
  calibrate() {
    if (!this.stream) return;
    this.calibrationSamples = []; this.calibrationUntil = performance.now() + 2000; this.peakDb = -60;
  }
  /** 미완료 권한 요청도 무효화한다. 종료 후 늦은 스트림이 미터를 다시 켜지 않는다. */
  stop(message = '입력 미터 꺼짐') {
    this.version++; this.pending = false; this.release();
    this.onUpdate({ state: 'stopped', percent: 0, db: -60, message });
  }
  /** 화면을 닫을 때 남아 있는 오디오 컨텍스트도 종료한다. */
  dispose() { this.stop(); this.context?.close().catch(() => {}); this.context = null; }
}

/** 실제 레벨과 진단 문구를 표시하는 독립 입력 점검 미터. 음성 인식과 동시 캡처하지 않는다. */
export function mountInputMeter(container) {
  container.classList.add('microphone-meter');
  container.innerHTML = `<strong>실제 마이크 입력</strong><div class="meter-segments" role="meter" aria-label="마이크 입력 레벨" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${'<i></i>'.repeat(12)}</div><canvas class="meter-wave" width="600" height="120" role="img" aria-label="최근 10초 입력 크기 변화"></canvas><p class="meter-wave-note">최근 10초 · 미터를 켜면 실제 입력 파형이 흐릅니다.</p><p class="meter-value">입력 0% · -60 dBFS 이하</p><p class="meter-comparison">배경 기준 미측정</p><p class="meter-status" role="status">입력 미터 꺼짐</p><p class="meter-device"></p><button type="button" class="meter-test">마이크 소리만 점검</button><button type="button" class="meter-calibrate" disabled>조용할 때 기준 측정(2초)</button><p class="meter-note">자동 음량·잡음 보정 해제를 요청해 측정해요. 잡음도 파형에 표시되며, 문장 인식 성공을 뜻하지 않아요.</p>`;
  if (!document.querySelector('#microphone-meter-style')) {
    const style = document.createElement('style'); style.id = 'microphone-meter-style';
    style.textContent = '.microphone-meter{padding:16px;border:1px solid #9ab6a6;border-radius:12px;margin:14px 0;background:#f6faf7;font-size:17px;line-height:1.6;overflow-wrap:anywhere}.microphone-meter strong{font-size:19px}.meter-segments{display:flex;gap:4px;height:28px;margin:12px 0}.meter-segments i{flex:1;min-width:0;border-radius:3px;background:#d8e2dc}.meter-segments i.on{background:#267344}.meter-segments i.on:nth-child(n+10){background:#b77812}.meter-segments i.on:nth-child(n+12){background:#ba3838}.meter-value{font-size:20px;font-weight:750;margin:8px 0}.meter-status,.meter-device,.meter-note,.meter-comparison{font-size:17px;margin:8px 0}.meter-test,.meter-calibrate{min-height:48px;padding:12px;font:inherit;border:1px solid #537a65;border-radius:10px;background:white;color:#244b36;width:100%;margin:4px 0}';
    document.head.append(style);
  }
  let lastMessage = '';
  const envelope = [];
  const canvas = container.querySelector('.meter-wave');
  canvas.style.cssText = 'width:100%;height:120px;display:block;background:#edf4f0;border:1px solid #b5c9bc;border-radius:8px';
  /** 실제 RMS의 최근100개(약10초)만 그린다. 샘플 갱신이 멈추면 그림도 흐르지 않는다. */
  function drawWave() {
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#bed0c4'; context.lineWidth = 1;
    context.beginPath(); context.moveTo(0, 60); context.lineTo(600, 60); context.stroke();
    context.strokeStyle = '#267344'; context.lineWidth = 3;
    envelope.forEach((rms, index) => {
      const x = (100 - envelope.length + index) * 6 + 3;
      // 작은 입력도 보이도록 고정된 -60~0dBFS 눈금을 사용한다. 자동 증폭은 하지 않는다.
      const db = Math.max(-60, Math.min(0, 20 * Math.log10(Math.max(rms, 0.001))));
      const height = Math.max(1, (db + 60) * 56 / 60);
      context.beginPath(); context.moveTo(x, 60 - height); context.lineTo(x, 60 + height); context.stroke();
    });
    container.dataset.waveSamples = String(envelope.length);
  }
  drawWave();
  const meter = new MicrophoneMeter(value => {
    container.dataset.state = value.state;
    container.querySelector('[role="meter"]').setAttribute('aria-valuenow', String(value.percent));
    container.querySelectorAll('.meter-segments i').forEach((bar, index) => bar.classList.toggle('on', index < Math.ceil(value.percent * 12 / 100)));
    container.querySelector('.meter-value').textContent = `입력 ${value.percent}% · ${value.db} dBFS${value.db <= -60 ? ' 이하' : ''}`;
    container.querySelector('.meter-comparison').textContent = value.state === 'measuring' ? `최고 ${value.peakDb} dBFS · 배경 ${value.baselineDb ?? '미측정'}${value.baselineDb === null ? '' : ' dBFS'} · 기준 대비 ${value.deltaDb === null ? '미측정' : (value.deltaDb >= 0 ? '+' : '') + value.deltaDb + ' dB'}` : '배경 기준 미측정';
    container.querySelector('.meter-calibrate').disabled = value.state !== 'measuring' || value.calibrating;
    if (lastMessage !== value.message) { container.querySelector('.meter-status').textContent = value.message; lastMessage = value.message; }
    container.querySelector('.meter-device').textContent = value.label ? `장치: ${value.label}` : '';
    container.querySelector('.meter-test').textContent = ['measuring','waiting'].includes(value.state) ? '입력 미터 끄기' : '마이크 소리만 점검';
    if (value.state === 'waiting') { envelope.length = 0; drawWave(); }
    if (value.state === 'measuring') { envelope.push(value.rms); if (envelope.length > 100) envelope.shift(); drawWave(); }
    container.querySelector('.meter-wave-note').textContent = value.state === 'measuring' ? '최근 10초 · 실제 입력 크기(잡음 포함) · 고정 dB 눈금' : '파형 멈춤 · 입력 점검을 켜면 새로 시작합니다.';
  });
  container.querySelector('.meter-test').addEventListener('click', () => {
    if (meter.stream || meter.pending) meter.stop(); else void meter.start();
  });
  container.querySelector('.meter-calibrate').addEventListener('click', () => meter.calibrate());
  document.addEventListener('visibilitychange', () => { if (document.hidden) meter.stop(); });
  window.addEventListener('pagehide', () => meter.dispose());
  return meter;
}
