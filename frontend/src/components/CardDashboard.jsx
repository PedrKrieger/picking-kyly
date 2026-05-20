function CardDashboard({ titulo, valor, detalhe, icone, variante = 'default', legenda }) {
  return (
    <div className={`dashboard-card dashboard-card-${variante}`}>
      {icone && <div className="dashboard-card-icon">{icone}</div>}
      <span className="dashboard-card-label">{titulo}</span>
      <strong className="dashboard-card-value">{valor ?? 0}</strong>
      {legenda && <small className="dashboard-card-caption">{legenda}</small>}
      {detalhe && <small>{detalhe}</small>}
    </div>
  );
}

export default CardDashboard;
