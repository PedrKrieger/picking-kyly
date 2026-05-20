import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import LayoutAdmin from '../../components/LayoutAdmin';
import CardDashboard from '../../components/CardDashboard';
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

function statusClasse(status) {
  return `status status-${String(status || '').toLowerCase()}`;
}

function textoStatusConsulta(status) {
  if (status === 'DISPONIVEL') {
    return 'Disponivel em estoque';
  }

  if (status === 'COLETADA') {
    return 'Peca ja coletada';
  }

  return status || 'Status nao informado';
}

function Estoque() {
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [produtoAberto, setProdutoAberto] = useState(null);
  const [pecasProduto, setPecasProduto] = useState([]);
  const [loadingPecas, setLoadingPecas] = useState(false);
  const [erroPecas, setErroPecas] = useState('');

  const [codigoPeca, setCodigoPeca] = useState('');
  const [pecaConsultada, setPecaConsultada] = useState(null);
  const [loadingPeca, setLoadingPeca] = useState(false);
  const [erroPeca, setErroPeca] = useState('');

  const resumo = useMemo(() => {
    return produtos.reduce(
      (total, produto) => ({
        totalProdutos: total.totalProdutos + 1,
        disponiveis: total.disponiveis + Number(produto.total_disponivel || 0),
        solicitadas: total.solicitadas + Number(produto.quantidade_solicitada_caixas || 0),
        coletadasCaixas: total.coletadasCaixas + Number(produto.quantidade_coletada_caixas || 0),
        saldo: total.saldo + Number(produto.saldo_disponivel_estimado || 0)
      }),
      {
        totalProdutos: 0,
        disponiveis: 0,
        solicitadas: 0,
        coletadasCaixas: 0,
        saldo: 0
      }
    );
  }, [produtos]);

  async function carregarEstoque(filtros = {}) {
    try {
      setLoading(true);
      setErro('');
      setProdutoAberto(null);
      setPecasProduto([]);

      const response = await api.get('/api/admin/estoque', {
        params: {
          busca: filtros.busca || undefined
        }
      });

      setProdutos(response.data.data || []);
    } catch (error) {
      setErro(error.response?.data?.message || 'Erro ao carregar estoque.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarEstoque();
  }, []);

  function pesquisar(event) {
    event.preventDefault();
    carregarEstoque({
      busca: busca.trim()
    });
  }

  function limparFiltros() {
    setBusca('');
    carregarEstoque();
  }

  async function verPecas(produto) {
    if (produtoAberto?.produto_id === produto.produto_id) {
      setProdutoAberto(null);
      setPecasProduto([]);
      return;
    }

    try {
      setProdutoAberto(produto);
      setLoadingPecas(true);
      setErroPecas('');

      const response = await api.get(`/api/admin/estoque/produto/${produto.produto_id}/pecas`);
      setPecasProduto(response.data.data || []);
    } catch (error) {
      setErroPecas(error.response?.data?.message || 'Erro ao carregar pecas do produto.');
    } finally {
      setLoadingPecas(false);
    }
  }

  async function consultarPeca(event) {
    event.preventDefault();
    setErroPeca('');
    setPecaConsultada(null);

    if (!codigoPeca.trim()) {
      setErroPeca('Informe o codigo da peca.');
      return;
    }

    try {
      setLoadingPeca(true);
      const response = await api.get(`/api/admin/estoque/peca/${encodeURIComponent(codigoPeca.trim())}`);
      setPecaConsultada(response.data.data);
    } catch (error) {
      setErroPeca(error.response?.data?.message || 'Peca nao encontrada.');
    } finally {
      setLoadingPeca(false);
    }
  }

  return (
    <LayoutAdmin titulo="Controle de Estoque">
      <form className="estoque-filtros estoque-filtros-simples" onSubmit={pesquisar}>
        <label>
          Busca
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar por referencia, descricao, SKU, cor, tamanho ou codigo da peca"
          />
        </label>

        <div className="estoque-filtros-acoes">
          <button type="submit">Pesquisar</button>
          <button type="button" className="btn-outline" onClick={limparFiltros}>Limpar</button>
        </div>
      </form>

      <form className="consulta-peca" onSubmit={consultarPeca}>
        <label>
          Consultar peca pelo codigo
          <input
            value={codigoPeca}
            onChange={(event) => setCodigoPeca(event.target.value)}
            placeholder="EST-1000079-0001"
          />
        </label>
        <button type="submit" disabled={loadingPeca}>
          {loadingPeca ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {erroPeca && <div className="admin-alert">{erroPeca}</div>}

      {pecaConsultada && (
        <section className="peca-card">
          <div>
            <span>Codigo da peca</span>
            <strong>{pecaConsultada.codigo_barras_unico}</strong>
            <small>{pecaConsultada.codigo_barras_secundario || 'Sem codigo secundario'}</small>
          </div>
          <div>
            <span>Status</span>
            <span className={statusClasse(pecaConsultada.status)}>
              {textoStatusConsulta(pecaConsultada.status)}
            </span>
            <small>{pecaConsultada.status_mensagem}</small>
          </div>
          <div>
            <span>Produto</span>
            <strong>{pecaConsultada.produto?.referencia}</strong>
            <small>
              {pecaConsultada.produto?.descricao} | {pecaConsultada.produto?.cor} | {pecaConsultada.produto?.tamanho} | SKU {pecaConsultada.produto?.codigo_sku}
            </small>
          </div>

          {pecaConsultada.coleta && (
            <div className="peca-coleta">
              <span>Coleta</span>
              <strong>
                Caixa {pecaConsultada.coleta.caixa?.codigo_papeleta || pecaConsultada.coleta.caixa?.id}
              </strong>
              <small>
                Pedido {pecaConsultada.coleta.caixa?.pedido || '-'} | Usuario {pecaConsultada.coleta.usuario?.nome || '-'} | {formatarData(pecaConsultada.coleta.data_bipagem)}
              </small>
            </div>
          )}
        </section>
      )}

      <section className="dashboard-grid estoque-resumo">
        <CardDashboard titulo="Produtos com estoque" valor={resumo.totalProdutos} />
        <CardDashboard titulo="Pecas disponiveis" valor={resumo.disponiveis} />
        <CardDashboard titulo="Solicitadas em caixas" valor={resumo.solicitadas} />
        <CardDashboard titulo="Coletadas em caixas" valor={resumo.coletadasCaixas} />
        <CardDashboard titulo="Saldo disponivel" valor={resumo.saldo} />
      </section>

      {loading && <Loading texto="Carregando estoque..." />}
      {erro && <div className="admin-alert">{erro}</div>}

      {!loading && !erro && (
        <div className="table-card estoque-table">
          <table>
            <thead>
              <tr>
                <th>Referencia</th>
                <th>Descricao</th>
                <th>Cor</th>
                <th>Tamanho</th>
                <th>Codigo SKU</th>
                <th>Pecas disponiveis</th>
                <th>Solicitadas</th>
                <th>Coletadas caixas</th>
                <th>Saldo</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.produto_id}>
                  <td>{produto.referencia}</td>
                  <td>{produto.descricao}</td>
                  <td>{produto.cor}</td>
                  <td>{produto.tamanho}</td>
                  <td>{produto.codigo_sku}</td>
                  <td>{produto.total_disponivel}</td>
                  <td>{produto.quantidade_solicitada_caixas}</td>
                  <td>{produto.quantidade_coletada_caixas}</td>
                  <td>{produto.saldo_disponivel_estimado}</td>
                  <td>
                    <button type="button" className="table-action" onClick={() => verPecas(produto)}>
                      {produtoAberto?.produto_id === produto.produto_id ? 'Fechar' : 'Ver pecas'}
                    </button>
                  </td>
                </tr>
              ))}

              {produtos.length === 0 && (
                <tr>
                  <td colSpan="10" className="empty-row">
                    Nenhum produto com estoque disponivel encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {produtoAberto && (
        <section className="pecas-produto">
          <div className="pecas-produto-header">
            <div>
              <span>Pecas disponiveis do produto</span>
              <h2>{produtoAberto.referencia} - {produtoAberto.cor} - {produtoAberto.tamanho}</h2>
            </div>
            <button type="button" className="btn-outline" onClick={() => setProdutoAberto(null)}>
              Fechar
            </button>
          </div>

          {loadingPecas && <Loading texto="Carregando pecas..." />}
          {erroPecas && <div className="admin-alert">{erroPecas}</div>}

          {!loadingPecas && !erroPecas && (
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Codigo unico</th>
                    <th>Codigo secundario</th>
                    <th>Status</th>
                    <th>Criacao</th>
                    <th>Atualizacao</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasProduto.map((peca) => (
                    <tr key={peca.id}>
                      <td>{peca.codigo_barras_unico}</td>
                      <td>{peca.codigo_barras_secundario || '-'}</td>
                      <td><span className={statusClasse(peca.status)}>Disponivel</span></td>
                      <td>{formatarData(peca.data_criacao)}</td>
                      <td>{formatarData(peca.data_atualizacao)}</td>
                    </tr>
                  ))}

                  {pecasProduto.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-row">
                        Nenhuma peca disponivel para este produto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </LayoutAdmin>
  );
}

export default Estoque;
