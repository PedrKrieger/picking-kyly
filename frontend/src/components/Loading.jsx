function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="loading">
      <div className="loading-spinner" />
      <span>{texto}</span>
    </div>
  );
}

export default Loading;
