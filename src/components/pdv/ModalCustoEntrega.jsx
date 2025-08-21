import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Bike } from "lucide-react";

export default function ModalCustoEntrega({ tipo, onSubmit, onFechar }) {
  const [custo, setCusto] = useState("");

  const handleSubmit = () => {
    const custoNumerico = parseFloat(custo.replace(',', '.')) || 0;
    if (custoNumerico <= 0) {
      alert("Por favor, informe um valor válido.");
      return;
    }
    onSubmit(custoNumerico);
  };

  const getTitulo = () => {
    return tipo === 'ifood' ? 'Custo de Entrega iFood' : 'Custo Motoboy Agregado';
  };

  const getIcone = () => {
    return tipo === 'ifood' ? <Truck className="w-6 h-6" /> : <Bike className="w-6 h-6" />;
  };

  const getCorBotao = () => {
    return tipo === 'ifood' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700';
  };

  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcone()}
            {getTitulo()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            {tipo === 'ifood' 
              ? 'Informe o custo pago ao iFood pela entrega:' 
              : 'Informe o valor pago ao motoboy agregado:'
            }
          </p>
          
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">R$</span>
            <Input
              type="text"
              value={custo}
              onChange={(e) => setCusto(e.target.value)}
              placeholder="0,00"
              className="pl-12 text-lg"
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className={getCorBotao()}>
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}