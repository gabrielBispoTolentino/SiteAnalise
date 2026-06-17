import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase.js';
import PageShell from '../components/PageShell.jsx';

export default function PalavrasChave() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKeywords() {
      const { data: relations, error: relErr } = await supabaseClient.from('article_keywords').select('id_keywords');
      const { data: keywordsData, error: kwErr } = await supabaseClient.from('keywords').select('id, keywords');
      if (relErr || kwErr || !relations || !keywordsData) {
        setKeywords([]);
        setLoading(false);
        return;
      }

      const counts = {};
      relations.forEach((relation) => {
        counts[relation.id_keywords] = (counts[relation.id_keywords] || 0) + 1;
      });

      const ranking = keywordsData
        .map((kw) => ({ text: kw.keywords, count: counts[kw.id] || 0 }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      setKeywords(ranking);
      setLoading(false);
    }
    loadKeywords();
  }, []);

  return (
    <PageShell title="Ranking de Palavras-chave" description="Abaixo estão as palavras-chave mais utilizadas nos seus artigos (Top 50)." backPath="/">
      <div className="table-wrapper">
        <table className="db-grid">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Palavra-chave</th>
              <th>Quantidade de Artigos</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} aria-busy="true">
                  Calculando ranking...
                </td>
              </tr>
            ) : keywords.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  Nenhuma palavra-chave encontrada.
                </td>
              </tr>
            ) : (
              keywords.map((item, index) => (
                <tr key={`${item.text}-${index}`}>
                  <td>#{index + 1}</td>
                  <td style={{ textTransform: 'capitalize' }}>{item.text}</td>
                  <td>
                    <strong>{item.count}</strong> vezes
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
