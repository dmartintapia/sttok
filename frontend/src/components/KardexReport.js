import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const KardexReport = () => {
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    const fetchMovements = async () => {
      const response = await apiClient.get("/movements/");
      setMovements(response.data);
    };
    fetchMovements();
  }, []);

  return (
    <div>
      <h3>Kardex</h3>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Depósito</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Costo</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id}>
              <td>{movement.product}</td>
              <td>{movement.deposit}</td>
              <td>{movement.movement_type}</td>
              <td>{movement.quantity}</td>
              <td>{movement.cost}</td>
              <td>{new Date(movement.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KardexReport;
