import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const MovementForm = () => {
  const [products, setProducts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [formData, setFormData] = useState({
    product: "",
    deposit: "",
    movement_type: "PURCHASE",
    quantity: 0,
    cost: 0,
    notes: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, depositsRes] = await Promise.all([
        apiClient.get("/products/"),
        apiClient.get("/deposits/"),
      ]);
      setProducts(productsRes.data);
      setDeposits(depositsRes.data);
    };
    fetchData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await apiClient.post("/movements/", formData);
    setFormData({
      product: "",
      deposit: "",
      movement_type: "PURCHASE",
      quantity: 0,
      cost: 0,
      notes: "",
    });
  };

  return (
    <div>
      <h3>Registrar movimiento</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Producto</label>
          <select
            className="form-select"
            name="product"
            value={formData.product}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} - {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Depósito</label>
          <select
            className="form-select"
            name="deposit"
            value={formData.deposit}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona</option>
            {deposits.map((deposit) => (
              <option key={deposit.id} value={deposit.id}>
                {deposit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            name="movement_type"
            value={formData.movement_type}
            onChange={handleChange}
          >
            <option value="PURCHASE">Compra</option>
            <option value="SALE">Venta</option>
            <option value="ADJUSTMENT">Ajuste</option>
            <option value="RETURN">Devolución</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Cantidad</label>
          <input
            className="form-control"
            type="number"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            step="0.01"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Costo</label>
          <input
            className="form-control"
            type="number"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            step="0.01"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Notas</label>
          <textarea
            className="form-control"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Registrar
        </button>
      </form>
    </div>
  );
};

export default MovementForm;
