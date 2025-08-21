
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Search, Trash2, CornerDownLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function EntradaProduto({ onAdicionarProduto, produtos }) {
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [busca, setBusca] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const codigoInputRef = useRef(null);

  useEffect(() => {
    if (codigoInputRef.current) {
      codigoInputRef.current.focus();
    }
  }, []);

  const handleAdd = () => {
    if (onAdicionarProduto(codigo, quantidade)) {
      setCodigo("");
      setQuantidade(1);
      codigoInputRef.current.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && codigo) {
      handleAdd();
    }
  };

  const handleSelectProduto = (produto) => {
    setCodigo(produto.codigo);
    setPopoverOpen(false);
    codigoInputRef.current.focus();
  };

  const produtosFiltrados = busca
    ? produtos.filter(p => p.descricao.toLowerCase().includes(busca.toLowerCase()) || p.codigo.toLowerCase().includes(busca.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="flex-shrink-0 bg-gray-800 bg-opacity-30 rounded-lg p-3">
      <div className="flex items-end gap-3">
        {/* Código do Produto */}
        <div className="flex-grow">
          <label htmlFor="codigo" className="text-sm font-medium opacity-80">Código</label>
          <div className="flex">
            <Input
              id="codigo"
              ref={codigoInputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-white text-gray-900 rounded-r-none border-r-0 text-lg"
              placeholder="Código do produto"
            />
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-l-none bg-white text-gray-900 hover:bg-gray-200">
                  <Search className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <div className="p-2">
                  <Input 
                    placeholder="Buscar produto..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {produtosFiltrados.map(p => (
                    <div key={p.id} onClick={() => handleSelectProduto(p)} className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800">
                      <p className="font-semibold">{p.descricao}</p>
                      <p className="text-sm text-gray-500">{p.codigo} - R${p.preco.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quantidade */}
        <div className="flex-shrink-0">
          <label htmlFor="quantidade" className="text-sm font-medium opacity-80">Qtde</label>
          <div className="flex items-center">
            <Button size="icon" variant="outline" className="h-11 w-11 rounded-r-none bg-white text-gray-900" onClick={() => setQuantidade(q => Math.max(1, q - 1))}>
              <Minus />
            </Button>
            <Input
              id="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-11 w-20 text-center rounded-none bg-white text-gray-900 text-lg"
            />
            <Button size="icon" variant="outline" className="h-11 w-11 rounded-l-none bg-white text-gray-900" onClick={() => setQuantidade(q => q + 1)}>
              <Plus />
            </Button>
          </div>
        </div>
        
        {/* Adicionar */}
        <div className="flex-shrink-0">
          <Button onClick={handleAdd} className="h-11 px-6 bg-blue-600 hover:bg-blue-700">
            <CornerDownLeft className="w-5 h-5"/>
          </Button>
        </div>
      </div>
    </div>
  );
}
