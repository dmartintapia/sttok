import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const ProductForm = () => {
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category: "",
    unit: "",
    stock_minimum: 0,
  });
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesRes, unitsRes] = await Promise.all([
        apiClient.get("/categories/"),
        apiClient.get("/units/"),
      ]);
      setCategories(categoriesRes.data);
      setUnits(unitsRes.data);
    };
    fetchData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await apiClient.post("/products/", formData);
    setFormData({ sku: "", name: "", category: "", unit: "", stock_minimum: 0 });
  };

  return (
    <div>
      <h3>Alta de producto</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">SKU</label>
          <input
            className="form-control"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Nombre</label>
          <input
            className="form-control"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Unidad</label>
          <select
            className="form-select"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Stock mínimo</label>
          <input
            className="form-control"
            type="number"
            name="stock_minimum"
            value={formData.stock_minimum}
            onChange={handleChange}
            step="0.01"
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Guardar
        </button>
      </form>
    </div>
  );
};

export default ProductForm;
