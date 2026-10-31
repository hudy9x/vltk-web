import { useCallback, useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { ChevronDown, FolderOpen, Loader2, Pause, Play, Plus, RefreshCw, Save, Square, ListMusic, Undo2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { base64 } from '@/lib/native';
import { loadAudio, readAudioAsset, saveAudio } from '@/lib/sound-native';
import { SoundSelect } from './SoundSelect';
import { SoundArtwork } from './SoundArtwork';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SoundOption } from './SoundSelect';
import { SoundPreviewPlayer } from '@/lib/sound-player';
import { ELEMENTS, ELEMENT_ICONS, SOUND_FACTIONS, filterSoundSkills, importIdentity, paths, resolveSkill, skillPreviewQueue, soundDraftKey, soundPreviewGender, usedBy } from '@/lib/sound-model';
import type { Sound, SoundAsset, SoundConfig, PreviewClip, PreviewGender, StageField, StageName } from '@/lib/sound-model';
interface Props { root: string | null; active: boolean; onState: (dirty: boolean, busy: boolean) => void; onWorkspace: () => void }
interface Draft { config: SoundConfig; assets: SoundAsset[] }
function SkillIcon({ id, revision }: { id: string; revision: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => { let cancelled = false, url = ''; setSrc('');
    if (isTauri()) void readAudioAsset(id, 'icon').then(bytes => { if (!cancelled) { url = URL.createObjectURL(new Blob([bytes])); setSrc(url); } }).catch(() => {});
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [id, revision]);
  return src ? <img src={src} alt="" width={48} height={48} /> : <Volume2 size={32} />;
}
export function SoundTool({ root, active, onState, onWorkspace }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null), [baseline, setBaseline] = useState(''), [revision, setRevision] = useState('');
  const [past, setPast] = useState<Draft[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('all'), [selectedSound, setSelectedSound] = useState(''), [selectedSkill, setSelectedSkill] = useState('');
  const [skillQuery, setSkillQuery] = useState(''), [faction, setFaction] = useState('shaolin'), [playing, setPlaying] = useState('');
  const [element, setElement] = useState('all'), [previewGender, setPreviewGender] = useState<PreviewGender>('male');
  const [levels, setLevels] = useState<number[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false), [playback, setPlayback] = useState<{ clip: PreviewClip | null; index: number; total: number }>({ clip: null, index: 0, total: 0 });
  const [uploadOpen, setUploadOpen] = useState(false), [upload, setUpload] = useState<File | null>(null), [name, setName] = useState(''), [category, setCategory] = useState<Sound['category']>('effect'), [gender, setGender] = useState<Sound['gender']>();
  const [reloadOpen, setReloadOpen] = useState(false);
  const audio = useRef<HTMLAudioElement>(null), urls = useRef(new Map<string, string>()), generation = useRef(0), player = useRef<SoundPreviewPlayer | null>(null);
  const dirty = !!draft && soundDraftKey(draft) !== baseline;
  const latest = useRef({ draft, busy, active, revision }); latest.current = { draft, busy, active, revision };
  useEffect(() => { onState(dirty, busy); }, [dirty, busy, onState]);
  const stop = useCallback(() => { player.current?.stop(); setPlaying(''); }, []);
  const clearAudio = useCallback(() => { stop(); urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); }, [stop]);
  const load = useCallback(async () => {
    if (!isTauri() || !root) return;
    stop(); const token = ++generation.current; setBusy(true); setError('');
    try { const result = await loadAudio(); if (token !== generation.current) return;
      clearAudio(); const next = { config: result.config, assets: [] }; setDraft(next); setBaseline(soundDraftKey(next)); setRevision(result.revision); setPast([]); setMessage('Đã đọc cấu hình âm thanh');
    } catch (e) { if (token === generation.current) setError(String(e)); }
    finally { if (token === generation.current) setBusy(false); }
  }, [root, clearAudio]);
  useEffect(() => { setDraft(null); setBaseline(''); setRevision(''); setPast([]); setSelectedSound(''); setError(''); void load(); return () => { generation.current++; clearAudio(); }; }, [load, clearAudio]);
  useEffect(() => { if (!active) stop(); }, [active, stop]);
  function edit(change: (next: Draft) => void) {
    if (!draft || busy) return;
    stop();
    const next = { config: structuredClone(draft.config), assets: [...draft.assets] }; change(next);
    if (soundDraftKey(next) === soundDraftKey(draft)) return;
    setPast(previous => [...previous.slice(-39), draft]); setDraft(next); setError(''); setMessage('Chưa lưu');
  }
  const save = useCallback(async () => {
    const current = latest.current; if (!current.draft || current.busy) return;
    stop(); const token = generation.current; setBusy(true); setError('');
    try { const result = await saveAudio(current.draft.config, current.revision, current.draft.assets); if (token !== generation.current) return;
      clearAudio(); const next = { config: result.config, assets: [] }; setDraft(next); setBaseline(soundDraftKey(next)); setRevision(result.revision); setPast([]); setMessage('Đã lưu âm thanh và build game. Reload game để áp dụng.');
    } catch (e) { if (token === generation.current) setError(String(e)); }
    finally { if (token === generation.current) setBusy(false); }
  }, [clearAudio]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (!latest.current.active) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save(); }
  }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [save]);
  useEffect(() => {
    if (!audio.current) return;
    const preview = new SoundPreviewPlayer(audio.current, {
      async source(id) {
        const snapshot = latest.current.draft, sound = snapshot?.config.sounds[id];
        if (!sound) throw new Error('Sound ID không tồn tại: ' + id);
        const pending = snapshot?.assets.find(asset => sound.src.endsWith('/' + asset.file));
        if (pending) return `data:audio/${pending.file.toLowerCase().endsWith('.wav') ? 'wav' : 'mpeg'};base64,${pending.data}`;
        const key = id + ':' + sound.src;
        const existing = urls.current.get(key); if (existing) return existing;
        const token = generation.current, bytes = await readAudioAsset(id, 'sound');
        if (token !== generation.current) return;
        const url = URL.createObjectURL(new Blob([bytes], { type: sound.src.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg' }));
        urls.current.set(key, url); return url;
      },
      state(clip, index, total) {
        setPlaying(clip?.id || ''); setPlayback({ clip, index, total });
        if (clip) setMessage(`${index}/${total} · ${clip.label} · ${clip.id}`);
        else if (total) setMessage(`Đã nghe xong ${total} âm thanh`);
      },
      error(clip, error) { setError(`Không phát được ${clip.id}: ${String(error)}`); },
    });
    player.current = preview;
    return () => { preview.stop(); player.current = null; };
  }, []);
  function startQueue(queue: PreviewClip[]) { setError(''); void player.current?.play(queue); }
  function play(id: string, toggle = true) {
    if (toggle && playing === id) { stop(); return; }
    startQueue([{ id, label: latest.current.draft?.config.sounds[id]?.name || id }]);
  }
  async function addUpload() {
    if (!draft || !upload || !name.trim()) return;
    const extension = upload.name.split('.').pop()?.toLowerCase();
    if (!['wav', 'mp3'].includes(extension || '') || !upload.size || upload.size > paths.maxSoundBytes) { setError('Chọn WAV/MP3, tối đa ' + paths.maxSoundBytes / 1048576 + ' MB.'); return; }
    const captured = draft, token = generation.current;
    try { const bytes = await upload.arrayBuffer(); if (token !== generation.current || latest.current.draft !== captured) return;
      const identity = importIdentity(draft.config, name, extension!, category, gender);
      edit(next => { next.config.sounds[identity.id] = { name: name.trim(), src: identity.src, category, ...(gender ? { gender } : {}) }; next.assets.push({ file: identity.file, data: base64(bytes) }); });
      setSelectedSound(identity.id); setUploadOpen(false); setUpload(null); setMessage('Đã thêm vào bản nháp · bấm Lưu âm thanh để ghi file');
    } catch (e) { setError(String(e)); }
  }
  const config = draft?.config, selected = config?.sounds[selectedSound];
  const references = config && selected ? usedBy(config, selectedSound) : [];
  const factions = config ? [...new Set(Object.values(config.skills).map(s => s.faction))].sort() : [];
  const availableLevels = config ? [...new Set(Object.values(config.skills).map(s => s.level))].sort((a, b) => a - b) : [];
  const femaleOnly = element === 'Thủy' || soundPreviewGender(faction, 'male') === 'female';
  const listeningGender = femaleOnly ? 'female' : previewGender;
  const skills = config ? filterSoundSkills(config, { faction, element, query: skillQuery, levels }) : [];
  const allQueue = config ? skills.flatMap(([id]) => skillPreviewQueue(config, id, listeningGender)) : [];
  function chooseFaction(value: string) {
    stop(); setFaction(value);
    // Selecting a portrait always shows that faction, even after a conflicting element filter.
    if (value !== 'all' && element !== 'all' && SOUND_FACTIONS[value]?.element !== element) setElement('all');
  }
  function chooseElement(value: string) {
    stop(); setElement(value);
    if (faction !== 'all' && value !== 'all' && SOUND_FACTIONS[faction]?.element !== value) setFaction('all');
  }
  function mapping(skillId: string, stage: StageName, field: StageField, title: string) {
    const skill = config!.skills[skillId], resolved = resolveSkill(config!, skillId)!;
    const inherited = skill.inherit != null, own = skill[stage]?.[field], value = own ?? (inherited ? '__inherit__' : '');
    const current = resolved[stage]?.[field];
    const parent = inherited ? resolveSkill(config!, String(skill.inherit))?.[stage]?.[field] : undefined;
    const sex = field === 'male' || field === 'maleEffect' ? 'male' : field === 'female' || field === 'femaleEffect' ? 'female' : soundPreviewGender(skill.faction, listeningGender);
    const available = Object.entries(config!.sounds).filter(([, sound]) => {
      const category = field === 'male' || field === 'female' ? 'voice' : 'effect';
      return sound.category === category && (sex === 'both' || !sound.gender || sound.gender === sex);
    });
    const options: SoundOption[] = [
      ...(inherited ? [{ value: '__inherit__', label: `Kế thừa${parent ? ' · ' + parent : ' · chưa gắn'}`, soundId: parent }] : []),
      { value: '', label: field === 'male' || field === 'female' ? 'Không gắn hô riêng' : 'Không gắn sound' },
      ...available.map(([id,sound]) => ({ value: id, label: `${sound.name} · ${id}`, soundId: id })),
    ];
    if (current && !available.some(([id]) => id === current)) options.push({ value: current, label: current, soundId: current });
    const defaultVoice = field === 'male' || field === 'female' ? config!.defaults[field] : undefined;
    const effective = current || (defaultVoice && !resolved.cast?.effect && !resolved.cast?.[field === 'male' ? 'maleEffect' : 'femaleEffect'] ? defaultVoice : undefined);
    const label = `${skill.name} · ${stage === 'cast' ? 'Xuất chiêu' : stage === 'release' ? 'Phóng đạn' : 'Va chạm'} · ${title}`;
    return <div className="sound-table-mapping" key={stage + field}>
      <span className="sound-field-label">{title}</span>
      <SoundSelect label={label} value={value} options={options} disabled={busy || resolved.disabled} onChoose={option => {
        if (resolved.disabled) return;
        edit(next => { const item = next.config.skills[skillId]; const event = item[stage] ||= {}; if (option.value === '__inherit__' || !option.value && !inherited) delete event[field]; else event[field] = option.value; });
        setSelectedSkill(skillId);
        const audition = option.soundId || (defaultVoice && !resolved.cast?.effect && !resolved.cast?.[field === 'male' ? 'maleEffect' : 'femaleEffect'] ? defaultVoice : undefined);
        if (audition) { setSelectedSound(audition); play(audition, false); }
      }} />
      <Button variant="ghost" size="icon" aria-label={`Nghe ${label}`} aria-pressed={!!effective && playing === effective} disabled={!effective || busy || resolved.disabled} onClick={() => effective && play(effective)}>{effective && playing === effective ? <Pause /> : <Play />}</Button>
    </div>;
  }
  return <section className="sound-tool" aria-label="Sound Tool">
    <header className="app-header sound-header"><div className="brand"><Volume2 size={23} /><div><strong>Võ Lâm</strong><span>Sound Tool</span></div></div><div className="header-document">Âm thanh kỹ năng {dirty && <span className="unsaved-dot" title="Chưa lưu" />}</div><div className="header-actions">
      <Button variant="ghost" size="sm" aria-pressed={libraryOpen} onClick={() => setLibraryOpen(!libraryOpen)}><ListMusic />Thư viện</Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={onWorkspace}><FolderOpen />Workspace</Button>
      <Button variant="ghost" size="sm" disabled={!past.length || busy} onClick={() => { stop(); const previous = past[past.length - 1]; setDraft(previous); setPast(past.slice(0,-1)); setMessage(soundDraftKey(previous) === baseline ? 'Đã hoàn tác về cấu hình đã lưu' : 'Chưa lưu'); if (!previous.config.sounds[selectedSound]) setSelectedSound(''); }}><Undo2 />Hoàn tác</Button>
      <Button variant="outline" size="sm" disabled={!root || busy} onClick={() => dirty ? setReloadOpen(true) : void load()}><RefreshCw />Tải lại</Button>
      <Button size="sm" disabled={!dirty || busy} onClick={() => void save()}>{busy ? <Loader2 className="animate-spin" /> : <Save />}Lưu âm thanh<span className="shortcut">⌘S</span></Button>
    </div></header>
    {!root || !isTauri() ? <div className="sound-empty"><Volume2 size={36} /><h1>Âm thanh kỹ năng</h1><p>{isTauri() ? 'Mở workspace game để quản lý thư viện và gắn sound cho kỹ năng.' : 'Chạy pnpm tauri dev để đọc, nghe và lưu âm thanh trong workspace.'}</p><Button onClick={onWorkspace}><FolderOpen />Mở workspace</Button></div> : !config ? <div className="sound-empty"><p role={error ? 'alert' : 'status'}>{error || 'Đang đọc cấu hình âm thanh…'}</p><Button variant="outline" onClick={() => void load()}>Thử lại</Button></div> : <>
      <div className={`sound-main sound-table-layout ${libraryOpen ? 'with-library' : ''} ${libraryOpen && selected ? 'with-details' : ''}`}>
        <aside className="sound-library" hidden={!libraryOpen}><div className="panel-heading"><strong>Thư viện</strong><span>{Object.keys(config.sounds).length} sound</span></div><div className="sound-filters"><Input aria-label="Tìm sound" placeholder="Tìm tên hoặc Sound ID…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Loại sound" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả</option><option value="effect">Hiệu ứng</option><option value="male">Tiếng hô nam</option><option value="female">Tiếng hô nữ</option></select><Button variant="outline" onClick={() => { setError(''); setUpload(null); setName(''); setCategory('effect'); setGender(undefined); setUploadOpen(true); }} disabled={busy}><Plus />Import sound</Button></div>
          <div className="sound-list">{Object.entries(config.sounds).filter(([id,s]) => (filter === 'all' || filter === 'effect' && s.category === 'effect' || s.category === 'voice' && s.gender === filter) && `${id} ${s.name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).map(([id,s]) => <div className={`sound-library-row ${selectedSound === id ? 'selected' : ''}`} key={id}><button className="sound-select" onClick={() => setSelectedSound(id)}><strong>{s.name}</strong><small>{id}</small></button><Button variant="ghost" size="icon" aria-label={`Nghe ${id}`} aria-pressed={playing === id} onClick={() => void play(id)}>{playing === id ? <Pause /> : <Play />}</Button></div>)}</div>
        </aside>
        <main className="sound-content sound-table-content">
          <div className="sound-section-title"><div><h1>Âm thanh theo kỹ năng</h1><p>Mỗi hàng một chiêu · ↑↓ chọn và nghe thử · Play all nghe lần lượt từng hàng.</p></div><Button variant="outline" disabled={busy || (!playback.clip && !allQueue.length)} onClick={() => playback.clip ? stop() : startQueue(allQueue)}>{playback.clip ? <Square /> : <Play />}{playback.clip ? 'Dừng nghe' : 'Play all'}<span className="sound-play-count">{playback.clip ? `${playback.index}/${playback.total}` : `${allQueue.length} âm`}</span></Button></div>
          <div className="sound-table-filters sound-visual-filters">
            <Input aria-label="Tìm kỹ năng" placeholder="Tên chiêu, cấp hoặc ID…" value={skillQuery} onChange={e => { stop(); setSkillQuery(e.target.value); }} />
            <div className="sound-image-filter" role="group" aria-label="Môn phái"><span className="sound-filter-title">Môn phái</span><div className="sound-filter-buttons"><button type="button" className="sound-filter-all" aria-label="Tất cả môn phái" title="Tất cả môn phái" aria-pressed={faction === 'all'} onClick={() => chooseFaction('all')}>Tất cả</button>{Object.keys(SOUND_FACTIONS).filter(f => factions.includes(f)).map(f => <button type="button" key={f} className="sound-portrait-filter" aria-label={SOUND_FACTIONS[f].name} title={`${SOUND_FACTIONS[f].name} · ${SOUND_FACTIONS[f].element}`} aria-pressed={faction === f} onClick={() => chooseFaction(f)}><SoundArtwork id={f} kind="faction" revision={revision} /></button>)}</div></div>
            <div className="sound-image-filter" role="group" aria-label="Ngũ hành"><span className="sound-filter-title">Ngũ hành</span><div className="sound-filter-buttons"><button type="button" className="sound-filter-all" aria-label="Tất cả ngũ hành" title="Tất cả ngũ hành" aria-pressed={element === 'all'} onClick={() => chooseElement('all')}>Tất cả</button>{ELEMENTS.map(value => <button type="button" key={value} className="sound-element-filter" aria-label={`Hệ ${value}`} title={`Hệ ${value}`} aria-pressed={element === value} onClick={() => chooseElement(value)}><SoundArtwork id={ELEMENT_ICONS[value]} kind="element" revision={revision} /><span>{value}</span></button>)}</div></div>
            <div className="sound-level-filter"><span className="sound-filter-title">Cấp chiêu</span><Popover><PopoverTrigger asChild><Button variant="outline" aria-label="Lọc cấp chiêu">{levels.length ? levels.join(', ') : 'Tất cả cấp'}<ChevronDown size={13} /></Button></PopoverTrigger><PopoverContent align="end" className="sound-level-options dark"><strong>Chọn nhiều cấp</strong><button type="button" onClick={() => { stop(); setLevels([]); }}>Tất cả cấp</button>{availableLevels.map(level => <label key={level}><input type="checkbox" checked={levels.includes(level)} onChange={event => { stop(); setLevels(previous => event.target.checked ? [...previous, level].sort((a,b) => a-b) : previous.filter(value => value !== level)); }} />Cấp {level}</label>)}</PopoverContent></Popover></div>
            <label>Giới tính nghe<select aria-label="Giới tính nghe" value={listeningGender} disabled={femaleOnly} onChange={e => { stop(); setPreviewGender(e.target.value as PreviewGender); }}>{!femaleOnly && <option value="male">Nam</option>}<option value="female">Nữ</option>{!femaleOnly && <option value="both">Nam và nữ</option>}</select></label>
          </div>
          <div className="sound-table-summary"><span>{skills.length} / {Object.keys(config.skills).length} kỹ năng · {faction === 'all' ? 'Tất cả môn phái' : SOUND_FACTIONS[faction]?.name} {element !== 'all' && `· Hệ ${element}`}</span><span>{femaleOnly ? 'Hệ Thủy · Chỉ dùng âm thanh nữ' : listeningGender === 'both' ? 'Nghe bản nam rồi bản nữ · skill hệ Thủy chỉ bản nữ' : `Đang chỉnh và nghe bản ${listeningGender === 'male' ? 'nam · skill hệ Thủy vẫn dùng bản nữ' : 'nữ'}`}</span></div>
          <div className="sound-table-scroll"><table className="skill-sound-table"><thead><tr><th>Chiêu thức</th><th>Xuất chiêu</th><th>Phóng đạn / kình khí</th><th>Va chạm</th><th>Nghe cả chiêu</th></tr></thead><tbody>
            {skills.map(([id, skill]) => {
              const resolved = resolveSkill(config, id)!, queue = skillPreviewQueue(config, id, listeningGender), rowGender = soundPreviewGender(skill.faction, listeningGender);
              return <tr key={id} data-skill-id={id} className={`${selectedSkill === id ? 'selected' : ''} ${playback.clip?.skillId === id ? 'is-playing' : ''} ${resolved.disabled ? 'sound-disabled' : ''}`}>
                <th scope="row"><div className="sound-row-skill"><SkillIcon id={id} revision={revision} /><div><strong>{skill.name}</strong><small>Cấp {skill.level} · <mark className={`sound-skill-id ${skillQuery.trim() && id.includes(skillQuery.trim()) ? 'is-match' : ''}`}>ID {id}</mark></small><small>{SOUND_FACTIONS[skill.faction]?.name || skill.faction} · {SOUND_FACTIONS[skill.faction]?.element}</small>{skill.inherit != null && <span className="sound-inherit-note">Kế thừa #{skill.inherit}</span>}</div></div>
                  <Button variant="ghost" size="sm" className="sound-disable-toggle" aria-label={`${resolved.disabled ? 'Bật' : 'Tắt'} âm ${skill.name}`} aria-pressed={!!resolved.disabled} disabled={busy} onClick={() => edit(next => { next.config.skills[id].disabled = !resolved.disabled; })}>{resolved.disabled ? <VolumeX /> : <Volume2 />}{resolved.disabled ? 'Đã tắt âm · Bật lại' : 'Tắt âm'}</Button>
                  {!!resolved.review?.length && <details className="sound-row-review"><summary>{resolved.review.length} sound cần xác minh</summary>{resolved.review.map((item,i) => <div key={i}><button type="button" disabled={resolved.disabled || busy} onClick={() => { setSelectedSound(item.sound); setLibraryOpen(true); play(item.sound); }}>▶ {item.sound}</button><small>{item.reason}</small></div>)}</details>}
                </th>
                <td>{rowGender !== 'female' && mapping(id,'cast','male','Hô nam')}{rowGender !== 'male' && mapping(id,'cast','female','Hô nữ')}{mapping(id,'cast','effect','Hiệu ứng')}{rowGender !== 'female' && mapping(id,'cast','maleEffect','Bản nam')}{rowGender !== 'male' && mapping(id,'cast','femaleEffect','Bản nữ')}</td>
                <td>{mapping(id,'release','effect','Âm phóng')}{resolved.release?.maleEffect != null && rowGender !== 'female' && mapping(id,'release','maleEffect','Bản nam')}{resolved.release?.femaleEffect != null && rowGender !== 'male' && mapping(id,'release','femaleEffect','Bản nữ')}</td>
                <td>{mapping(id,'hit','effect','Âm trúng')}{resolved.hit?.maleEffect != null && rowGender !== 'female' && mapping(id,'hit','maleEffect','Bản nam')}{resolved.hit?.femaleEffect != null && rowGender !== 'male' && mapping(id,'hit','femaleEffect','Bản nữ')}</td>
                <td className="sound-row-play"><Button variant="ghost" size="icon" aria-label={`Nghe cả chiêu ${skill.name}`} disabled={!queue.length || busy} onClick={() => playback.clip?.skillId === id ? stop() : startQueue(queue)}>{playback.clip?.skillId === id ? <Square /> : <Play />}</Button><small>{queue.length} âm</small></td>
              </tr>;
            })}
            {!skills.length && <tr><td colSpan={5} className="sound-table-empty">Không có kỹ năng phù hợp với bộ lọc.</td></tr>}
          </tbody></table></div>
        </main>
        <aside className="sound-details" hidden={!libraryOpen || !selected}><div className="panel-heading"><strong>Thông tin sound</strong></div>{selected ? <div className="sound-detail-fields"><Label>Tên hiển thị<Input value={selected.name} disabled={busy} onChange={e => edit(next => { next.config.sounds[selectedSound].name = e.target.value; })} /></Label><Label>Sound ID<code>{selectedSound}</code></Label><Label>Loại<select value={selected.category} disabled={busy} onChange={e => edit(next => { next.config.sounds[selectedSound].category = e.target.value as Sound['category']; })}><option value="effect">Hiệu ứng</option><option value="voice">Tiếng hô</option></select></Label><Label>Giới tính<select value={selected.gender || ''} disabled={busy} onChange={e => edit(next => { const sound = next.config.sounds[selectedSound]; if (e.target.value) sound.gender = e.target.value as Sound['gender']; else delete sound.gender; })}><option value="">Dùng chung</option><option value="male">Nam</option><option value="female">Nữ</option></select></Label><Label>File<code>{selected.src}</code></Label><p>{references.length} kỹ năng có mapping (gồm kế thừa)</p><div className="sound-references">{references.map(id => <button key={id} onClick={() => { stop(); setSelectedSkill(id); setFaction(config.skills[id].faction); setElement('all'); setSkillQuery(''); setLevels([]); setLibraryOpen(false); }}>{config.skills[id].name} <small>#{id}</small></button>)}</div></div> : <p className="sound-placeholder">Chọn sound trong thư viện để xem chi tiết và những kỹ năng đang sử dụng.</p>}<details className="sound-paths"><summary>Vị trí lưu trong workspace</summary><code>{paths.soundDirectory}</code><code>{paths.soundConfig}</code><small>Cấu hình tại tools/map-tool/paths.json</small></details></aside>
      </div><footer className="status-bar"><span role={error ? 'alert' : 'status'}>{error || message || (dirty ? 'Chưa lưu' : 'Sẵn sàng')}</span><span>{draft.assets.length} file chờ lưu{busy && ' · Đang xử lý…'}</span></footer>
    </>}
    <audio ref={audio} />
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}><DialogContent><DialogHeader><DialogTitle>Import sound</DialogTitle><DialogDescription>Chọn file, đặt tên và phân loại. Tool tự tạo Sound ID và tên file không dấu; file được ghi khi bạn lưu.</DialogDescription></DialogHeader><Label>File WAV/MP3<Input type="file" accept=".wav,.mp3,audio/wav,audio/mpeg" onChange={e => { const file = e.target.files?.[0] || null; setUpload(file); if (file) setName(file.name.replace(/\.[^.]+$/, '')); }} /></Label><Label>Tên sound<Input value={name} onChange={e => setName(e.target.value)} /></Label><Label>Loại<select value={category} onChange={e => { setCategory(e.target.value as Sound['category']); if (e.target.value === 'voice' && !gender) setGender('male'); }}><option value="effect">Hiệu ứng</option><option value="voice">Tiếng hô</option></select></Label><Label>Giới tính<select value={gender || ''} onChange={e => setGender(e.target.value as Sound['gender'] || undefined)}>{category === 'effect' && <option value="">Dùng chung</option>}<option value="male">Nam</option><option value="female">Nữ</option></select></Label>{draft && name.trim() && upload && <div className="sound-import-preview"><code>{importIdentity(draft.config,name,upload.name.split('.').pop()?.toLowerCase() || 'wav',category,gender).id}</code><small>{paths.soundDirectory}/{importIdentity(draft.config,name,upload.name.split('.').pop()?.toLowerCase() || 'wav',category,gender).file}</small></div>}{error && <p role="alert" className="text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)}>Hủy</Button><Button disabled={!upload || !name.trim() || busy} onClick={() => void addUpload()}><Plus />Thêm vào thư viện</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={reloadOpen} onOpenChange={setReloadOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tải lại thư viện âm thanh?</AlertDialogTitle><AlertDialogDescription>Bản nháp âm thanh chưa lưu sẽ bị bỏ. File trong workspace giữ nguyên.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Quay lại</AlertDialogCancel><AlertDialogAction onClick={() => void load()}>Bỏ bản nháp và tải lại</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
