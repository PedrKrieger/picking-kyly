import { Link, NavLink } from 'react-router-dom';

function LayoutAdmin({ titulo, children, ocultarCabecalho = false }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-logo">
          <strong>Picking Kyly</strong>
          <span>Painel Administrativo</span>
        </Link>
        <nav className="admin-nav">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/caixas">
            Caixas
          </NavLink>
          <NavLink to="/admin/estoque">
            Estoque
          </NavLink>
          <NavLink to="/admin/ocorrencias">
            Ocorrencias
          </NavLink>
        </nav>
      </aside>

      <main className="admin-main">
        {!ocultarCabecalho && (
          <header className="admin-header">
            <div>
              <p>Painel administrativo</p>
              <h1>{titulo}</h1>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

export default LayoutAdmin;
