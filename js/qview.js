// 문제 상자 채우기. 전투 화면과 사건 화면(보물, 휴식, 석상)이 같이 씁니다.
// 문제 문장, 그림, 그림 설명, 조건을 채우고, 보기 글의 길이에 따라 답 버튼 배치를 정합니다.
import { t } from './i18n.js';
import { questionText, noteText, optionText } from './questions.js';
import { showFigure, isSketch } from './figures.js';

// els: { text, figure, cap, note, answers } (모두 화면의 요소)
export function fillQuestion(els, q) {
  els.text.textContent = questionText(q.raw);
  showFigure(els.figure, q.raw);
  // 그림은 비율이 정확하지 않은 약도라는 것을 알려 줍니다.
  els.cap.hidden = els.figure.hidden || !isSketch(q.raw);
  els.cap.textContent = t('ui.figNote');
  const note = noteText(q.raw);
  els.note.hidden = !note;
  els.note.textContent = note ? t('ui.cond', { text: note }) : '';
  // 보기가 길면 두 칸 대신 한 줄에 하나씩 놓습니다.
  const longest = Math.max(...q.options.map((text) => optionText(text).length));
  const roomy = window.innerWidth >= 350 ? 14 : 11; // 두 칸으로 놓아도 한 줄에 들어가는 글자 수
  els.answers.classList.toggle('long', longest > roomy);
  els.answers.classList.toggle('wordy', longest > 16);
}
