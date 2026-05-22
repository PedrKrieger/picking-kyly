import { useState } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading';
import MensagemColetor from '../../components/MensagemColetor';

function LoginColetor({ onLogin }) {
  const [codigoSupervisor, setCodigoSupervisor] = useState('');
  const [codigoUsuario, setCodigoUsuario] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar(event) {
    event.preventDefault();
    setErro('');

    if (!codigoSupervisor.trim() || !codigoUsuario.trim()) {
      setErro('Informe o código do supervisor e do usuário.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/auth/login-coletor', {
        codigoSupervisor: codigoSupervisor.trim(),
        codigoUsuario: codigoUsuario.trim()
      });

      localStorage.setItem('pickingSupervisor', JSON.stringify(response.data.supervisor));
      localStorage.setItem('pickingUsuario', JSON.stringify(response.data.usuario));

      onLogin(response.data.usuario, response.data.supervisor);
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível entrar no coletor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="coletor-screen">
      <section className="coletor-panel">
        <div className="coletor-title">
          <span>Coletor industrial</span>
          <h1>Login</h1>
        </div>

        <form onSubmit={entrar} className="coletor-form">
          <label>
            Código do supervisor
            <input
              autoFocus
              value={codigoSupervisor}
              onChange={(event) => setCodigoSupervisor(event.target.value)}
              placeholder="SUP001"
            />
          </label>

          <label>
            Código do usuário
            <input
              value={codigoUsuario}
              onChange={(event) => setCodigoUsuario(event.target.value)}
              placeholder="USR001"
            />
          </label>

          <MensagemColetor tipo="erro" texto={erro} />

          <button type="submit" className="btn-coletor btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {loading && <Loading texto="Validando códigos..." />}
      </section>
    </main>
  );
}

export default LoginColetor;
