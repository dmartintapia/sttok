import React, { useEffect, useState } from "react";
import apiClient from "../api/axios";

const PriceLists = () => {
  const [lists, setLists] = useState([]);

  useEffect(() => {
    const fetchLists = async () => {
      const response = await apiClient.get("/price-lists/");
      setLists(response.data);
    };
    fetchLists();
  }, []);

  return (
    <div>
      <h3>Listas de precios</h3>
      <ul className="list-group">
        {lists.map((list) => (
          <li className="list-group-item" key={list.id}>
            {list.name} - {list.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PriceLists;
