import { useEffect, useState } from 'react';
import api from '../../services/api';
import LayoutAdmin from '../../components/LayoutAdmin';
import Loading from '../../components/Loading';

function formatarData(valor) {
  if (!valor) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(valor));
}

function Ocorrencias() {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarOcorrencias() {
      try {
        const response = await api.get('/api/admin/ocorrencias');
        setOcorrencias(response.data.ocorrencias || []);
      } catch (error) {
        setErro(error.response?.data?.erro || 'Erro ao listar ocorrências.');
      } finally {
        setLoading(false);
      }
    }

    carregarOcorrencias();
  }, []);

  return (
    <LayoutAdmin titulo="Ocorrências">
      {loading && <Loading texto="Carregando ocorrências..." />}
      {erro && <div className="admin-alert">{erro}</div>}

      {!loading && !erro && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Caixa</th>
                <th>Produto</th>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {ocorrencias.map((ocorrencia) => (
                <tr key={ocorrencia.id}>
                  <td>{ocorrencia.codigo_papeleta || ocorrencia.caixa_id}</td>
                  <td>
                    {ocorrencia.referencia
                      ? `${ocorrencia.referencia} - ${ocorrencia.cor || ''} ${ocorrencia.tamanho || ''}`
                      : '-'}
                  </td>
                  <td>{ocorrencia.usuario_nome || '-'}</td>
                  <td>
                    <span className="status status-parcial">{ocorrencia.tipo}</span>
                  </td>
                  <td>{ocorrencia.descricao}</td>
                  <td>{formatarData(ocorrencia.data_hora)}</td>
                </tr>
              ))}

              {ocorrencias.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">
                    Nenhuma ocorrência encontrada.
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

export default Ocorrencias;
