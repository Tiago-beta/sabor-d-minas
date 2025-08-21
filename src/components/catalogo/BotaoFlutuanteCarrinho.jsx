import React from 'react';
import { Button } from '@/components/ui/button';

export default function BotaoFlutuanteCarrinho({ isVisible, itemCount, onClick }) {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40">
            <Button 
                onClick={onClick}
                className="w-full max-w-md mx-auto h-12 text-base font-bold bg-green-600 text-white hover:bg-green-700"
            >
                Mostrar pedido ({itemCount})
            </Button>
        </div>
    );
}