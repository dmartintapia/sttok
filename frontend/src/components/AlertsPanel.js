import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const AlertsPanel = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const response = await apiClient.get("/dashboard/alerts/");
      setAlerts(response.data);
    };
    fetchAlerts();
  }, []);

  if (alerts.length === 0) {
    return <p className="text-success">Sin alertas de reposición.</p>;
  }

  return (
    <div>
      <h4>Alertas de stock mínimo</h4>
      <ul className="list-group">
        {alerts.map((alert) => (
          <li className="list-group-item" key={alert.product_id}>
            {alert.sku} - {alert.name} | Stock actual: {alert.current_stock} (mínimo {alert.stock_minimum})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AlertsPanel;
