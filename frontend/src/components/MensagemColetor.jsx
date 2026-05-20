function MensagemColetor({ tipo = 'alerta', texto }) {
  if (!texto) {
    return null;
  }

  return (
    <div className={`mensagem-coletor mensagem-${tipo}`}>
      {texto}
    </div>
  );
}

export default MensagemColetor;
