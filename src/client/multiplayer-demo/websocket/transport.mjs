import { startDemo } from '../view.mjs';

export function connectWebSocket({ config, message, closed }) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.playUrl || '/play', location.href);
    if (!config.playUrl) url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    const timer = setTimeout(() => { socket.close(); reject(new Error('Hết thời gian kết nối WebSocket.')); }, 8000);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve({
        send(value) {
          if (socket.readyState !== WebSocket.OPEN) throw new Error('Kết nối đã đóng.');
          if (socket.bufferedAmount > 65536) throw new Error('Kết nối chậm, hàng đợi gửi đã đầy.');
          socket.send(JSON.stringify(value));
          return true;
        },
        close() { socket.close(); },
      });
    };
    socket.onmessage = event => {
      try { message(JSON.parse(event.data)); }
      catch (error) { socket.close(); closed(error); }
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Không kết nối được server WebSocket.'));
    };
    socket.onclose = () => {
      clearTimeout(timer);
      reject(new Error('Server đóng kết nối WebSocket.'));
      closed(new Error('Kết nối đã đóng. Bấm Kết nối lại để vào sân.'));
    };
  });
}

startDemo({ kind: 'websocket', connect: connectWebSocket });
