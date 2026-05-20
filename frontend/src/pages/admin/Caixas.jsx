import { useEffect, useState } from 'react';
import api from '../../services/api';
import LayoutAdmin from '../../components/LayoutAdmin';
import Loading from '../../components/Loading';

function Caixas() {
  const [caixas, setCaixas] = useState([]);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarCaixas() {
      try {
        const response = await api.get('/api/admin/caixas');
        setCaixas(response.data.caixas || []);
      } catch (error) {
        setErro(error.response?.data?.erro || 'Erro ao listar caixas.');
      } finally {
        setLoading(false);
      }
    }

    carregarCaixas();
  }, []);

  return (
    <LayoutAdmin titulo="Caixas">
      {loading && <Loading texto="Carregando caixas..." />}
      {erro && <div className="admin-alert">{erro}</div>}

      {!loading && !erro && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Papeleta</th>
                <th>Caixa</th>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Itens</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {caixas.map((caixa) => (
                <tr key={caixa.id}>
                  <td>{caixa.codigo_papeleta}</td>
                  <td>{caixa.numero_caixa}</td>
                  <td>{caixa.pedido}</td>
                  <td>{caixa.cliente}</td>
                  <td>
                    <span className={`status status-${String(caixa.status).toLowerCase()}`}>
                      {caixa.status}
                    </span>
                  </td>
                  <td>{caixa.quantidade_itens}</td>
                  <td>
                    <div className="progress-wrap">
                      <div className="progress-bar">
                        <span style={{ width: `${Number(caixa.percentual_progresso || 0)}%` }} />
                      </div>
                      <strong>{caixa.percentual_progresso || 0}%</strong>
                    </div>
                  </td>
                </tr>
              ))}

              {caixas.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-row">
                    Nenhuma caixa encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </LayoutAdmin>
  );
}

export default Caixas;
