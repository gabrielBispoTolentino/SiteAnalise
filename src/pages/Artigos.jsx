import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient } from '../lib/supabase.js';

const initialForm = {
  title: '',
  sourceTitle: '',
  year: '',
  qtCited: 0,
  doi: '',
  link: '',
  issn: '',
  language: '',
  docType: '',
  accessType: '',
  abstract: ''
};

export default function Artigos() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [toasts, setToasts] = useState([]);
  const tableBodyRef = useRef(null);

  useEffect(() => { fetchArticles(); }, []);

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((c) => [...c, { id, message, type }]);
    setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 3500);
  };

  async function fetchArticles() {
    setLoading(true);
    const { data, error } = await supabaseClient
      .from('article')
      .select('*')
      .order('id', { ascending: false });
    if (error) addToast('Erro ao sincronizar dados', 'error');
    else setArticles(data || []);
    setLoading(false);
  }

  const toggleForm = () => {
    setShowForm((s) => !s);
    if (showForm) setFormData(initialForm);
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((c) => ({ ...c, [name]: value }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      title:              formData.title || null,
      year:               parseInt(formData.year) || null,
      source_title:       formData.sourceTitle || null,
      qt_cited:           parseInt(formData.qtCited) || 0,
      doi:                formData.doi || null,
      link:               formData.link || null,
      abstract:           formData.abstract || null,
      issn:               formData.issn || null,
      language:           formData.language || null,
      document_type:      formData.docType || null,
      publication_access: formData.accessType || null,
    };
    const { error } = await supabaseClient.from('article').insert([payload]);
    if (error) addToast(`Erro: ${error.message}`, 'error');
    else {
      addToast('Registo inserido com sucesso!', 'success');
      setFormData(initialForm);
      setShowForm(false);
      fetchArticles();
    }
  }

  const renderCell = (value, type = 'default', linkUrl = '') => {
    const missing = value === null || value === undefined || String(value).trim() === '';
    if (missing) return <td className="cell-missing"><span>[Ausente]</span></td>;
    if (value === 'SEM DADOS') return <td><span className="col-text-truncated cell-no-data">{value}</span></td>;
    if (type === 'abstract') return <td><span className="cell-abstract-expanded">{value}</span></td>;
    if (type === 'link' && linkUrl) return <td className="cell-link"><span className="col-text-truncated"><a href={linkUrl} target="_blank" rel="noreferrer">{value}</a></span></td>;
    return <td><span className="col-text-truncated" title={String(value)}>{value}</span></td>;
  };

  const pipelines = useMemo(() => ({
    limparDadosSemAbstract: async () => {
      const { data, error } = await supabaseClient.from('article').select('id, abstract');
      if (error) return addToast('Erro ao ler dados.', 'error');
      const ids = data.filter((a) => !a.abstract || a.abstract.trim() === '').map((a) => a.id);
      if (ids.length === 0) return addToast('Nenhum registo sem Abstract.', 'success');
      if (!window.confirm(`⚠️ Excluir ${ids.length} registo(s) sem Abstract?`)) return;
      const { error: delErr } = await supabaseClient.from('article').delete().in('id', ids);
      if (delErr) addToast(`Erro: ${delErr.message}`, 'error');
      else { addToast(`🧹 ${ids.length} registo(s) apagados.`, 'success'); fetchArticles(); }
    },

    preencherAcesso: async () => {
      const { data, error } = await supabaseClient.from('article').select('id, publication_access');
      if (error) return addToast('Erro ao buscar dados.', 'error');
      const toUpdate = data.filter((a) => !a.publication_access || a.publication_access.trim() === '' || a.publication_access.trim().toUpperCase() === 'AUSENTE');
      if (toUpdate.length === 0) return addToast('Todos os registros já têm dados de Acesso.', 'success');
      if (!window.confirm(`🔒 ${toUpdate.length} registos sem Acesso. Preencher com "SEM DADOS"?`)) return;
      addToast('A preencher…', 'info');
      let errors = 0;
      await Promise.all(toUpdate.map(async (a) => {
        const { error: err } = await supabaseClient.from('article').update({ publication_access: 'SEM DADOS' }).eq('id', a.id);
        if (err) errors++;
      }));
      if (errors) addToast(`${errors} falharam.`, 'error');
      else addToast(`🔒 ${toUpdate.length} registos atualizados.`, 'success');
      fetchArticles();
    },

    preencherDOI: async () => {
      const { data, error } = await supabaseClient.from('article').select('id, doi');
      if (error) return addToast('Erro ao buscar dados.', 'error');
      const toUpdate = data.filter((a) => !a.doi || a.doi.trim() === '' || a.doi.trim().toUpperCase() === 'AUSENTE');
      if (toUpdate.length === 0) return addToast('Todos os registros já têm DOI.', 'success');
      if (!window.confirm(`🔗 ${toUpdate.length} registos sem DOI. Preencher com "SEM DADOS"?`)) return;
      addToast('A preencher…', 'info');
      let errors = 0;
      await Promise.all(toUpdate.map(async (a) => {
        const { error: err } = await supabaseClient.from('article').update({ doi: 'SEM DADOS' }).eq('id', a.id);
        if (err) errors++;
      }));
      if (errors) addToast(`${errors} falharam.`, 'error');
      else addToast(`🔗 ${toUpdate.length} registos atualizados.`, 'success');
      fetchArticles();
    },
  }), []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">⚡</div>
            <h2>Analytics Hub</h2>
          </div>
          <div className="sidebar-tagline">ETL & Data Cleansing</div>
        </div>
        <div className="sidebar-content">
          <div className="section-label">Navegação</div>
          <button className="btn-pipe btn-nav" onClick={() => window.location.assign('/')}>🏠 Dashboard</button>
          <button className="btn-pipe btn-nav" onClick={toggleForm}>＋ Inserir Novo Registo</button>
          <div className="sidebar-divider" />
          <div className="section-label">Pipelines</div>
          <button className="btn-pipe btn-rose"   onClick={pipelines.limparDadosSemAbstract}>🧹 Limpar Abstracts Ausentes</button>
          <button className="btn-pipe btn-sky"    onClick={pipelines.preencherAcesso}>🔒 Preencher Acesso Ausente</button>
          <button className="btn-pipe btn-violet" onClick={pipelines.preencherDOI}>🔗 Preencher DOI Ausente</button>
        </div>
      </aside>

      <main className="main-content">
        <nav className="top-nav">
          <div className="top-nav-title">🗂️ Data Grid: Artigos da Base</div>
          <div className="live-badge"><span className="live-dot" /> Live Sync</div>
        </nav>

        <div className="grid-wrapper">
          <section id="form-section" className={showForm ? 'active' : ''}>
            <div className="form-header">
              <h4>Novo Registo</h4>
              <button className="btn-close-form" onClick={toggleForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Título *</label>
                  <input name="title" value={formData.title} onChange={handleInput} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Source Title</label>
                  <input name="sourceTitle" value={formData.sourceTitle} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Ano</label>
                  <input type="number" name="year" value={formData.year} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Citações</label>
                  <input type="number" name="qtCited" value={formData.qtCited} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>DOI</label>
                  <input name="doi" value={formData.doi} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Link</label>
                  <input type="url" name="link" value={formData.link} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>ISSN</label>
                  <input name="issn" value={formData.issn} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Idioma</label>
                  <input name="language" value={formData.language} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Tipo de Documento</label>
                  <input name="docType" value={formData.docType} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Tipo de Acesso</label>
                  <input name="accessType" value={formData.accessType} onChange={handleInput} />
                </div>
              </div>
              <div className="form-group">
                <label>Abstract</label>
                <textarea name="abstract" rows="3" value={formData.abstract} onChange={handleInput} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-form btn-form-secondary" onClick={() => setFormData(initialForm)}>Limpar</button>
                <button type="submit" className="btn-form btn-form-primary">Inserir na Base</button>
              </div>
            </form>
          </section>

          <div className="database-container">
            <table className="db-grid" style={{ width: '2100px' }}>
              <colgroup>
                <col style={{ width: 60 }} />
                <col style={{ width: 300 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 500 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 120 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Ano</th>
                  <th>Source Title</th>
                  <th>Citações</th>
                  <th>DOI</th>
                  <th>Link</th>
                  <th>Abstract</th>
                  <th>ISSN</th>
                  <th>Idioma</th>
                  <th>Doc Type</th>
                  <th>Acesso</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {loading ? (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>A sincronizar…</td></tr>
                ) : articles.length === 0 ? (
                  <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Base de dados vazia.</td></tr>
                ) : (
                  articles.map((a) => (
                    <tr key={a.id}>
                      <td><span className="cell-id">{a.id}</span></td>
                      {renderCell(a.title)}
                      {renderCell(a.year)}
                      {renderCell(a.source_title)}
                      <td style={{ color: 'var(--text-secondary)' }}>{a.qt_cited || 0}</td>
                      {renderCell(a.doi, 'link', a.doi && a.doi !== 'SEM DADOS' ? `https://doi.org/${a.doi}` : '')}
                      {renderCell(a.link, 'link', a.link)}
                      {renderCell(a.abstract, 'abstract')}
                      {renderCell(a.issn)}
                      {renderCell(a.language)}
                      {renderCell(a.document_type)}
                      {renderCell(a.publication_access)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}