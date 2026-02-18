import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";
import AlertsPanel from "./AlertsPanel";

const Dashboard = () => {
  const [summary, setSummary] = useState([]);

  useEffect(() => {
    const fetchSummary = async () => {
      const response = await apiClient.get("/dashboard/summary/");
      setSummary(response.data);
    };
    fetchSummary();
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <AlertsPanel />
      <h4 className="mt-4">Stock por depósito</h4>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Producto</th>
            <th>Depósito</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <tr key={`${row.product_id}-${row.deposit_id}`}>
              <td>{row.sku}</td>
              <td>{row.product_name}</td>
              <td>{row.deposit_name}</td>
              <td>{row.current_stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
