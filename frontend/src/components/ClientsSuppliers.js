import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const ClientsSuppliers = () => {
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [clientsRes, suppliersRes] = await Promise.all([
        apiClient.get("/clients/"),
        apiClient.get("/suppliers/"),
      ]);
      setClients(clientsRes.data);
      setSuppliers(suppliersRes.data);
    };
    fetchData();
  }, []);

  return (
    <div>
      <h3>Clientes</h3>
      <ul className="list-group mb-4">
        {clients.map((client) => (
          <li className="list-group-item" key={client.id}>
            {client.name} - {client.email}
          </li>
        ))}
      </ul>

      <h3>Proveedores</h3>
      <ul className="list-group">
        {suppliers.map((supplier) => (
          <li className="list-group-item" key={supplier.id}>
            {supplier.name} - {supplier.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientsSuppliers;
