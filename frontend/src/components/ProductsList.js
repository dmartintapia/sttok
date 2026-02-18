import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/axios";

const ProductsList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await apiClient.get("/products/");
      setProducts(response.data);
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center">
        <h3>Productos</h3>
        <Link to="/productos/nuevo" className="btn btn-primary">
          Nuevo producto
        </Link>
      </div>
      <table className="table table-striped mt-3">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Stock actual</th>
            <th>Stock mínimo</th>
            <th>Costo promedio</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.current_stock}</td>
              <td>{product.stock_minimum}</td>
              <td>{product.average_cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductsList;
