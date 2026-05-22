import { useState } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading';
import MensagemColetor from '../../components/MensagemColetor';

function BiparPapeleta({ usuario, supervisor, onIniciarColeta, onSair }) {
  const [codigoPapeleta, setCodigoPapeleta] = useState('');
  const [caixa, setCaixa] = useState(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [iniciando, setIniciando] = useState(false);

  async function buscarCaixa(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setCaixa(null);

    if (!codigoPapeleta.trim()) {
      setErro('Informe o código da papeleta.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/caixas/papeleta/${encodeURIComponent(codigoPapeleta.trim())}`);
      setCaixa(response.data.caixa);
      localStorage.setItem('pickingCaixa', JSON.stringify(response.data.caixa));
      setMensagem('Caixa localizada.');
    } catch (error) {
      setErro(error.response?.data?.erro || 'Caixa não encontrada.');
    } finally {
      setLoading(false);
    }
  }

  async function iniciarColeta() {
    if (!caixa) {
      setErro('Busque uma caixa antes de iniciar.');
      return;
    }

    try {
      setIniciando(true);
      setErro('');
      const response = await api.post('/api/coletas/iniciar', {
        caixaId: caixa.id,
        usuarioId: usuario.id,
        supervisorId: supervisor.id
      });

      localStorage.setItem('pickingColetaId', String(response.data.coleta.id));
      onIniciarColeta(response.data.coleta.id, caixa);
    } catch (error) {
      setErro(error.response?.data?.erro || 'Não foi possível iniciar a coleta.');
    } finally {
      setIniciando(false);
    }
  }

  return (
    <main className="coletor-screen">
      <section className="coletor-panel">
        <div className="coletor-topbar">
          <div>
            <span>Operador</span>
            <strong>{usuario?.nome}</strong>
          </div>
          <button type="button" className="btn-small" onClick={onSair}>
            Sair
          </button>
        </div>

        <div className="coletor-title">
          <span>Etapa 2</span>
          <h1>Papeleta</h1>
        </div>

        <form onSubmit={buscarCaixa} className="coletor-form">
          <label>
            Código da papeleta
            <input
              autoFocus
              value={codigoPapeleta}
              onChange={(event) => setCodigoPapeleta(event.target.value)}
              placeholder="PAP0001"
            />
          </label>

          <button type="submit" className="btn-coletor btn-primary" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar caixa'}
          </button>
        </form>

        <MensagemColetor tipo="erro" texto={erro} />
        <MensagemColetor tipo="sucesso" texto={mensagem} />

        {loading && <Loading texto="Consultando papeleta..." />}

        {caixa && (
          <div className="caixa-resumo">
            <h2>Caixa encontrada</h2>
            <dl>
              <div>
                <dt>Papeleta</dt>
                <dd>{caixa.codigo_papeleta}</dd>
              </div>
              <div>
                <dt>Caixa</dt>
                <dd>{caixa.numero_caixa}</dd>
              </div>
              <div>
                <dt>Pedido</dt>
                <dd>{caixa.pedido}</dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{caixa.cliente}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{caixa.status}</dd>
              </div>
            </dl>

            <button type="button" className="btn-coletor btn-success" onClick={iniciarColeta} disabled={iniciando}>
              {iniciando ? 'Iniciando...' : 'Iniciar coleta'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default BiparPapeleta;
