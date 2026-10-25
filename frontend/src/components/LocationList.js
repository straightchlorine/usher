import React, { useState, useEffect } from "react";
import { getLocations } from "../api";

const LocationList = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load locations.");
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (loading) return <p>Loading locations...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Locations</h1>
      <ul>
        {locations.map((location) => (
          <li key={location.id}>
            <h2>{location.stadium}</h2>
            <p><strong>Address:</strong> {location.address}</p>
            <p><strong>Capacity:</strong> {location.capacity}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LocationList;
