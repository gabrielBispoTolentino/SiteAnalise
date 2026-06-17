import { useEffect, useState } from 'react';
import { supabaseClient } from '../lib/supabase.js';
import PageShell from '../components/PageShell.jsx';

export default function Autores() {
  const [autores, setAutores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabaseClient.from('author').select('id, nome, nome_completo')
      if (!error && data) setAutores(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <PageShell title="Banco de Autores" description="Dados sincronizados com Supabase" backPath="/">
      <div className="database-container">
        <table className="db-grid">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Scopus ID</th>
              <th style={{ width: 300 }}>Nome Curto</th>
              <th>Nome Completo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando autores...
                </td>
              </tr>
            ) : autores.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhum autor encontrado.
                </td>
              </tr>
            ) : (
              autores.map((autor) => (
                <tr key={autor.id}>
                  <td>{autor.id}</td>
                  <td>{autor.nome}</td>
                  <td>{autor.nome_completo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
