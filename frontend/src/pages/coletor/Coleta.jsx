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

  async function carregarProximoItem() {
    try {
      setLoading(true);
      const response = await api.get(`/api/coletas/${coletaId}/proximo-item`);
      setItemAtual(response.data.proximoItem);

      if (!response.data.proximoItem) {
        setTipoMensagem('alerta');
        setMensagem(response.data.mensagem || 'Nao ha proximo item. A coleta pode ser finalizada.');
      }
    } catch (error) {
      setTipoMensagem('erro');
      setMensagem(error.response?.data?.erro || 'Erro ao carregar proximo item.');
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
      setMensagem('Informe o codigo da peca.');
      return;
    }

    try {
      setAcaoLoading('bipar');
      const response = await api.post('/api/coletas/bipar-peca', {
        coletaId: Number(coletaId),
        codigoPeca: codigoPeca.trim()
      });

      setTipoMensagem(response.data.sucesso ? 'sucesso' : 'erro');
      setMensagem(response.data.mensagem);
      setItemAtual(response.data.proximoItem);
      setCodigoPeca('');
    } catch (error) {
      const data = error.response?.data;
      setTipoMensagem('erro');
      setMensagem(data?.mensagem || data?.erro || 'Erro ao bipar peca.');
      if (data?.proximoItem) {
        setItemAtual(data.proximoItem);
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
      setMensagem('Nao existe item atual para pular.');
      return;
    }

    try {
      setAcaoLoading('pular');
      const response = await api.post('/api/coletas/pular-item', {
        coletaId: Number(coletaId),
        caixaItemId: itemAtual.id,
        motivo: 'Falta de peca no endereco'
      });

      setTipoMensagem('alerta');
      setMensagem(response.data.mensagem);
      setItemAtual(response.data.proximoItem);
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

        {loading && <Loading texto="Carregando proximo item..." />}

        {itemAtual ? (
          <div className="item-atual">
            <div className="endereco-destaque">
              <span>Endereco</span>
              <strong>{itemAtual.endereco?.codigo}</strong>
              <small>{itemAtual.endereco?.descricao}</small>
            </div>

            <div className="produto-grid">
              <div>
                <span>Referencia</span>
                <strong>{itemAtual.produto?.referencia}</strong>
              </div>
              <div>
                <span>Cor</span>
                <strong>{itemAtual.produto?.cor}</strong>
              </div>
              <div>
                <span>Tamanho</span>
                <strong>{itemAtual.produto?.tamanho}</strong>
              </div>
              <div>
                <span>Qtd.</span>
                <strong>{itemAtual.quantidade_coletada}/{itemAtual.quantidade_solicitada}</strong>
              </div>
            </div>

            <form onSubmit={biparPeca} className="coletor-form">
              <label>
                Codigo da peca
                <input
                  ref={inputRef}
                  value={codigoPeca}
                  onChange={(event) => setCodigoPeca(event.target.value)}
                  placeholder="PEC1000079001"
                />
              </label>

              <button type="submit" className="btn-coletor btn-success" disabled={acaoLoading === 'bipar'}>
                {acaoLoading === 'bipar' ? 'Validando...' : 'Bipar peca'}
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
