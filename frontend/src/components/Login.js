import React, { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await login(credentials.username, credentials.password);
    } catch (err) {
      setError("Credenciales inválidas.");
    }
  };

  return (
    <div className="col-md-4">
      <h3>Ingreso</h3>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Usuario</label>
          <input
            className="form-control"
            name="username"
            value={credentials.username}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Contraseña</label>
          <input
            className="form-control"
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Ingresar
        </button>
      </form>
    </div>
  );
};

export default Login;
