
import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, CheckCircle, X, Box } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";

// Helper function for accent-insensitive string normalization
const normalizeString = (str) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const DisplayField = ({ label, value, large = false }) => (
    <div className="w-full">
        <label className="text-base font-semibold text-gray-600 block mb-2">{label}</label>
        <div className={`p-4 bg-white border border-gray-300 rounded-lg flex items-center ${large ? 'text-2xl font-bold h-16' : 'text-xl h-14'}`}>
            {value}
        </div>
    </div>
);

export default function PainelControle({ onAdicionarProduto, produtos, produtoAtivo, subtotal, tipoPdv, onFinalizar, vendaAtual, handleUpdateDeliveryInfo, busca, setBusca }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [showBusca, setShowBusca] = useState(false);
  const [buscaModal, setBuscaModal] = useState("");
  
  const codigoInputRef = useRef(null);
  const buscaInputRef = useRef(null);
  
  useEffect(() => {
    const focusInput = () => {
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
    };
    
    focusInput();
    
    const handleClick = (e) => {
      if (!e.target.closest('.codigo-input-container') && !e.target.closest('[role="dialog"]')) {
        setTimeout(focusInput, 100);
      }
    };
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'data-state')) {
          const dialogElement = document.querySelector('[role="dialog"][data-state="open"]');
          if (!dialogElement && codigoInputRef.current && document.activeElement !== codigoInputRef.current) {
            setTimeout(focusInput, 100);
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (showBusca && buscaInputRef.current) {
      setTimeout(() => buscaInputRef.current.focus(), 100);
    } else if (!showBusca && codigoInputRef.current) {
        setTimeout(() => codigoInputRef.current.focus(), 100);
    }
  }, [showBusca]);


  const handleAdd = () => {
    if (codigo && onAdicionarProduto(codigo, quantidade)) {
      setCodigo("");
      setQuantidade(1);
      setTimeout(() => {
        if (codigoInputRef.current) {
          codigoInputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && codigo) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSelecionarProduto = (produto) => {
    const estoqueProduto = calcularEstoqueProduto(produto);
    if (estoqueProduto <= 0) {
      toast.error("Produto sem estoque disponível.");
      return;
    }
    setCodigo(produto.codigo);
    setShowBusca(false);
    setBuscaModal("");
    setTimeout(() => {
      if (codigoInputRef.current) {
        codigoInputRef.current.focus();
      }
      if (onAdicionarProduto) {
        onAdicionarProduto(produto.codigo, 1);
      }
    }, 100);
  };
  
  const calcularEstoqueProduto = (produto) => {
    if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
      const estoquesPossiveis = produto.componentes_kit.map(componente => {
        const produtoComponente = produtos.find(p => p.id === componente.produto_id);
        if (!produtoComponente || typeof produtoComponente.estoque === 'undefined' || componente.quantidade_utilizada <= 0) {
          return 0;
        }
        return Math.floor(produtoComponente.estoque / componente.quantidade_utilizada);
      });
      return Math.min(...estoquesPossiveis);
    }
    return produto.estoque || 0;
  };

  const produtosFiltradosBusca = useMemo(() => {
    if (!buscaModal.trim()) return [];
    
    const termo = buscaModal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return produtos.filter(produto => {
      if (produto.aparece_catalogo === false) return false;
      
      const descricao = (produto.descricao || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const codigo = (produto.codigo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      return descricao.includes(termo) || codigo.includes(termo);
    })
    .slice(0, 20);
  }, [produtos, buscaModal]);

  const precoUnitario = produtoAtivo ? (tipoPdv === 'atacado' ? (produtoAtivo.preco_atacado || produtoAtivo.preco_varejo || 0) : (produtoAtivo.preco_varejo || 0)) : 0;

  const handleFinalizarClick = () => {
    if (vendaAtual.itens.length === 0) {
        toast.error("Não é possível finalizar uma venda vazia. Adicione produtos ao carrinho.");
        return;
    }
    onFinalizar();
  };

  return (
    <div className="bg-gray-100 p-3 rounded-lg shadow-inner border border-gray-300 h-full flex flex-col md:justify-between">
        <div className="hidden md:block space-y-4 flex-grow overflow-y-auto pr-1">
            <div className="codigo-input-container">
                <label className="text-base font-semibold text-gray-600 block mb-2">Código do Produto</label>
                <div className="flex gap-2">
                    <Input
                        ref={codigoInputRef}
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="text-2xl md:text-3xl h-12 md:h-16 flex-grow font-bold border-2 focus:ring-0 focus:ring-offset-0 focus:border-blue-500 focus:outline-none"
                        placeholder="Digite..."
                        autoFocus
                        autoComplete="off"
                        style={{ 
                            fontSize: window.innerWidth < 768 ? '1.5rem' : '2rem', 
                            fontWeight: 'bold',
                            paddingLeft: '12px',
                            paddingRight: '12px',
                            boxShadow: 'none'
                        }}
                    />
                </div>
            </div>
            
            <DisplayField 
                label="Descrição do Produto" 
                value={produtoAtivo?.descricao || 'Nenhum produto selecionado'} 
                large 
            />
            
            <DisplayField 
                label="Valor Unitário" 
                value={produtoAtivo ? `R$ ${precoUnitario.toFixed(2)}` : 'R$ 0,00'} 
            />
            
            <div>
                <label className="text-base font-semibold text-gray-600 block mb-2">Quantidade</label>
                <div className="relative">
                    <Input
                        type="number"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className="text-lg md:text-xl h-12 md:h-14 text-center pr-12"
                        min="1"
                    />
                    <div className="absolute right-1 top-1 flex flex-col h-10 md:h-12">
                        <button
                            type="button"
                            onClick={() => setQuantidade(prev => prev + 1)}
                            className="flex-1 px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-t text-xs font-bold"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuantidade(prev => Math.max(1, prev - 1))}
                            className="flex-1 px-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-b text-xs font-bold"
                        >
                            -
                        </button>
                    </div>
                </div>
            </div>

            <DisplayField 
                label="Total do Item" 
                value={produtoAtivo ? `R$ ${(precoUnitario * quantidade).toFixed(2)}` : 'R$ 0,00'} 
            />
        </div>
        
        <div className="flex-shrink-0 md:mt-4 space-y-2">
            <Dialog open={showBusca} onOpenChange={setShowBusca}>
                <DialogTrigger asChild>
                     <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold">
                        <Search className="mr-2 w-5 h-5"/>
                        BUSCAR PRODUTO
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Buscar Produto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 flex flex-col flex-grow min-h-0">
                        <Input 
                            ref={buscaInputRef}
                            value={buscaModal}
                            onChange={(e) => setBuscaModal(e.target.value)}
                            placeholder="Digite para buscar..."
                            className="text-lg h-12"
                            autoFocus
                        />
                        <div className="overflow-y-auto pr-2 flex-grow">
                            {produtosFiltradosBusca.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    {buscaModal ? 'Nenhum produto encontrado' : 'Digite para buscar produtos'}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {produtosFiltradosBusca.map(produto => {
                                        const precoExibido = tipoPdv === 'atacado' ? (produto.preco_atacado || produto.preco_varejo || 0) : (produto.preco_varejo || 0);
                                        const estoqueProduto = calcularEstoqueProduto(produto);
                                        const semEstoque = estoqueProduto <= 0;
                                        
                                        return (
                                            <div
                                                key={produto.id}
                                                onClick={() => handleSelecionarProduto(produto)}
                                                className={`flex items-center gap-6 p-4 rounded-lg cursor-pointer transition-colors ${
                                                    semEstoque 
                                                        ? 'bg-gray-100 opacity-50 cursor-not-allowed' 
                                                        : 'bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {produto.imagem_url ? (
                                                        <img 
                                                            src={produto.imagem_url} 
                                                            alt={produto.descricao} 
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        produto.tipo_produto === 'kit' ? 
                                                        <Box className="w-12 h-12 text-gray-400" /> :
                                                        <Package className="w-12 h-12 text-gray-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-800 text-xl">{produto.descricao}</p>
                                                    <p className="text-md text-gray-500">Código: {produto.codigo}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <div className={`text-2xl font-bold ${semEstoque ? 'text-gray-400' : 'text-green-600'}`}>
                                                        {`R$ ${(precoExibido || 0).toFixed(2)}`}
                                                    </div>
                                                    <div className={`text-md ${semEstoque ? 'text-red-500' : 'text-gray-500'}`}>
                                                        {semEstoque ? 'Sem estoque' : `Est: ${estoqueProduto}`}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ocultar botão de finalizar na visão mobile, pois já existe um na barra inferior */}
            <Button 
                className="hidden md:flex w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-bold items-center justify-center"
                onClick={handleFinalizarClick}
            >
                <CheckCircle className="mr-2 w-5 h-5"/>
                FINALIZAR VENDA
            </Button>
        </div>
    </div>
  );
}
