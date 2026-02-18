import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const Deposits = () => {
  const [deposits, setDeposits] = useState([]);

  useEffect(() => {
    const fetchDeposits = async () => {
      const response = await apiClient.get("/deposits/");
      setDeposits(response.data);
    };
    fetchDeposits();
  }, []);

  return (
    <div>
      <h3>Depósitos</h3>
      <ul className="list-group">
        {deposits.map((deposit) => (
          <li className="list-group-item" key={deposit.id}>
            {deposit.name} - {deposit.location}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Deposits;
