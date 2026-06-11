import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Artigos from './pages/Artigos.jsx';
import Autores from './pages/Autores.jsx';
import PalavrasChave from './pages/PalavrasChave.jsx';
import Importar from './pages/Importar.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/artigos" element={<Artigos />} />
      <Route path="/autores" element={<Autores />} />
      <Route path="/palavras-chave" element={<PalavrasChave />} />
      <Route path="/importar" element={<Importar />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
