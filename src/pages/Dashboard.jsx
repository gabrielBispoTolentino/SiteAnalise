import { Link } from 'react-router-dom';

const items = [
  { href: '/artigos', icon: '📄', title: 'Artigos', description: 'Gerenciar publicações' },
  { href: '/autores', icon: '👥', title: 'Autores', description: 'Banco de pesquisadores' },
  { href: '/palavras-chave', icon: '🎯', title: 'Palavras-chave', description: 'Ranking e tendências' },
  { href: '/importar', icon: '☁️', title: 'Importar Dados', description: 'Carga via CSV do Scopus', primary: true }
];

export default function Dashboard() {
  return (
    <main className="container">
      <header className="dashboard-header">
        <h1>Analytics Hub</h1>
        <p>Sistema de Gerenciamento de Pesquisa e Dados</p>
      </header>

      <div className="grid-cards">
        {items.map((item) => (
          <Link key={item.href} to={item.href} className={`dash-card card${item.primary ? ' primary' : ''}`}>
            <article>
              <span className="icon">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
