import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import LayoutAdmin from '../../components/LayoutAdmin';
import CardDashboard from '../../components/CardDashboard';
import Loading from '../../components/Loading';

function numero(valor) {
  return Number(valor || 0);
}

function percentual(parte, total) {
  if (!total) {
    return 0;
  }

  return Math.round((parte / total) * 100);
}

function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const response = await api.get('/api/admin/dashboard');
        setDados(response.data);
      } catch (error) {
        setErro(error.response?.data?.erro || 'Erro ao carregar dashboard.');
      } finally {
        setLoading(false);
      }
    }

    carregarDashboard();
  }, []);

  const indicadores = useMemo(() => {
    const totalCaixas = numero(dados?.total_caixas);
    const finalizadas = numero(dados?.total_caixas_finalizadas);
    const parciais = numero(dados?.total_caixas_parciais);
    const aguardando = numero(dados?.total_caixas_aguardando);
    const emColeta = numero(dados?.total_caixas_em_coleta);

    return {
      totalCaixas,
      finalizadas,
      parciais,
      aguardando,
      emColeta,
      pendentes: aguardando + emColeta,
      percentualFinalizadas: percentual(finalizadas, totalCaixas),
      percentualParciais: percentual(parciais, totalCaixas)
    };
  }, [dados]);

  return (
    <LayoutAdmin titulo="Dashboard Operacional" ocultarCabecalho>
      <section className="dashboard-header">
        <div>
          <span>Sistema de Picking Kyly</span>
          <h2 className="dashboard-title">Dashboard Operacional</h2>
          <p className="dashboard-subtitle">Acompanhamento em tempo real do processo de picking</p>
        </div>
      </section>

      {loading && <Loading texto="Carregando indicadores..." />}
      {erro && <div className="admin-alert">{erro}</div>}

      {dados && (
        <>
          <section className="dashboard-grid">
            <CardDashboard
              titulo="Total de caixas"
              valor={indicadores.totalCaixas}
              legenda="Caixas cadastradas"
              icone="▦"
              variante="total"
            />
            <CardDashboard
              titulo="Aguardando"
              valor={dados.total_caixas_aguardando}
              legenda="Ainda não iniciadas"
              icone="◷"
              variante="aguardando"
            />
            <CardDashboard
              titulo="Em coleta"
              valor={dados.total_caixas_em_coleta}
              legenda="Picking em andamento"
              icone="▶"
              variante="coleta"
            />
            <CardDashboard
              titulo="Finalizadas"
              valor={dados.total_caixas_finalizadas}
              legenda="Concluídas"
              icone="✓"
              variante="finalizada"
            />
            <CardDashboard
              titulo="Parciais"
              valor={dados.total_caixas_parciais}
              legenda="Com divergência ou falta"
              icone="!"
              variante="parcial"
            />
            <CardDashboard
              titulo="Peças coletadas"
              valor={dados.total_pecas_coletadas}
              legenda="Peças bipadas com sucesso"
              icone="◆"
              variante="pecas"
            />
            <CardDashboard
              titulo="Ocorrências"
              valor={dados.total_ocorrencias}
              legenda="Registros operacionais"
              icone="!"
              variante="ocorrencia"
            />
          </section>

          <section className="dashboard-summary">
            <div className="summary-card">
              <span>Caixas finalizadas</span>
              <strong>{indicadores.percentualFinalizadas}%</strong>
              <small>{indicadores.finalizadas} de {indicadores.totalCaixas}</small>
            </div>
            <div className="summary-card">
              <span>Caixas parciais</span>
              <strong>{indicadores.percentualParciais}%</strong>
              <small>{indicadores.parciais} de {indicadores.totalCaixas}</small>
            </div>
            <div className="summary-card">
              <span>Caixas ainda pendentes</span>
              <strong>{indicadores.pendentes}</strong>
              <small>Aguardando ou em coleta</small>
            </div>
          </section>

          <section className="progress-container">
            <div className="progress-header">
              <div>
                <h3>Progresso geral das caixas finalizadas</h3>
                <p>{indicadores.finalizadas} finalizadas de {indicadores.totalCaixas} caixas</p>
              </div>
              <strong>{indicadores.percentualFinalizadas}%</strong>
            </div>
            <div className="progress-bar progress-bar-large">
              <span style={{ width: `${indicadores.percentualFinalizadas}%` }} />
            </div>
          </section>

          <section className="quick-actions">
            <div>
              <h3>Ações rápidas</h3>
              <p>Acesse as principais consultas administrativas.</p>
            </div>
            <div className="quick-actions-buttons">
              <Link className="admin-button" to="/admin/caixas">Ver caixas</Link>
              <Link className="admin-button" to="/admin/estoque">Ver estoque</Link>
              <Link className="admin-button" to="/admin/ocorrencias">Ver ocorrências</Link>
            </div>
          </section>
        </>
      )}
    </LayoutAdmin>
  );
}

export default Dashboard;
