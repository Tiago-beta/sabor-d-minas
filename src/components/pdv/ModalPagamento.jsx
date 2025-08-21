
import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Banknote, CreditCard, Smartphone, Clock, Building, Truck, Users, Bike } from "lucide-react";
import ModalClienteAPrazo from './ModalClienteAPrazo';
import ModalDelivery from './ModalDelivery';
import ModalCustoEntrega from './ModalCustoEntrega';

export default function ModalPagamento({ total, onFinalizar, onFechar, loading, vendaAtual }) {
  const [metodo, setMetodo] = useState("dinheiro");
  const [valorPago, setValorPago] = useState("");
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showCustoEntregaModal, setShowCustoEntregaModal] = useState(false);
  const [tipoEntregaExterna, setTipoEntregaExterna] = useState(null);
  const [dadosPagamentoParaDelivery, setDadosPagamentoParaDelivery] = useState(null);
  const [dadosClienteAPrazo, setDadosClienteAPrazo] = useState(null);

  const troco = useMemo(() => {
    if (metodo !== "dinheiro") return 0;
    const pago = parseFloat(valorPago) || 0;
    return pago >= total ? pago - total : 0;
  }, [valorPago, total, metodo]);

  const handleFinalizar = () => {
    const pago = parseFloat(valorPago);

    if (metodo === "interno" || metodo === "consignado") {
      onFinalizar({ metodo, valorPago: 0, troco: 0 });
      return;
    }

    if (metodo === "aprazo") {
      if (!dadosClienteAPrazo) {
        alert("Por favor, selecione um cliente e data de pagamento.");
        return;
      }
      
      onFinalizar({
        metodo: "aprazo",
        valorPago: total,
        troco: 0,
        cliente_id: dadosClienteAPrazo.cliente_id,
        data_pagamento: dadosClienteAPrazo.data_pagamento,
        cliente_dados: dadosClienteAPrazo.cliente_dados
      });
      return;
    }

    if (metodo === "dinheiro" && (!pago || pago < total)) {
        alert("Valor pago insuficiente.");
        return;
    }
    
    // If external delivery cost was chosen, the finalization is handled by the main button's onClick
    // So, this handleFinalizar is only for standard payment methods without external delivery cost.
    if (metodo === "ifood" || dadosPagamentoParaDelivery?.custo_entrega_externa) {
        // This case should be handled by the main Confirmar Pagamento button's direct onFinalizar call
        // when dadosPagamentoParaDelivery is present. This branch theoretically should not be reached.
        console.warn("handleFinalizar called with iFood/external delivery method. This path should be avoided.");
        return; 
    }

    onFinalizar({
        metodo,
        valorPago: metodo === 'dinheiro' ? pago : total,
        troco
    });
  };

  const handleClienteSubmit = (dadosCliente) => {
    // Apenas salva os dados do cliente e volta para o modal de pagamento
    setDadosClienteAPrazo(dadosCliente);
    setMetodo("aprazo");
    setShowClienteModal(false);
  };
  
  const handleMetodoClick = (novoMetodo) => {
    // Clear any previous external delivery data when a new method is chosen
    setDadosPagamentoParaDelivery(null); 

    if (novoMetodo === 'aprazo') {
      setShowClienteModal(true);
    } else if (novoMetodo === 'ifood') {
      setTipoEntregaExterna('ifood');
      setShowCustoEntregaModal(true);
    } else {
      setMetodo(novoMetodo);
    }
  };

  const handleEntregaAgregadaClick = () => {
    // Clear any previous external delivery data when a new external method is chosen
    setDadosPagamentoParaDelivery(null);
    setTipoEntregaExterna('agregado');
    setShowCustoEntregaModal(true);
  };

  const handleCustoEntregaSubmit = (custoEntrega) => {
    // CORREÇÃO: Ao invés de finalizar imediatamente, voltar para o modal principal
    // e mostrar as informações do custo de entrega
    setDadosPagamentoParaDelivery({
      metodo: tipoEntregaExterna === 'ifood' ? 'ifood' : metodo, // `metodo` here refers to the current selected method if not 'ifood'
      valorPago: total, // For external deliveries, the payment is typically the total amount
      troco: 0,
      custo_entrega_externa: custoEntrega,
      tipo_entrega_externa: tipoEntregaExterna
    });
    
    // Atualizar o método para refletir o tipo de entrega se for iFood
    if (tipoEntregaExterna === 'ifood') {
      setMetodo('ifood');
    } else {
      // For 'agregado', the user might have selected another payment method (e.g., cash, card)
      // so we don't change the main `metodo` state, it acts as an add-on.
      // We also ensure the input value is cleared if it was 'dinheiro' and then agregated was selected
      setValorPago(""); 
    }
    
    setShowCustoEntregaModal(false);
    setTipoEntregaExterna(null); // Reset after use
  };

  const handleDeliveryClick = () => {
    const dadosPagamento = {
      metodo,
      valorPago: metodo === 'dinheiro' ? (parseFloat(valorPago) || 0) : total,
      troco: metodo === 'dinheiro' ? troco : 0
    };
    setDadosPagamentoParaDelivery(dadosPagamento);
    setShowDeliveryModal(true);
  };

  const handleDeliveryFinalizar = (dadosCompletos) => {
    onFinalizar(dadosCompletos);
    setShowDeliveryModal(false);
  };

  if (showClienteModal) {
    return (
      <ModalClienteAPrazo 
        total={total}
        vendaAtual={vendaAtual}
        onSubmit={handleClienteSubmit}
        onFechar={() => setShowClienteModal(false)}
      />
    );
  }

  if (showDeliveryModal) {
    return (
        <ModalDelivery
            vendaAtual={vendaAtual}
            dadosPagamento={dadosPagamentoParaDelivery}
            onFinalizar={handleDeliveryFinalizar}
            onFechar={() => setShowDeliveryModal(false)}
        />
    );
  }

  if (showCustoEntregaModal) {
    return (
      <ModalCustoEntrega
        tipo={tipoEntregaExterna}
        onSubmit={handleCustoEntregaSubmit}
        onFechar={() => setShowCustoEntregaModal(false)}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Pagamento</DialogTitle>
        </DialogHeader>
        <div className="my-6">
          <div className="text-center mb-6">
            <p className="text-gray-600">Total a Pagar</p>
            <p className="text-4xl font-bold text-blue-800">R$ {total.toFixed(2)}</p>
            {vendaAtual?.vendedor_consignacao && (
              <p className="text-sm text-green-600 mt-2">Venda de Consignação - {vendaAtual.vendedor_consignacao}</p>
            )}
          </div>
          
          {/* Grid 3x2 para os 6 botões principais de pagamento */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button 
              variant={metodo === 'dinheiro' ? 'default' : 'outline'} 
              onClick={() => handleMetodoClick('dinheiro')} 
              className={`h-16 flex-col gap-1 ${metodo === 'dinheiro' ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-green-600 text-green-600 hover:bg-green-50'}`}
            >
                <Banknote className="w-6 h-6"/> 
                <span className="text-xs">Dinheiro</span>
            </Button>
            <Button 
              variant={metodo === 'cartao' ? 'default' : 'outline'} 
              onClick={() => handleMetodoClick('cartao')} 
              className={`h-16 flex-col gap-1 ${metodo === 'cartao' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
            >
                <CreditCard className="w-6 h-6"/> 
                <span className="text-xs">Cartão</span>
            </Button>
            <Button 
              variant={metodo === 'pix' ? 'default' : 'outline'} 
              onClick={() => handleMetodoClick('pix')} 
              className={`h-16 flex-col gap-1 ${metodo === 'pix' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}`}
            >
                <Smartphone className="w-6 h-6"/> 
                <span className="text-xs">Pix</span>
            </Button>
            <Button 
              variant={metodo === 'aprazo' ? 'default' : 'outline'} 
              onClick={() => handleMetodoClick('aprazo')} 
              className={`h-16 flex-col gap-1 ${metodo === 'aprazo' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-orange-600 text-orange-600 hover:bg-orange-50'}`}
            >
                <Clock className="w-6 h-6"/> 
                <span className="text-xs">A Prazo</span>
            </Button>
            <Button 
              variant={metodo === 'interno' ? 'default' : 'outline'} 
              onClick={() => handleMetodoClick('interno')} 
              className={`h-16 flex-col gap-1 ${metodo === 'interno' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'border-gray-600 text-gray-600 hover:bg-gray-50'}`}
            >
                <Building className="w-6 h-6"/> 
                <span className="text-xs">Interno</span>
            </Button>
            <Button 
              variant={metodo === 'ifood' ? 'default' : 'outline'} // Update variant based on `metodo` state
              onClick={() => handleMetodoClick('ifood')} 
              className={`h-16 flex-col gap-1 ${metodo === 'ifood' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-red-600 text-red-600 hover:bg-red-50'}`}
            >
                <Smartphone className="w-6 h-6"/> 
                <span className="text-xs">iFood</span>
            </Button>
          </div>

          {/* Mostrar botão Consig apenas no PDV Atacado */}
          {window.location.search.includes('tipo=atacado') && (
            <div className="grid grid-cols-1 gap-2 mb-4">
              <Button 
                variant={metodo === 'consignado' ? 'default' : 'outline'} 
                onClick={() => handleMetodoClick('consignado')} 
                className={`h-16 flex-col gap-1 ${metodo === 'consignado' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}`}
              >
                  <Users className="w-6 h-6"/> 
                  <span className="text-xs">Consig</span>
              </Button>
            </div>
          )}

          {metodo === 'dinheiro' && (
            <div className="space-y-4">
               <div>
                    <label className="text-sm font-medium">Valor Entregue</label>
                    <Input 
                        type="number"
                        value={valorPago}
                        onChange={e => setValorPago(e.target.value)}
                        className="text-lg text-right"
                        placeholder="0,00"
                    />
               </div>
               <div>
                    <p className="text-sm font-medium">Troco</p>
                    <p className="text-2xl font-bold text-right">R$ {troco.toFixed(2)}</p>
               </div>
            </div>
          )}
          
          {metodo !== 'dinheiro' && !['aprazo', 'ifood'].includes(metodo) && ( // Exclude 'ifood' from this general message
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="font-medium capitalize">{metodo}</p>
                  <p className="text-gray-600 text-sm">
                      {metodo === 'interno' ? 'Valor da venda será R$ 0,00' :
                       metodo === 'consignado' ? 'Venda de Consignação - Sem pagamento imediato' :
                       'Confirmar valor total'}
                  </p>
              </div>
          )}

          {metodo === 'aprazo' && (
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <p className="font-medium">Venda a Prazo</p>
                  {dadosClienteAPrazo ? (
                      <div className="text-sm text-gray-600 mt-2">
                          <p><strong>Cliente:</strong> {dadosClienteAPrazo.cliente_dados?.nome}</p>
                          <p><strong>Data de Pagamento:</strong> {new Date(dadosClienteAPrazo.data_pagamento).toLocaleDateString('pt-BR')}</p>
                      </div>
                  ) : (
                      <p className="text-gray-600 text-sm">Cliente e data não selecionados</p>
                  )}
              </div>
          )}

          {metodo === 'ifood' && !dadosPagamentoParaDelivery?.custo_entrega_externa && (
              <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="font-medium">iFood</p>
                  <p className="text-gray-600 text-sm">Aguardando definição de custo de entrega externa.</p>
              </div>
          )}

          {dadosPagamentoParaDelivery?.custo_entrega_externa && (
              <div className={`p-4 rounded-lg text-center ${
                dadosPagamentoParaDelivery.tipo_entrega_externa === 'ifood' 
                  ? 'bg-red-50' 
                  : 'bg-yellow-50'
              }`}>
                  <p className="font-medium">
                    {dadosPagamentoParaDelivery.tipo_entrega_externa === 'ifood' ? 'Entrega iFood' : 'Motoboy Agregado'}
                  </p>
                  <div className="text-sm text-gray-600 mt-2">
                      <p><strong>Custo da Entrega:</strong> R$ {dadosPagamentoParaDelivery.custo_entrega_externa.toFixed(2)}</p>
                  </div>
              </div>
          )}

        </div>
        <DialogFooter className="flex gap-2 justify-center items-center">
          {/* Botão Agregado pequeno */}
          <Button 
            variant="outline" 
            onClick={handleEntregaAgregadaClick} 
            className="w-12 h-10 p-0 border-yellow-600 text-yellow-600 hover:bg-yellow-50"
            title="Motoboy Agregado"
          >
            <Bike className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={handleDeliveryClick} 
            className="bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 flex items-center justify-center px-4 py-2 min-w-[100px]"
          >
            <Truck className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm font-medium">Delivery</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={onFechar} 
            disabled={loading}
            className="border-gray-400 text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => {
              // Se há dados de entrega externa, usar esses dados
              if (dadosPagamentoParaDelivery?.custo_entrega_externa) {
                onFinalizar(dadosPagamentoParaDelivery);
              } else {
                handleFinalizar();
              }
            }} 
            disabled={loading} 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? 'Finalizando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
