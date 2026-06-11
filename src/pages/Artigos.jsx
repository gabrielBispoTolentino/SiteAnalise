import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient } from '../lib/supabase.js';
import PageShell from '../components/PageShell.jsx';

const initialForm = {
  title: '',
  sourceTitle: '',
  year: '',
  quotation: 0,
  doi: '',
  link: '',
  issn: '',
  isbn: '',
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
  const [hideRawColumns, setHideRawColumns] = useState(false);
  const tableBodyRef = useRef(null);

  useEffect(() => { fetchArticles(); }, []);

  const addToast = (message, type = 'info') => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  };

  async function fetchArticles() {
    setLoading(true);
    const { data, error } = await supabaseClient.from('Article').select('*').order('ID', { ascending: false });
    if (error) addToast('Erro ao sincronizar dados', 'error');
    else setArticles(data || []);
    setLoading(false);
  }

  const toggleForm = () => {
    setShowForm((state) => !state);
    if (showForm) setFormData(initialForm);
  };

  const resetForm = () => setFormData(initialForm);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      Title: formData.title || null,
      Year: parseInt(formData.year) || null,
      Source_Title: formData.sourceTitle || null,
      Quotation: parseInt(formData.quotation) || 0,
      DOI: formData.doi || null,
      Link: formData.link || null,
      Abstract: formData.abstract || null,
      ISSN: formData.issn || null,
      ISBN: formData.isbn || null,
      Language: formData.language || null,
      Document_Type: formData.docType || null,
      Access_Type: formData.accessType || null
    };

    const { error } = await supabaseClient.from('Article').insert([payload]);
    if (error) addToast(`Erro: ${error.message}`, 'error');
    else {
      addToast('Registo inserido com sucesso!', 'success');
      resetForm();
      setShowForm(false);
      fetchArticles();
    }
  }

  const renderCell = (value, type = 'default', linkUrl = '', isRaw = false) => {
    const missing = value === null || value === undefined || String(value).trim() === '';
    const hidden = isRaw && hideRawColumns ? ' hide-cols' : '';

    if (missing) {
      return <td className={`cell-missing${hidden}`}><span>[Ausente]</span></td>;
    }

    if (value === 'SEM DADOS') {
      return <td className={hidden}><span className="col-text-truncated cell-no-data">{value}</span></td>;
    }

    if (type === 'abstract') {
      return <td className={hidden}><span className="cell-abstract-expanded">{value}</span></td>;
    }

    if (type === 'link' && linkUrl) {
      return <td className={`cell-link${hidden}`}><span className="col-text-truncated"><a href={linkUrl} target="_blank" rel="noreferrer">{value}</a></span></td>;
    }

    return <td className={hidden}><span className="col-text-truncated" title={String(value)}>{value}</span></td>;
  };

  const dbWidth = hideRawColumns ? '2030px' : '2330px';

  const pipelines = useMemo(() => ({
    limparDadosSemAbstract: async () => {
      const { data, error } = await supabaseClient.from('Article').select('ID, Abstract');
      if (error) return addToast('Erro ao ler dados.', 'error');

      const ids = data.filter((article) => !article.Abstract || article.Abstract.trim() === '').map((article) => article.ID);
      if (ids.length === 0) return addToast('Nenhum registo sem Abstract.', 'success');
      if (!window.confirm(`⚠️ Excluir permanentemente ${ids.length} registo(s) sem Abstract?`)) return;

      const { error: delErr } = await supabaseClient.from('Article').delete().in('ID', ids);
      if (delErr) addToast(`Erro: ${delErr.message}`, 'error');
      else { addToast(`🧹 ${ids.length} registo(s) apagados.`, 'success'); fetchArticles(); }
    },

    padronizarIdentificadores: async () => {
      const { data, error } = await supabaseClient.from('Article').select('ID, ISSN, ISBN');
      if (error) return addToast('Erro ao buscar dados.', 'error');

      const toUpdate = data.filter((article) => (!article.ISSN || article.ISSN.trim() === '') && article.ISBN && article.ISBN.trim() !== '');
      if (toUpdate.length === 0) {
        addToast('Nenhum dado precisa de padronização — ocultando colunas originais.', 'info');
        setHideRawColumns(true);
        return;
      }

      if (!window.confirm(`✨ Consolidar ISSN com dados de ISBN em ${toUpdate.length} documento(s)?`)) return;
      addToast('A padronizar…', 'info');
      await Promise.all(toUpdate.map((article) => supabaseClient.from('Article').update({ ISSN: article.ISBN }).eq('ID', article.ID)));
      addToast('✨ Identificadores consolidados.', 'success');
      setHideRawColumns(true);
      fetchArticles();
    },

    preencherAcesso: async () => {
      const { data, error } = await supabaseClient.from('Article').select('ID, Access_Type');
      if (error) return addToast('Erro ao buscar dados.', 'error');

      const toUpdate = data.filter((article) => !article.Access_Type || article.Access_Type.trim() === '' || article.Access_Type.trim().toUpperCase() === 'AUSENTE');
      if (toUpdate.length === 0) return addToast('Todos os registros já têm dados de Acesso.', 'success');
      if (!window.confirm(`🔒 ${toUpdate.length} registos sem Acesso. Preencher com "SEM DADOS"?`)) return;

      addToast('A preencher…', 'info');
      let errors = 0;
      await Promise.all(toUpdate.map(async (article) => {
        const { error: err } = await supabaseClient.from('Article').update({ Access_Type: 'SEM DADOS' }).eq('ID', article.ID);
        if (err) errors += 1;
      }));
      if (errors) addToast(`${errors} falharam.`, 'error');
      else addToast(`🔒 ${toUpdate.length} registos atualizados.`, 'success');
      fetchArticles();
    },

    preencherDOI: async () => {
      const { data, error } = await supabaseClient.from('Article').select('ID, DOI');
      if (error) return addToast('Erro ao buscar dados.', 'error');

      const toUpdate = data.filter((article) => !article.DOI || article.DOI.trim() === '' || article.DOI.trim().toUpperCase() === 'AUSENTE');
      if (toUpdate.length === 0) return addToast('Todos os registros já têm DOI.', 'success');
      if (!window.confirm(`🔗 ${toUpdate.length} registos sem DOI. Preencher com "SEM DADOS"?`)) return;

      addToast('A preencher…', 'info');
      let errors = 0;
      await Promise.all(toUpdate.map(async (article) => {
        const { error: err } = await supabaseClient.from('Article').update({ DOI: 'SEM DADOS' }).eq('ID', article.ID);
        if (err) errors += 1;
      }));
      if (errors) addToast(`${errors} falharam.`, 'error');
      else addToast(`🔗 ${toUpdate.length} registos atualizados.`, 'success');
      fetchArticles();
    }
  }), [hideRawColumns]);

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
          <button className="btn-pipe btn-rose" onClick={pipelines.limparDadosSemAbstract}>🧹 Limpar Abstracts Ausentes</button>
          <button className="btn-pipe btn-amber" onClick={pipelines.padronizarIdentificadores}>✨ Padronizar ISSN / ISBN</button>
          <button className="btn-pipe btn-sky" onClick={pipelines.preencherAcesso}>🔒 Preencher Acesso Ausente</button>
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
            <form id="article-form" onSubmit={handleSubmit}>
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
                  <input type="number" name="quotation" value={formData.quotation} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>DOI</label>
                  <input name="doi" value={formData.doi} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>Link Documento</label>
                  <input type="url" name="link" value={formData.link} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>ISSN</label>
                  <input name="issn" value={formData.issn} onChange={handleInput} />
                </div>
                <div className="form-group">
                  <label>ISBN</label>
                  <input name="isbn" value={formData.isbn} onChange={handleInput} />
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
                <button type="button" className="btn-form btn-form-secondary" onClick={resetForm}>Limpar</button>
                <button type="submit" className="btn-form btn-form-primary">Inserir na Base</button>
              </div>
            </form>
          </section>

          <div className="database-container">
            <table className="db-grid" id="main-db-grid" style={{ width: dbWidth }}>
              <colgroup>
                <col style={{ width: 60 }} />
                <col style={{ width: 300 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 90 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 500 }} />
                <col style={{ width: 150 }} className="col-consolidada" />
                <col style={{ width: 150 }} className="col-bruta" />
                <col style={{ width: 150 }} className="col-bruta" />
                <col style={{ width: 100 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 100 }} />
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
                  <th className="col-consolidada">ISSN/ISBN</th>
                  <th className="col-bruta">ISSN</th>
                  <th className="col-bruta">ISBN</th>
                  <th>Idioma</th>
                  <th>Doc Type</th>
                  <th>Acesso</th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef}>
                {loading ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      A sincronizar com Supabase…
                    </td>
                  </tr>
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Base de dados vazia.
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => {
                    const consolidated = article.ISSN ? article.ISSN : article.ISBN || null;
                    return (
                      <tr key={article.ID}>
                        <td><span className="cell-id">{article.ID}</span></td>
                        {renderCell(article.Title)}
                        {renderCell(article.Year)}
                        {renderCell(article.Source_Title)}
                        <td style={{ color: 'var(--text-secondary)' }}>{article.Quotation || 0}</td>
                        {renderCell(article.DOI, 'link', article.DOI && article.DOI !== 'SEM DADOS' ? `https://doi.org/${article.DOI}` : '')}
                        {renderCell(article.Link, 'link', article.Link)}
                        {renderCell(article.Abstract, 'abstract')}
                        {renderCell(consolidated)}
                        {renderCell(article.ISSN, 'default', '', true)}
                        {renderCell(article.ISBN, 'default', '', true)}
                        {renderCell(article.Language)}
                        {renderCell(article.Document_Type)}
                        {renderCell(article.Access_Type)}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <div id="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
