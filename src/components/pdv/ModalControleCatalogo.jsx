
import React, { useState, useEffect, useMemo } from 'react';
import { Produto } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Search, X, AlertTriangle, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch'; // Added as per outline
import CachedImage from '../common/CachedImage'; // Added as per outline

export default function ModalControleCatalogo({ onClose }) {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroVisibilidade, setFiltroVisibilidade] = useState('todos'); // todos, visiveis, ocultos
  const [loading, setLoading] = useState(true);
  const [alerta, setAlerta] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    setLoading(true);
    try {
      const lista = await Produto.list('-created_date');
      setProdutos(lista);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstoqueProduto = (produto) => {
    if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
      let estoquesPossiveis = [];
      for (const componente of produto.componentes_kit) {
        const produtoComponente = produtos.find(p => p.id === componente.produto_id);
        if (!produtoComponente || !produtoComponente.estoque || componente.quantidade_utilizada <= 0) {
          return 0;
        }
        estoquesPossiveis.push(Math.floor(produtoComponente.estoque / componente.quantidade_utilizada));
      }
      return Math.min(...estoquesPossiveis);
    }
    return produto.estoque || 0;
  };

  const mostrarAlerta = (message, type = 'error') => {
    setAlerta({ show: true, message, type });
    setTimeout(() => setAlerta({ show: false, message: '', type: '' }), 4000);
  };

  const alterarVisibilidade = async (produto) => {
    const estoqueAtual = calcularEstoqueProduto(produto);
    const visibilidadeAtual = produto.aparece_catalogo !== false;

    // Regra 1: Tentando ocultar produto com estoque
    if (visibilidadeAtual && estoqueAtual > 0) {
      mostrarAlerta('Não é possível ocultar um produto com saldo em estoque. Para ocultá-lo, o estoque precisa ser zerado.', 'error');
      return;
    }

    // Regra 2: Tentando tornar visível produto sem estoque
    if (!visibilidadeAtual && estoqueAtual === 0) {
      mostrarAlerta('Não é possível tornar visível um produto sem estoque. Para torná-lo visível, é preciso adicionar saldo no estoque.', 'error');
      return;
    }

    try {
      const novaVisibilidade = !visibilidadeAtual;
      await Produto.update(produto.id, { aparece_catalogo: novaVisibilidade });
      
      // Atualizar estado local
      setProdutos(prev => prev.map(p => 
        p.id === produto.id ? { ...p, aparece_catalogo: novaVisibilidade } : p
      ));

      const acao = novaVisibilidade ? 'tornado visível' : 'ocultado';
      mostrarAlerta(`Produto "${produto.descricao}" ${acao} com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      mostrarAlerta('Erro ao alterar visibilidade do produto!', 'error');
    }
  };

  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const produtosFiltrados = produtos.filter(p => {
    const buscaNormalizada = normalizeText(busca);
    // Filtro por busca
    const matchBusca = (p.descricao && normalizeText(p.descricao).includes(buscaNormalizada)) ||
                      (p.codigo && normalizeText(p.codigo).includes(buscaNormalizada));
    
    // Filtro por visibilidade
    const visivel = p.aparece_catalogo !== false;
    let matchVisibilidade = true;
    
    if (filtroVisibilidade === 'visiveis') {
      matchVisibilidade = visivel;
    } else if (filtroVisibilidade === 'ocultos') {
      matchVisibilidade = !visivel;
    }
    
    return matchBusca && matchVisibilidade;
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Controle de Visibilidade do Catálogo
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {alerta.show && (
            <Alert className={alerta.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className={alerta.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                {alerta.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Filtros no topo */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroVisibilidade} onValueChange={setFiltroVisibilidade}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Produtos</SelectItem>
                <SelectItem value="visiveis">Produtos Visíveis</SelectItem>
                <SelectItem value="ocultos">Produtos Ocultos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
            <div className="grid grid-cols-1 gap-2 p-4">
              {loading ? (
                <div className="text-center py-8">Carregando produtos...</div>
              ) : produtosFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Nenhum produto encontrado</div>
              ) : (
                produtosFiltrados.map(produto => {
                  const estoque = calcularEstoqueProduto(produto);
                  const visivel = produto.aparece_catalogo !== false;
                  const semEstoque = estoque === 0;
                  const comEstoque = estoque > 0;
                  
                  // Determinar se o botão deve estar desabilitado
                  const botaoDesabilitado = (visivel && comEstoque) || (!visivel && semEstoque);
                  
                  return (
                    <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                          {produto.imagem_url ? (
                            <CachedImage 
                              src={produto.imagem_url} 
                              alt={produto.descricao} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{produto.codigo} - {produto.descricao}</div>
                          <div className="text-sm text-gray-600">
                            Estoque: {estoque} | 
                            Preço: R$ {(produto.preco_varejo || 0).toFixed(2)} | 
                            Tipo: {produto.tipo_produto === 'kit' ? 'Kit' : 'Produto'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => alterarVisibilidade(produto)}
                          className={`${
                            botaoDesabilitado 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'hover:bg-gray-200'
                          }`}
                          title={
                            visivel && comEstoque 
                              ? 'Não é possível ocultar produto com estoque' 
                              : !visivel && semEstoque 
                              ? 'Não é possível tornar visível produto sem estoque'
                              : visivel 
                              ? 'Ocultar produto' 
                              : 'Tornar produto visível'
                          }
                        >
                          {visivel ? (
                            <Eye className="w-5 h-5 text-green-600" />
                          ) : (
                            <EyeOff className="w-5 h-5 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
