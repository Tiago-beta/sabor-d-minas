import React from "react";
import { Button } from "@/components/ui/button";

export default function AtalhosNumericos({ onAtalho, produtos }) {
  const atalhos = Array.from({ length: 10 }, (_, i) => i + 1);

  const handleAtalho = (numero) => {
    // Busca produto configurado para este atalho (simplificado)
    const produtoAtalho = produtos.find(p => p.codigo === `ATL${numero}`);
    if (produtoAtalho) {
      onAtalho(produtoAtalho.codigo);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="grid grid-cols-10 gap-2">
        {atalhos.map((numero) => (
          <Button
            key={numero}
            variant="outline"
            className="aspect-square text-xl font-bold text-red-600 border-2 border-red-200 hover:bg-red-50"
            onClick={() => handleAtalho(numero)}
          >
            {numero}
          </Button>
        ))}
      </div>
    </div>
  );
}