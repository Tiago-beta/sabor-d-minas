
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Search,
  Copy,
  Truck,
  Package,
  Calculator,
  Percent,
  Trash2, // New icon
  Globe, // New icon
  FileText, // New icon
  UserCheck, // New icon
  ArrowUpRight, // New icon
  Printer, // New icon
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function BotoesAcao({ onDesconto, vendaAtual, onMenuAcaoClick }) { // Added onMenuAcaoClick prop
  const [modalDesconto, setModalDesconto] = useState(false);
  const [valorDesconto, setValorDesconto] = useState("");

  const aplicarDesconto = () => {
    const desconto = parseFloat(valorDesconto) || 0;
    onDesconto(desconto);
    setModalDesconto(false);
    setValorDesconto("");
  };

  // The 'botoes' array is no longer needed as the buttons are now hardcoded in JSX
  // const botoes = [
  //   { label: "Compras", icon: ShoppingCart, action: () => {} },
  //   { label: "Registro", icon: Search, action: () => {} },
  //   { label: "Copiar", icon: Copy, action: () => {} },
  //   { label: "Entrega", icon: Truck, action: () => {} },
  //   { label: "Estoque", icon: Package, action: () => {} },
  //   { label: "Atacado", icon: ShoppingCart, action: () => {} },
  //   { label: "Desconto", icon: Percent, action: () => setModalDesconto(true) },
  // ];

  return (
    <>
      <div className="grid grid-cols-3 gap-3 action-buttons-grid">
        <Button onClick={() => onMenuAcaoClick('limpar')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Trash2 className="w-5 h-5 mb-1" />
          <div>Limpar</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('online')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Globe className="w-5 h-5 mb-1" />
          <div>Online</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('vendas')} className="h-20 text-sm flex flex-col items-center justify-center">
          <FileText className="w-5 h-5 mb-1" />
          <div>Vendas</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('externo')} className="h-20 text-sm flex flex-col items-center justify-center">
          <UserCheck className="w-5 h-5 mb-1" />
          <div>Externo</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('recebimentos')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Package className="w-5 h-5 mb-1" />
          <div>Recebimentos</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('atacado')} className="h-20 text-sm flex flex-col items-center justify-center">
          <ArrowUpRight className="w-5 h-5 mb-1" />
          <div>Atacado</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('cupom')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Printer className="w-5 h-5 mb-1" />
          <div>Cupom</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('catalogo')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Printer className="w-5 h-5 mb-1" />
          <div>Catálogo</div>
        </Button>
        
        <Button onClick={() => onMenuAcaoClick('frete')} className="h-20 text-sm flex flex-col items-center justify-center">
          <Truck className="w-5 h-5 mb-1" />
          <div>Frete</div>
        </Button>

        {/* Existing Desconto button, adapted to fit new grid styling if desired, or kept as is if it belongs to a different section */}
        {/* For now, keeping it separate as per original outline's structure, assuming it's part of the main action buttons area conceptually */}
        <Button onClick={() => setModalDesconto(true)} className="h-20 text-sm flex flex-col items-center justify-center">
          <Percent className="w-5 h-5 mb-1" />
          <div>Desconto</div>
        </Button>
      </div>

      {/* Modal Desconto */}
      <Dialog open={modalDesconto} onOpenChange={setModalDesconto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Desconto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Valor do Desconto (R$)</label>
              <Input
                type="number"
                value={valorDesconto}
                onChange={(e) => setValorDesconto(e.target.value)}
                placeholder="0,00"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalDesconto(false)}>
                Cancelar
              </Button>
              <Button onClick={aplicarDesconto}>
                Aplicar Desconto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
