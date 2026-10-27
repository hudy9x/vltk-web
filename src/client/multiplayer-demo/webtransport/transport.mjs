import { startDemo } from '../view.mjs';

export async function connectWebTransport({ config, message, closed }) {
  if (!window.isSecureContext) throw new Error('WebTransport cần HTTPS hoặc localhost.');
  if (!window.WebTransport) throw new Error('Trình duyệt chưa hỗ trợ WebTransport. Hãy dùng Chrome/Edge mới.');
  const url = new URL(config.playUrl || '/play', location.href);
  // This demo binds IPv4 by default. QUIC does not reliably fall back from ::1.
  if (!config.playUrl && url.hostname === 'localhost') url.hostname = '127.0.0.1';
  url.protocol = 'https:';
  if (!config.playUrl) url.port = String(config.udpPort);
  const transport = new WebTransport(url.href, {
    serverCertificateHashes: [{ algorithm: 'sha-256', value: new Uint8Array(config.certificateHash) }],
  });
  let stopped = false;
  let busy = false;
  let writer;
  const readers = new Set();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    transport.close();
    for (const reader of readers) void reader.cancel().catch(() => {});
    if (writer) void writer.abort().catch(() => {});
  };
  const fail = error => { if (!stopped) { shutdown(); closed(error); } };
  // Attach rejection handling immediately, including handshake failures.
  void transport.closed.then(() => fail(new Error('Phiên QUIC đã đóng. Bấm Kết nối lại để vào sân.')), fail);
  const timer = setTimeout(() => fail(new Error('Không kết nối được QUIC/UDP. Kiểm tra server và UDP port.')), 8000);
  try {
    await transport.ready;
    clearTimeout(timer);
    writer = transport.datagrams.writable.getWriter();
  } catch (error) { clearTimeout(timer); shutdown(); throw error; }

  async function datagrams() {
    const reader = transport.datagrams.readable.getReader();
    readers.add(reader);
    try {
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        message(JSON.parse(decoder.decode(value)));
      }
    } finally { readers.delete(reader); reader.releaseLock(); }
  }

  async function streams() {
    const reader = transport.incomingUnidirectionalStreams.getReader();
    readers.add(reader);
    try {
      while (!stopped) {
        const { value: stream, done } = await reader.read();
        if (done) break;
        const input = stream.getReader();
        readers.add(input);
        const text = new TextDecoder();
        let buffer = '';
        try {
          while (!stopped) {
            const { value, done: finished } = await input.read();
            buffer += finished ? text.decode() : text.decode(value, { stream: true });
            if (buffer.length > 4096) throw new Error('Gói khởi tạo vượt giới hạn.');
            let boundary;
            while ((boundary = buffer.indexOf('\n')) >= 0) {
              message(JSON.parse(buffer.slice(0, boundary)));
              buffer = buffer.slice(boundary + 1);
            }
            if (finished) break;
          }
        } finally { readers.delete(input); input.releaseLock(); }
      }
    } finally { readers.delete(reader); reader.releaseLock(); }
  }
  void datagrams().catch(fail);
  void streams().catch(fail);
  return {
    async send(value) {
      if (stopped) throw new Error('Phiên QUIC đã đóng.');
      // Drop unsent stale updates instead of building a reliable queue.
      if (busy || writer.desiredSize <= 0) return false;
      const bytes = encoder.encode(JSON.stringify(value));
      if (bytes.length > transport.datagrams.maxDatagramSize) throw new Error('Datagram vượt kích thước cho phép.');
      busy = true;
      try { await writer.write(bytes); return true; }
      finally { busy = false; }
    },
    close: shutdown,
  };
}

startDemo({ kind: 'webtransport', connect: connectWebTransport });
