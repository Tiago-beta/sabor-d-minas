import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Banknote, Smartphone, Eraser, CheckCircle } from "lucide-react";

export default function PainelPagamento({ total, onFinalizar, onLimpar }) {
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [valorPago, setValorPago] = useState("");

  const calcularTroco = () => {
    const pago = parseFloat(valorPago) || 0;
    return Math.max(0, pago - total);
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
      {/* Display do Total */}
      <div className="text-center bg-gray-100 rounded-lg p-4">
        <div className="text-3xl font-bold text-green-600">
          R${total.toFixed(2)}
        </div>
      </div>

      {/* Método de Pagamento */}
      <div>
        <div className="text-sm font-medium mb-2">Método</div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={metodoPagamento === "dinheiro" ? "default" : "outline"}
            className="p-2"
            onClick={() => setMetodoPagamento("dinheiro")}
          >
            <div className="text-center">
              <Banknote className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs">Dinheiro</div>
            </div>
          </Button>
          <Button
            variant={metodoPagamento === "cartao" ? "default" : "outline"}
            className="p-2"
            onClick={() => setMetodoPagamento("cartao")}
          >
            <div className="text-center">
              <CreditCard className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs">Cartão</div>
            </div>
          </Button>
          <Button
            variant={metodoPagamento === "pix" ? "default" : "outline"}
            className="p-2"
            onClick={() => setMetodoPagamento("pix")}
          >
            <div className="text-center">
              <Smartphone className="w-4 h-4 mx-auto mb-1" />
              <div className="text-xs">Pix</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Valor Pago e Troco */}
      {metodoPagamento && (
        <div className="space-y-2">
          <div>
            <div className="text-sm font-medium mb-1">Valor Pago</div>
            <Input
              type="number"
              value={valorPago}
              onChange={(e) => setValorPago(e.target.value)}
              placeholder="0,00"
              className="text-center text-lg font-bold"
            />
          </div>
          
          {metodoPagamento === "dinheiro" && valorPago && (
            <div className="text-center bg-blue-50 rounded-lg p-2">
              <div className="text-sm text-gray-600">Troco</div>
              <div className="text-xl font-bold text-blue-600">
                R${calcularTroco().toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="space-y-2">
        <Button
          onClick={() => onFinalizar({
            metodo: metodoPagamento,
            valorPago: parseFloat(valorPago) || total,
            troco: metodoPagamento === "dinheiro" ? calcularTroco() : 0
          })}
          disabled={!metodoPagamento || (metodoPagamento === "dinheiro" && !valorPago)}
          className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Registrar
        </Button>
        
        <Button
          variant="outline"
          onClick={onLimpar}
          className="w-full"
        >
          <Eraser className="w-4 h-4 mr-2" />
          Limpar
        </Button>
      </div>
    </div>
  );
}