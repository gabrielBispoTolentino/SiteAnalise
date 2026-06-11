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
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  };

  const parseFile = () => {
    if (!file) {
      addToast('Por favor, selecione um arquivo CSV primeiro.', 'error');
      return;
    }

    setIsProcessing(true);
    setStatus('Lendo arquivo localmente...');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data;
        setTotal(data.length);
        setStatus(`Iniciando gravação de ${data.length} registros (Não feche a aba)...`);

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (!row.Title) continue;

          setProgress(i + 1);
          setStatus(`Processando linha ${i + 1} de ${data.length}...`);

          try {
            const { data: artData, error: artErr } = await supabaseClient.from('Article').insert({
              Title: row['Title'] || null,
              Year: parseInt(row['Year']) || null,
              Source_Title: row['Source title'] || null,
              Quotation: parseInt(row['Cited by']) || 0,
              DOI: row['DOI'] || null,
              Link: row['Link'] || null,
              Abstract: row['Abstract'] || null,
              ISSN: row['ISSN'] || null,
              ISBN: row['ISBN'] || null,
              Language: row['Language of Original Document'] || null,
              Document_Type: row['Document Type'] || null,
              Access_Type: row['Open Access'] || null
            }).select();

            if (!artData || artErr) continue;
            const articleId = artData[0]?.ID;

            if (row['Author(s) ID']) {
              const ids = row['Author(s) ID'].split(';').map((s) => s.trim());
              const names = (row['Authors'] || '').split(';').map((s) => s.trim());
              const fullNames = (row['Author full names'] || '').split(';').map((s) => s.trim());

              for (let j = 0; j < ids.length; j++) {
                if (!ids[j]) continue;
                await supabaseClient.from('Author').upsert({ ID: ids[j], Name: names[j] || null, Full_Name: fullNames[j] || null });
                await supabaseClient.from('Article_Author').insert({ ID_Article: articleId, ID_Author: ids[j] });
              }
            }

            const kws = [];
            if (row['Author Keywords']) kws.push(...row['Author Keywords'].split(';').map((s) => s.trim().toLowerCase()));
            if (row['Index Keywords']) kws.push(...row['Index Keywords'].split(';').map((s) => s.trim().toLowerCase()));

            for (let kw of kws) {
              if (!kw) continue;
              const { data: kwData } = await supabaseClient.from('Keyword').select('ID').eq('Keyword', kw);
              let kwId;
              if (kwData && kwData.length > 0) {
                kwId = kwData[0].ID;
              } else {
                const { data: newKw } = await supabaseClient.from('Keyword').insert({ Keyword: kw }).select();
                kwId = newKw?.[0]?.ID;
              }
              if (kwId) await supabaseClient.from('Article_keyword').insert({ ID_Article: articleId, ID_Keyword: kwId });
            }
          } catch (e) {
            console.error(`Erro na linha ${i}:`, e);
          }
        }

        setStatus('✅ Importação Concluída com Sucesso!');
        setIsProcessing(false);
        addToast('Dados importados e normalizados no banco!', 'success');
      }
    });
  };

  return (
    <PageShell title="Importar CSV - Scopus" description="Carregue o arquivo CSV extraído diretamente do Scopus" backPath="/">
      <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="upload-area">
          <span className="upload-icon">📄</span>
          <input type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </div>

        <button className="btn-form btn-form-primary" onClick={parseFile} disabled={isProcessing} style={{ width: '100%', fontSize: '1.1rem', padding: '1rem' }}>
          Iniciar Sincronização de Dados
        </button>

        {isProcessing && (
          <div className="progress-container" style={{ display: 'block', marginTop: '1.5rem' }}>
            <label id="status-text" style={{ fontWeight: 600, color: 'var(--pico-primary)', textAlign: 'center', display: 'block' }}>{status}</label>
            <progress id="progress-bar" value={progress} max={total} style={{ marginTop: '0.5rem', width: '100%' }} />
          </div>
        )}
      </div>
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
