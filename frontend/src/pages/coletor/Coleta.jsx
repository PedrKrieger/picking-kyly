import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Loading from '../../components/Loading';
import MensagemColetor from '../../components/MensagemColetor';

function Coleta({ coletaId, caixa, onNovaCaixa }) {
  const [itemAtual, setItemAtual] = useState(null);
  const [codigoPeca, setCodigoPeca] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('alerta');
  const [loading, setLoading] = useState(false);
  const [acaoLoading, setAcaoLoading] = useState('');
  const inputRef = useRef(null);

  function obterItemDaResposta(data) {
    if (data?.temItem === false) {
      return null;
    }

    return data?.item || data?.proximoItem || null;
  }

  async function carregarProximoItem() {
    try {
      setLoading(true);
      const response = await api.get(`/api/coletas/${coletaId}/proximo-item`);
      const proximoItem = obterItemDaResposta(response.data);
      setItemAtual(proximoItem);

      if (!proximoItem) {
        setTipoMensagem('alerta');
        setMensagem(response.data.message || response.data.mensagem || 'Sem item pendente. Finalize a caixa.');
      }
    } catch (error) {
      setTipoMensagem('erro');
      setMensagem(error.response?.data?.erro || 'Erro ao carregar próximo item.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarProximoItem();
  }, [coletaId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [itemAtual]);

  async function biparPeca(event) {
    event.preventDefault();

    if (!codigoPeca.trim()) {
      setTipoMensagem('erro');
      setMensagem('Informe o código da peça.');
      return;
    }

    if (!itemAtual) {
      setTipoMensagem('erro');
      setMensagem('Não existe item atual para bipar.');
      return;
    }

    try {
      setAcaoLoading('bipar');
      const response = await api.post('/api/coletas/bipar-peca', {
        coletaId: Number(coletaId),
        caixaItemId: Number(itemAtual.caixa_item_id || itemAtual.id),
        codigoPeca: codigoPeca.trim()
      });

      setTipoMensagem(response.data.success || response.data.sucesso ? 'sucesso' : 'erro');
      setMensagem(response.data.message || response.data.mensagem);
      setItemAtual(obterItemDaResposta(response.data));
      setCodigoPeca('');
    } catch (error) {
      const data = error.response?.data;
      setTipoMensagem('erro');
      setMensagem(data?.mensagem || data?.erro || 'Erro ao bipar peça.');
      const proximoItem = obterItemDaResposta(data);
      if (proximoItem) {
        setItemAtual(proximoItem);
      }
      setCodigoPeca('');
    } finally {
      setAcaoLoading('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function pularItem() {
    if (!itemAtual) {
      setTipoMensagem('erro');
      setMensagem('Não existe item atual para pular.');
      return;
    }

    try {
      setAcaoLoading('pular');
      const response = await api.post('/api/coletas/pular-item', {
        coletaId: Number(coletaId),
        caixaItemId: itemAtual.caixa_item_id || itemAtual.id,
        motivo: 'Falta de peça no endereço'
      });

      setTipoMensagem('alerta');
      setMensagem(response.data.mensagem);
      setItemAtual(obterItemDaResposta(response.data));
    } catch (error) {
      setTipoMensagem('erro');
      setMensagem(error.response?.data?.erro || 'Erro ao pular item.');
    } finally {
      setAcaoLoading('');
    }
  }

  async function finalizarCaixa() {
    try {
      setAcaoLoading('finalizar');
      const response = await api.post('/api/coletas/finalizar', {
        coletaId: Number(coletaId)
      });

      setTipoMensagem(response.data.caixa?.status === 'FINALIZADA' ? 'sucesso' : 'alerta');
      setMensagem(response.data.mensagem);
      setItemAtual(null);
    } catch (error) {
      setTipoMensagem('erro');
      setMensagem(error.response?.data?.erro || 'Erro ao finalizar caixa.');
    } finally {
      setAcaoLoading('');
    }
  }

  async function salvarParcial() {
    try {
      setAcaoLoading('parcial');
      const response = await api.post('/api/coletas/salvar-parcial', {
        coletaId: Number(coletaId),
        observacao: 'Coleta salva parcialmente pelo operador.'
      });

      setTipoMensagem('alerta');
      setMensagem(response.data.mensagem);
      setItemAtual(null);
    } catch (error) {
      setTipoMensagem('erro');
      setMensagem(error.response?.data?.erro || 'Erro ao salvar parcial.');
    } finally {
      setAcaoLoading('');
    }
  }

  return (
    <main className="coletor-screen">
      <section className="coletor-panel coleta-panel">
        <div className="coletor-topbar">
          <div>
            <span>Caixa</span>
            <strong>{caixa?.codigo_papeleta || 'Em coleta'}</strong>
          </div>
          <button type="button" className="btn-small" onClick={onNovaCaixa}>
            Nova caixa
          </button>
        </div>

        <MensagemColetor tipo={tipoMensagem} texto={mensagem} />

        {loading && <Loading texto="Carregando próximo item..." />}

        {itemAtual ? (
          <div className="item-atual">
            {itemAtual.status === 'PULADO' && (
              <MensagemColetor
                tipo="alerta"
                texto="Este item foi pulado anteriormente e voltou para nova tentativa de coleta."
              />
            )}

            <div className="endereco-destaque">
              <span>Endereço</span>
              <strong>{itemAtual.endereco_detalhe?.codigo || itemAtual.endereco?.codigo || itemAtual.endereco}</strong>
              <small>{itemAtual.endereco_detalhe?.descricao || itemAtual.endereco?.descricao}</small>
            </div>

            <div className="produto-grid">
              <div>
                <span>Referência</span>
                <strong>{itemAtual.referencia || itemAtual.produto?.referencia}</strong>
              </div>
              <div>
                <span>Cor</span>
                <strong>{itemAtual.cor || itemAtual.produto?.cor}</strong>
              </div>
              <div>
                <span>Tamanho</span>
                <strong>{itemAtual.tamanho || itemAtual.produto?.tamanho}</strong>
              </div>
              <div>
                <span>Qtd.</span>
                <strong>{itemAtual.quantidade_coletada}/{itemAtual.quantidade_solicitada}</strong>
              </div>
            </div>

            <form onSubmit={biparPeca} className="coletor-form">
              <label>
                Código da peça
                <input
                  ref={inputRef}
                  value={codigoPeca}
                  onChange={(event) => setCodigoPeca(event.target.value)}
                  placeholder="PEC1000079001"
                />
              </label>

              <button type="submit" className="btn-coletor btn-success" disabled={acaoLoading === 'bipar'}>
                {acaoLoading === 'bipar' ? 'Validando...' : 'Bipar peça'}
              </button>
            </form>
          </div>
        ) : (
          !loading && (
            <div className="sem-item">
              <h2>Sem item pendente</h2>
              <p>Finalize a caixa ou abra uma nova papeleta.</p>
            </div>
          )
        )}

        <div className="coleta-acoes">
          <button type="button" className="btn-coletor btn-warning" onClick={pularItem} disabled={!itemAtual || acaoLoading === 'pular'}>
            {acaoLoading === 'pular' ? 'Pulando...' : 'Pular item'}
          </button>
          <button type="button" className="btn-coletor btn-primary" onClick={finalizarCaixa} disabled={acaoLoading === 'finalizar'}>
            {acaoLoading === 'finalizar' ? 'Finalizando...' : 'Finalizar caixa'}
          </button>
          <button type="button" className="btn-coletor btn-secondary" onClick={salvarParcial} disabled={acaoLoading === 'parcial'}>
            {acaoLoading === 'parcial' ? 'Salvando...' : 'Salvar parcial'}
          </button>
        </div>
      </section>
    </main>
  );
}

export default Coleta;
