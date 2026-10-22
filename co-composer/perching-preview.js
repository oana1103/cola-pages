const frame = document.querySelector('iframe');
const status = document.querySelector('#status');
let state = 'idle';
function send(data) { frame.contentWindow.postMessage(data, location.origin); }
frame.addEventListener('load', () => send({ type: 'cola-companion-state', state }));
for (const button of document.querySelectorAll('[data-state], [data-pose]')) {
  button.addEventListener('click', () => {
    state = button.dataset.state || 'idle';
    for (const item of document.querySelectorAll('[data-state]')) item.setAttribute('aria-pressed', String(item.dataset.state === state));
    send(button.dataset.pose
      ? { type: 'cola-companion-idle-preview', pose: button.dataset.pose }
      : { type: 'cola-companion-state', state, previewReplay: true });
    status.textContent = button.dataset.pose
      ? `正在预览：${button.textContent.slice(2)}。移动鼠标会恢复待命。`
      : `正在预览：${button.textContent}。点击小 Co 可以 wink。`;
  });
}

window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== location.origin || event.data?.type !== 'cola-companion-pose') return;
  if (event.data.pose <= 5) {
    state = ['idle', 'thinking', 'working', 'replying', 'waiting', 'complete'][event.data.pose];
    for (const item of document.querySelectorAll('[data-state]')) item.setAttribute('aria-pressed', String(item.dataset.state === state));
  }
  const names = ['待命', '思考', '执行', '回复', '等你确认', '完成', 'Wink', '瞌睡', '生气'];
  status.textContent = `正在预览：${names[event.data.pose] || '待命'}。${event.data.pose === 7 ? '移动鼠标会恢复待命。' : '点击小 Co 可以 wink。'}`;
});
