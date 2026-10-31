/** 기존 점검 화면에서도 실제 마이크 입력만 독립적으로 점검한다. STT 성공으로 표시하지 않는다. */
import { mountInputMeter } from './microphone-meter.js';
const target = document.querySelector('#preview-mic-meter');
if (target) {
  const meter = mountInputMeter(target);
  window.addEventListener('lab678-voice-test-start', () => { meter.dispose(); target.querySelector('.meter-test').disabled = true; });
  window.addEventListener('lab678-voice-test-end', () => { target.querySelector('.meter-test').disabled = false; });
}
