const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ASSET = /^(img|fx|snd|music|fonts|ui)\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|mp3|ogg|wav|m4a|woff2?|ttf|svg)$/i;
function isAssetPath(relative) {
  return typeof relative === 'string' && ASSET.test(relative) && !relative.includes('\\') &&
    !relative.split('/').some(part => part.startsWith('.'));
}
function validBytes(relative, bytes) {
  if (!bytes.length) return false;
  switch (path.extname(relative).toLowerCase()) {
    case '.png': return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.subarray(-8,-4).toString() === 'IEND';
    case '.webp': return bytes.length >= 20 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' && bytes.readUInt32LE(4)+8 === bytes.length;
    case '.jpg': case '.jpeg': return bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217;
    case '.gif': return /^GIF8[79]a/.test(bytes.toString('ascii',0,6));
    case '.woff': return bytes.toString('ascii',0,4) === 'wOFF';
    case '.woff2': return bytes.toString('ascii',0,4) === 'wOF2';
    case '.ttf': return bytes.subarray(0,4).equals(Buffer.from([0,1,0,0])) || bytes.toString('ascii',0,4) === 'OTTO';
    case '.mp3': return bytes.toString('ascii',0,3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224);
    case '.ogg': return bytes.toString('ascii',0,4) === 'OggS';
    case '.wav': return bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WAVE';
    case '.m4a': return bytes.toString('ascii',4,8) === 'ftyp';
    case '.svg': return /<svg[\s>]/i.test(bytes.toString('utf8',0,1024));
    default: return false;
  }
}
function decodeBytes(relative, bytes) {
  if (validBytes(relative,bytes)) return bytes;
  const text = bytes.toString('utf8').trim().replace(/^data:[^,]+;base64,/, '').replace(/\s/g,'');
  if (text.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return null;
  const decoded = Buffer.from(text,'base64');
  return validBytes(relative,decoded) ? decoded : null;
}
async function writeAtomic(filename, bytes) {
  await fs.mkdir(path.dirname(filename),{ recursive:true });
  const temporary = filename+'.'+randomUUID()+'.download';
  try { await fs.writeFile(temporary,bytes); await fs.rename(temporary,filename); }
  finally { await fs.rm(temporary,{ force:true }); }
}
function createAssetCache({ root, origin = 'https://volamidle.pages.dev/', fetchAsset = fetch } = {}) {
  const pending = new Map(), verified = new Map(), failures = new Map();
  const counts = { reused:0, repaired:0, downloaded:0 };
  async function ensure(relative, { download = true } = {}) {
    if (!isAssetPath(relative)) throw Object.assign(new Error('Invalid asset path'),{ status:404 });
    if (pending.has(relative)) return pending.get(relative);
    const filename = path.join(root,relative);
    const task = (async () => {
      const stat = await fs.stat(filename).catch(() => null);
      const fingerprint = stat && `${stat.size}:${stat.mtimeMs}`;
      if (fingerprint && verified.get(relative) === fingerprint) return { filename, action:'reused' };
      if (stat?.isFile() && stat.size) {
        const raw = await fs.readFile(filename), decoded = decodeBytes(relative,raw);
        if (decoded) {
          const repaired = !decoded.equals(raw);
          if (repaired) await writeAtomic(filename,decoded);
          const current = await fs.stat(filename); verified.set(relative,`${current.size}:${current.mtimeMs}`);
          failures.delete(relative); counts[repaired ? 'repaired' : 'reused']++;
          return { filename, action:repaired ? 'repaired' : 'reused' };
        }
      }
      if (!download) throw Object.assign(new Error('Asset missing or invalid'),{ status:404 });
      let error;
      for (let attempt=0; attempt<3; attempt++) {
        try {
          const response = await fetchAsset(new URL(relative,origin),{ signal:AbortSignal.timeout(20000) });
          if (!response.ok) {
            error = Object.assign(new Error(`Upstream HTTP ${response.status}`),{ status: response.status === 404 ? 404 : 502 });
            if (response.status < 500 && response.status !== 429) break;
            throw error;
          }
          const bytes = decodeBytes(relative,Buffer.from(await response.arrayBuffer()));
          if (!bytes) { error = Object.assign(new Error('Upstream returned invalid asset bytes'),{ status:502 }); break; }
          await writeAtomic(filename,bytes);
          const current = await fs.stat(filename); verified.set(relative,`${current.size}:${current.mtimeMs}`);
          failures.delete(relative); counts.downloaded++;
          return { filename, action:'downloaded' };
        } catch (cause) {
          error = cause.status ? cause : Object.assign(new Error(`Asset download failed: ${cause.message}`),{ status:502 });
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve,250*(attempt+1)));
        }
      }
      throw error;
    })().catch(error => {
      const previous = failures.get(relative);
      failures.set(relative,{ path:relative, error:error.message, status:error.status || 500, attempts:(previous?.attempts || 0)+1, at:new Date().toISOString() });
      if (failures.size > 1000) failures.delete(failures.keys().next().value);
      throw error;
    }).finally(() => pending.delete(relative));
    pending.set(relative,task);
    return task;
  }
  return { ensure, report:() => ({ ...counts, pending:pending.size, failures:[...failures.values()] }) };
}
module.exports = { isAssetPath, validBytes, decodeBytes, createAssetCache };
