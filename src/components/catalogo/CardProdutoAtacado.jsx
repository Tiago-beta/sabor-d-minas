import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';

export default function CardProdutoAtacado({ produto, onCardClick, onAddClick, carrinho }) {
    const [showControls, setShowControls] = useState(false);
    const timeoutRef = useRef(null);

    const itemNoCarrinho = carrinho?.find(item => item.codigo === produto.codigo);
    const quantidade = itemNoCarrinho?.quantidade || 0;

    const precoVenda = produto.preco_atacado || 0;
    const precoOriginal = produto.preco_original_promocao;

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const startTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const handleAdd = (e) => {
        e.stopPropagation();
        onAddClick(produto, 1);
        setShowControls(true);
        startTimer();
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        onAddClick(produto, -1);
        if (quantidade > 1) {
            setShowControls(true);
            startTimer();
        } else {
            setShowControls(false);
            clearTimeout(timeoutRef.current);
        }
    };

    const handleQuantityClick = (e) => {
        e.stopPropagation();
        setShowControls(true);
        startTimer();
    };

    return (
        <div 
            className="bg-gray-800 rounded-lg p-3 cursor-pointer border border-gray-700"
            onClick={() => onCardClick(produto)}
        >
            <div className="flex items-center gap-3">
                {/* Imagem */}
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-700 flex-shrink-0">
                    {produto.imagem_url ? (
                        <img 
                            src={produto.imagem_url} 
                            alt={produto.descricao} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-600"></div>
                    )}
                </div>
                
                {/* Informações do produto */}
                <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-white text-sm leading-tight truncate">
                        (C{produto.codigo}) - {produto.descricao}
                    </h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-blue-400 font-bold">
                            R$ {precoVenda.toFixed(2)}
                        </p>
                        {precoOriginal > 0 && (
                            <p className="text-gray-500 line-through text-xs">
                                R$ {precoOriginal.toFixed(2)}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Botão de adicionar */}
                <div className="flex-shrink-0">
                    {quantidade === 0 ? (
                        <button
                            onClick={handleAdd}
                            className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    ) : showControls ? (
                        <div className="flex items-center gap-1 bg-gray-700 rounded-full px-1">
                            <button
                                onClick={handleRemove}
                                className="text-white w-7 h-7 flex items-center justify-center hover:bg-gray-600 rounded-full"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-bold text-sm px-2 min-w-[24px] text-center">
                                {quantidade}
                            </span>
                            <button
                                onClick={handleAdd}
                                className="text-white w-7 h-7 flex items-center justify-center hover:bg-gray-600 rounded-full"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleQuantityClick}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center font-bold text-sm transition-all"
                        >
                            {quantidade}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}