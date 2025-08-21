import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus } from 'lucide-react';

export default function CarrinhoAtacado({ carrinho, onClose, onAddToCart, onRemoveFromCart, onEnviarPedido, valorMinimo }) {

    const subtotal = carrinho.reduce((total, item) => total + (item.subtotal || 0), 0);
    const economia = carrinho.reduce((total, item) => {
        if (item.preco_original_promocao > 0) {
            return total + (item.preco_original_promocao - (item.preco_unitario || 0)) * item.quantidade;
        }
        return total;
    }, 0);

    const podeEnviar = subtotal >= valorMinimo;
    const faltaPara200 = valorMinimo - subtotal;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white p-0 max-w-md h-screen flex flex-col m-0">
                <DialogHeader className="p-4 border-b border-gray-700 flex-row items-center justify-between">
                    <DialogTitle className="text-lg">Seu Pedido Atacado</DialogTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </DialogHeader>
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {carrinho.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                             <img src={item.imagem_url} alt={item.descricao} className="w-16 h-16 rounded-md object-cover"/>
                             <div className="flex-grow">
                                 <p className="font-semibold">{item.descricao}</p>
                                 <div className="flex items-baseline gap-2">
                                     <p className="text-blue-400">R$ {(item.preco_unitario || 0).toFixed(2)}</p>
                                     {item.preco_original_promocao > 0 && (
                                         <p className="text-gray-500 line-through text-sm">
                                             R$ {item.preco_original_promocao.toFixed(2)}
                                         </p>
                                     )}
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <Button size="sm" variant="outline" className="w-7 h-7 p-0" onClick={() => onRemoveFromCart(item.id)}>
                                     <Minus className="w-3 h-3"/>
                                 </Button>
                                 <span className="w-5 text-center">{item.quantidade}</span>
                                 <Button size="sm" variant="outline" className="w-7 h-7 p-0" onClick={() => onAddToCart(item)}>
                                     <Plus className="w-3 h-3"/>
                                 </Button>
                             </div>
                        </div>
                    ))}
                    {carrinho.length === 0 && (
                        <div className="text-center text-gray-500 pt-20">
                            <p>Seu carrinho está vazio</p>
                        </div>
                    )}
                </div>
                {carrinho.length > 0 && (
                    <div className="p-4 border-t border-gray-700 space-y-3">
                         <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                         </div>
                         {economia > 0 && (
                            <div className="flex justify-between text-sm text-green-400">
                                <span>Você economiza</span>
                                <span>R$ {economia.toFixed(2)}</span>
                            </div>
                         )}
                         {!podeEnviar && (
                            <div className="text-center text-yellow-400 text-sm">
                                Faltam R$ {faltaPara200.toFixed(2)} para atingir o mínimo de R$ {valorMinimo.toFixed(2)}
                            </div>
                         )}
                         <Button 
                            className={`w-full h-12 text-base font-bold ${podeEnviar ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'}`} 
                            onClick={onEnviarPedido}
                            disabled={!podeEnviar}
                         >
                            {podeEnviar ? 'Enviar Pedido' : `Mínimo R$ ${valorMinimo.toFixed(2)}`}
                         </Button>
                         <Button variant="outline" className="w-full" onClick={onClose}>
                            Continuar Comprando
                         </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}