import { decodePacket } from './protocol';
type Packet = ReturnType<typeof decodePacket>;
export interface ConnectionConfig { playUrl: string; certificateHash: number[]; ticket: string; protocol: number }
interface Transport {
  ready: Promise<void>; closed: Promise<unknown>; close(): void;
  datagrams: { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array>; maxDatagramSize: number };
  incomingUnidirectionalStreams: ReadableStream<ReadableStream<Uint8Array>>;
  createUnidirectionalStream(): Promise<WritableStream<Uint8Array>>;
}
export async function connect(config: ConnectionConfig, hello: Uint8Array,
  receive: (packet: Packet) => void, disconnected: (error: Error) => void) {
  const api = globalThis as typeof globalThis & { WebTransport?: new (url: string, options: unknown) => Transport };
  if (!api.WebTransport || !isSecureContext) throw new Error('Cần Chrome/Edge và HTTPS hoặc localhost.');
  if (config.protocol !== 8 || config.certificateHash.length !== 32) throw new Error('Sai phiên bản giao thức. Hãy cập nhật client và Rust server cùng phiên bản.');
  const transport = new api.WebTransport(config.playUrl, {
    serverCertificateHashes: [{ algorithm: 'sha-256', value: new Uint8Array(config.certificateHash) }],
  });
  let stopped = false, busy = false;
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
  const readers = new Set<ReadableStreamDefaultReader<Uint8Array>>();
  let streamsReader: ReadableStreamDefaultReader<ReadableStream<Uint8Array>> | undefined;
  const close = () => {
    if (stopped) return;
    stopped = true; transport.close();
    for (const reader of readers) void reader.cancel().catch(() => {});
    void streamsReader?.cancel().catch(() => {});
    void writer?.abort().catch(() => {});
  };
  const fail = (error: unknown) => {
    if (stopped) return;
    close(); disconnected(error instanceof Error ? error : new Error(String(error)));
  };
  void transport.closed.then(() => fail(new Error('Kết nối đã đóng.')), fail);
  const timer = setTimeout(() => fail(new Error('Không kết nối được QUIC/UDP.')), 8000);
  let controlTail=Promise.resolve(), queuedControls=0;
  async function writeReliable(bytes: Uint8Array) {
    if(stopped)throw new Error("Kết nối đã đóng.");
    const stream = await transport.createUnidirectionalStream();
    const output = stream.getWriter();
    try { await output.write(bytes); await output.close(); } finally { output.releaseLock(); }
  }
  function reliable(bytes:Uint8Array):Promise<void> {
    if(queuedControls>=32)return Promise.reject(new Error('Hàng đợi lệnh đã đầy.'));
    queuedControls++;
    const task=controlTail.then(()=>writeReliable(bytes));controlTail=task.catch(()=>{});
    return task.finally(()=>{queuedControls--;});
  }
  try {
    await transport.ready;
    if (stopped) throw new Error('Kết nối đã hết thời gian chờ.');
    writer = transport.datagrams.writable.getWriter();
    await reliable(hello);
  } catch (error) { close(); throw error; }
  finally { clearTimeout(timer); }
  async function datagrams() {
    const reader = transport.datagrams.readable.getReader(); readers.add(reader);
    try {
      while (!stopped) {
        const { value, done } = await reader.read(); if (done) break;
        receive(decodePacket(value));
      }
    } finally { readers.delete(reader); reader.releaseLock(); }
  }
  async function controls() {
    streamsReader = transport.incomingUnidirectionalStreams.getReader();
    while (!stopped) {
      const { value, done } = await streamsReader.read(); if (done) break;
      const reader = value.getReader(); readers.add(reader);
      try {
        let bytes = new Uint8Array(0);
        while (!stopped) {
          const chunk = await reader.read(); if (chunk.done) break;
          if (bytes.length + chunk.value.length > 16384) throw new Error('Gói dữ liệu thế giới quá lớn.');
          const joined = new Uint8Array(bytes.length + chunk.value.length);
          joined.set(bytes); joined.set(chunk.value, bytes.length); bytes = joined;
        }
        if (!stopped) receive(decodePacket(bytes));
      } finally { readers.delete(reader); reader.releaseLock(); }
    }
  }
  void datagrams().catch(fail); void controls().catch(fail);
  return {
    close,
    reliable,
    async send(bytes: Uint8Array): Promise<boolean> {
      if (stopped || busy || !writer || (writer.desiredSize ?? 0) <= 0) return false;
      if (bytes.length > transport.datagrams.maxDatagramSize) throw new Error('Datagram quá lớn.');
      busy = true;
      try { await writer.write(bytes); return true; }
      catch (error) { fail(error); return false; }
      finally { busy = false; }
    },
  };
}
