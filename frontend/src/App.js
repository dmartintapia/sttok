import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Dashboard from "./components/Dashboard";
import ProductForm from "./components/ProductForm";
import MovementForm from "./components/MovementForm";
import KardexReport from "./components/KardexReport";
import Login from "./components/Login";
import PriceLists from "./components/PriceLists";
import ClientsSuppliers from "./components/ClientsSuppliers";
import Deposits from "./components/Deposits";
import ProductsList from "./components/ProductsList";

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <nav className="navbar navbar-expand navbar-dark bg-dark px-3">
        <Link className="navbar-brand" to="/">
          Gestión de Stock
        </Link>
        <div className="navbar-nav">
          <Link className="nav-link" to="/productos">
            Productos
          </Link>
          <Link className="nav-link" to="/movimientos">
            Movimientos
          </Link>
          <Link className="nav-link" to="/kardex">
            Kardex
          </Link>
          <Link className="nav-link" to="/listas-precios">
            Listas de precios
          </Link>
          <Link className="nav-link" to="/clientes-proveedores">
            Clientes/Proveedores
          </Link>
          <Link className="nav-link" to="/depositos">
            Depósitos
          </Link>
          <Link className="nav-link" to="/login">
            Login
          </Link>
        </div>
      </nav>
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/productos" element={<ProductsList />} />
          <Route path="/productos/nuevo" element={<ProductForm />} />
          <Route path="/movimientos" element={<MovementForm />} />
          <Route path="/kardex" element={<KardexReport />} />
          <Route path="/listas-precios" element={<PriceLists />} />
          <Route path="/clientes-proveedores" element={<ClientsSuppliers />} />
          <Route path="/depositos" element={<Deposits />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
