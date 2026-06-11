import { Link } from 'react-router-dom';
import ToastContainer from './ToastContainer.jsx';

export default function PageShell({ title, description, backPath = '/', children, toasts = [] }) {
  return (
    <div className="page-shell">
      <nav className="top-nav">
        <div className="top-nav-title">{title}</div>
        <div className="live-badge">
          <span className="live-dot"></span>
          Live Sync
        </div>
      </nav>
      <main className="main-content page-content">
        <div className="page-header">
          <Link to={backPath} className="link secondary">
            ← Voltar ao Menu
          </Link>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        {children}
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
