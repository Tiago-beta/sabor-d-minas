import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Minus, Plus } from 'lucide-react';

export default function ModalDetalheProdutoAtacado({ produto, onClose, onAddToCart, whatsappNumber }) {
    const [quantidade, setQuantidade] = useState(1);

    const handleAddToCart = () => {
        onAddToCart(quantidade);
        onClose();
    };

    const handleContact = () => {
        const mensagem = `Olá, tenho interesse no produto para atacado: *${produto.descricao}*`;
        const linkWhatsApp = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`;
        window.open(linkWhatsApp, '_blank');
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white p-0 max-w-sm m-0">
                <div className="relative">
                    <img 
                        src={produto.imagem_url} 
                        alt={produto.descricao} 
                        className="w-full h-64 object-contain bg-gray-800" 
                    />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full text-white hover:bg-black hover:bg-opacity-90" 
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="p-4 space-y-4">
                    <h2 className="text-xl font-bold">{produto.descricao}</h2>
                    <p className="text-gray-400">{produto.categoria}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl text-blue-400 font-bold">R$ {(produto.preco_atacado || 0).toFixed(2)}</p>
                        {produto.preco_original_promocao > 0 && (
                            <p className="text-gray-500 line-through text-lg">
                                R$ {produto.preco_original_promocao.toFixed(2)}
                            </p>
                        )}
                    </div>
                    <Button variant="outline" className="w-full border-blue-400 text-blue-400" onClick={handleContact}>
                        Conversar com a empresa
                    </Button>
                    
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button size="icon" variant="outline" onClick={() => setQuantidade(q => Math.max(1, q - 1))}>
                                <Minus className="w-4 h-4" />
                            </Button>
                            <span className="text-lg font-bold w-8 text-center">{quantidade}</span>
                            <Button size="icon" variant="outline" onClick={() => setQuantidade(q => q + 1)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button className="flex-grow bg-blue-600 hover:bg-blue-700" onClick={handleAddToCart}>
                            Adicionar ao pedido
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}