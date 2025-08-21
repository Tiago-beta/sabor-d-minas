import React from 'react';
import { ArrowLeft, ShoppingCart, Share2 } from 'lucide-react';

export default function HeaderCatalogo({ onCartClick, cartItemCount, whatsappNumber }) {

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: "Pão D'Queijo e Cia - Catálogo",
                text: "Confira nossos deliciosos produtos direto de Minas!",
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link do catálogo copiado para a área de transferência!');
        }
    };
    
    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 bg-opacity-80 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between p-4">
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                    <ArrowLeft className="w-6 h-6 text-white" />
                </a>
                
                <h1 className="text-lg font-bold text-white">Catálogo</h1>
                
                <div className="flex items-center gap-4">
                    <button onClick={handleShare} className="p-0 bg-transparent border-0">
                        <Share2 className="w-6 h-6 text-white" />
                    </button>
                    <button className="relative p-0 bg-transparent border-0" onClick={onCartClick}>
                        <ShoppingCart className="w-6 h-6 text-white" />
                        {cartItemCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                                {cartItemCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}