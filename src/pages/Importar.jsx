import { useState } from 'react';
import Papa from 'papaparse';
import { supabaseClient } from '../lib/supabase.js';
import PageShell from '../components/PageShell.jsx';

export default function Importar() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((c) => [...c, { id, message, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500);
  };

  const parseFile = () => {
    if (!file) { addToast('Selecione um arquivo CSV primeiro.', 'error'); return; }
    setIsProcessing(true);
    setStatus('Lendo arquivo...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        setTotal(rows.length);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row['Title']) continue;

          setProgress(i + 1);
          setStatus(`Processando ${i + 1} de ${rows.length}...`);

          try {
            // ── Article ──────────────────────────────────────────
            const { data: artData, error: artErr } = await supabaseClient
              .from('article')
              .insert({
                title:              row['Title'] || null,
                year:               parseInt(row['Year']) || null,
                source_title:       row['Source title'] || null,
                qt_cited:           parseInt(row['Cited by']) || 0,
                doi:                row['DOI'] || null,
                link:               row['Link'] || null,
                abstract:           row['Abstract'] || null,
                issn:               row['ISSN'] || null,
                language:           row['Language of Original Document'] || null,
                document_type:      row['Document Type'] || null,
                publication_access: row['Open Access'] || null,
              })
              .select();

            if (artErr || !artData) { console.error(artErr); continue; }
            const articleId = artData[0]?.id;

            // ── Authors ──────────────────────────────────────────
            if (row['Author(s) ID']) {
              const ids       = row['Author(s) ID'].split(';').map((s) => s.trim()).filter(Boolean);
              const names     = (row['Authors'] || '').split(';').map((s) => s.trim());
              const fullNames = (row['Author full names'] || '').split(';').map((s) => s.trim());

              for (let j = 0; j < ids.length; j++) {
                await supabaseClient.from('author').upsert({
                  id:           ids[j],
                  nome:         names[j] || ids[j],
                  nome_completo: fullNames[j] || null,
                });
                await supabaseClient.from('article_author').insert({
                  id_article: articleId,
                  id_author:  ids[j],
                });
              }
            }

            // ── Keywords ─────────────────────────────────────────
            const kws = [];
            if (row['Author Keywords']) kws.push(...row['Author Keywords'].split(';').map((s) => s.trim().toLowerCase()));
            if (row['Index Keywords'])  kws.push(...row['Index Keywords'].split(';').map((s) => s.trim().toLowerCase()));

            for (const kw of kws) {
              if (!kw) continue;
              const { data: existing } = await supabaseClient
                .from('keywords').select('id').eq('keywords', kw).maybeSingle();

              let kwId = existing?.id;
              if (!kwId) {
                const { data: newKw } = await supabaseClient
                  .from('keywords').insert({ keywords: kw }).select().single();
                kwId = newKw?.id;
              }
              if (kwId) await supabaseClient.from('article_keywords').insert({
                id_article:  articleId,
                id_keywords: kwId,
              });
            }

            // ── References ───────────────────────────────────────
            if (row['References']) {
              const refs = row['References'].split(';').map((s) => s.trim()).filter(Boolean);
              for (const ref of refs) {
                const { data: newRef } = await supabaseClient
                  .from('reference').insert({ reference: ref }).select().single();
                if (newRef?.id) await supabaseClient.from('article_reference').insert({
                  id_article_reference: articleId,
                  id_reference:         newRef.id,
                });
              }
            }

          } catch (e) {
            console.error(`Erro na linha ${i}:`, e);
          }
        }

        setStatus('✅ Importação concluída!');
        setIsProcessing(false);
        addToast('Dados importados com sucesso!', 'success');
      }
    });
  };

  return (
    <PageShell title="Importar CSV - Scopus" description="Carregue o CSV extraído do Scopus" backPath="/">
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />

        <button
          className="btn-form btn-form-primary"
          onClick={parseFile}
          disabled={isProcessing}
          style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', marginTop: '1rem' }}
        >
          Iniciar Importação
        </button>

        {isProcessing && (
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', textAlign: 'center', fontWeight: 600 }}>{status}</label>
            <progress value={progress} max={total} style={{ width: '100%', marginTop: '0.5rem' }} />
          </div>
        )}
      </div>

      <div id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </PageShell>
  );
}