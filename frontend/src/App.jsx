import { Navigate, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import LoginColetor from './pages/coletor/LoginColetor';
import BiparPapeleta from './pages/coletor/BiparPapeleta';
import Coleta from './pages/coletor/Coleta';
import Dashboard from './pages/admin/Dashboard';
import Caixas from './pages/admin/Caixas';
import Ocorrencias from './pages/admin/Ocorrencias';
import Estoque from './pages/admin/Estoque';

function lerJsonLocalStorage(chave) {
  try {
    const valor = localStorage.getItem(chave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function ColetorFlow() {
  const [usuario, setUsuario] = useState(() => lerJsonLocalStorage('pickingUsuario'));
  const [supervisor, setSupervisor] = useState(() => lerJsonLocalStorage('pickingSupervisor'));
  const [caixa, setCaixa] = useState(() => lerJsonLocalStorage('pickingCaixa'));
  const [coletaId, setColetaId] = useState(() => localStorage.getItem('pickingColetaId'));

  function handleLogin(usuarioLogado, supervisorLogado) {
    setUsuario(usuarioLogado);
    setSupervisor(supervisorLogado);
  }

  function handleIniciarColeta(novoColetaId, caixaAtual) {
    setColetaId(String(novoColetaId));
    setCaixa(caixaAtual);
  }

  function limparCaixa() {
    localStorage.removeItem('pickingCaixa');
    localStorage.removeItem('pickingColetaId');
    setCaixa(null);
    setColetaId(null);
  }

  function sair() {
    localStorage.removeItem('pickingUsuario');
    localStorage.removeItem('pickingSupervisor');
    limparCaixa();
    setUsuario(null);
    setSupervisor(null);
  }

  if (!usuario || !supervisor) {
    return <LoginColetor onLogin={handleLogin} />;
  }

  if (!coletaId) {
    return (
      <BiparPapeleta
        usuario={usuario}
        supervisor={supervisor}
        onIniciarColeta={handleIniciarColeta}
        onSair={sair}
      />
    );
  }

  return (
    <Coleta
      coletaId={coletaId}
      caixa={caixa}
      onNovaCaixa={limparCaixa}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/coletor" replace />} />
      <Route path="/coletor" element={<ColetorFlow />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/caixas" element={<Caixas />} />
      <Route path="/admin/estoque" element={<Estoque />} />
      <Route path="/admin/ocorrencias" element={<Ocorrencias />} />
      <Route path="*" element={<Navigate to="/coletor" replace />} />
    </Routes>
  );
}

export default App;
