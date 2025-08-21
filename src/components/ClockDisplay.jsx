import React, { useState, useEffect } from 'react';

export default function ClockDisplay() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <p className="font-semibold text-sm" style={{ color: '#9ca3af' }}>
          {dateTime.toLocaleTimeString('pt-BR')} - {dateTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}