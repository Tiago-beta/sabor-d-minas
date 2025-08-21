import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";

export default function ModalFinalizar({ total, onFinalizar, onFechar, loading }) {
  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Finalizar Venda</DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6">
          <div className="text-3xl font-bold text-green-600">
            R${total.toFixed(2)}
          </div>
          
          <p className="text-gray-600">
            Confirma a finalização da venda?
          </p>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onFechar}
              disabled={loading}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={() => onFinalizar({ metodo: "dinheiro", valorPago: total, troco: 0 })}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading ? "Finalizando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}