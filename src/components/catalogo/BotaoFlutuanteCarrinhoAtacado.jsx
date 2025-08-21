import React from 'react';
import { Button } from '@/components/ui/button';

export default function BotaoFlutuanteCarrinhoAtacado({ isVisible, itemCount, valorMinimo, totalAtual, onClick }) {
    if (!isVisible) {
        return null;
    }

    const podeEnviar = totalAtual >= valorMinimo;
    const bgColor = podeEnviar ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600';

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
            <Button 
                onClick={onClick}
                className={`w-full max-w-md mx-auto h-12 text-base font-bold text-white ${bgColor}`}
            >
                Mostrar pedido ({itemCount}) - R$ {totalAtual.toFixed(2)}
            </Button>
        </div>
    );
}