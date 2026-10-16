import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Post = { id: string; page_id: string; type: string; description?: string; media?: any; created_at: string };

export default function MyPage() {
  const [pageId] = useState('demo-page');
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const { data, error } = await supabase.from('posts').select('*').eq('page_id', pageId).order('created_at', { ascending: false });
    if (error) { setMsg('خطأ تحميل: ' + error.message); return; }
    setPosts(data || []);
  }
  useEffect(() => { load(); }, []);

  async function upload(f: File): Promise<string> {
    const path = `${pageId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('sb1-media').upload(path, f, { upsert: false, contentType: f.type });
    if (error) throw error;
    const { data } = supabase.storage.from('sb1-media').getPublicUrl(path);
    return data.publicUrl;
  }

  async function publish() {
    if (!text.trim() && !file) { setMsg('اكتب نصًا أو اختر ملفًا'); return; }
    setBusy(true); setMsg('');
    try {
      let url = '';
      let kind = 'text';
      if (file) { url = await upload(file); kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'; }
      const { error } = await supabase.from('posts').insert({ page_id: pageId, type: kind, description: text || null, media: url ? { url } : null, created_at: new Date().toISOString() });
      if (error) throw error;
      setText(''); setFile(null); setMsg('✓ تم النشر'); await load();
    } catch (e: any) { setMsg('خطأ نشر: ' + (e?.message || e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-2xl font-extrabold">صفحتي</h1>
        <div className="mb-4 rounded-2xl bg-white p-4 shadow">
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="اكتب منشورك..." className="w-full rounded-xl border p-3" rows={3} />
          <div className="mt-2 flex items-center gap-2">
            <label className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold">
              اختر ملف <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
            <button onClick={publish} disabled={busy} className="rounded-xl bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-50">
              {busy ? '...' : 'نشر'}
            </button>
            {file && <span className="text-xs text-slate-500">{file.name}</span>}
          </div>
          {msg && <p className="mt-2 text-sm font-bold text-teal-700">{msg}</p>}
        </div>
        <div className="space-y-3">
          {posts.map(p => (
            <article key={p.id} className="rounded-2xl bg-white p-4 shadow">
              <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString('ar')} · {p.type}</p>
              {p.description && <p className="mt-2">{p.description}</p>}
              {p.media?.url && (
                p.type === 'video' ? <video src={p.media.url} controls preload="metadata" className="mt-3 max-h-96 w-full rounded-xl bg-black" /> :
                p.type === 'audio' ? <audio src={p.media.url} controls className="mt-3 w-full" /> :
                <img src={p.media.url} alt="" className="mt-3 max-h-96 w-full rounded-xl object-contain" />
              )}
            </article>
          ))}
          {!posts.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-400 shadow">لا منشورات بعد</p>}
        </div>
      </div>
    </div>
  );
}
