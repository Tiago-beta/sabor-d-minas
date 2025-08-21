
import React, { useState, useEffect } from "react";
import { PedidoOnline, Produto } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Search, RefreshCw, Plus, Truck, Eye, Edit, Clock, X, Camera, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from '@/utils';
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Modal para buscar e adicionar produtos
function ModalBuscarProdutos({ onClose, onAdicionarItem }) {
  const [todosOsProdutos, setTodosOsProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  // Helper function for accent-insensitive search
  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const lista = await Produto.list();
      setTodosOsProdutos(lista); // Carrega TODOS os produtos para o cálculo de kit
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstoqueProduto = (produto) => {
    if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
      const estoquesPossiveis = produto.componentes_kit.map(componente => {
        // Usa a lista completa de produtos para encontrar os componentes
        const produtoComponente = todosOsProdutos.find(p => p.id === componente.produto_id);
        if (!produtoComponente || typeof produtoComponente.estoque === 'undefined' || componente.quantidade_utilizada <= 0) {
          return 0;
        }
        return Math.floor(produtoComponente.estoque / componente.quantidade_utilizada);
      });
      // A quantidade de kits é limitada pelo componente com menor estoque
      return estoquesPossiveis.length > 0 ? Math.min(...estoquesPossiveis) : 0;
    }
    // Para produtos normais, retorna o estoque direto
    return produto.estoque || 0;
  };

  const produtosFiltrados = todosOsProdutos.filter(produto => {
    // Primeiro, filtra para mostrar apenas os que devem aparecer no catálogo
    if (produto.aparece_catalogo === false) return false;
    
    // Depois, aplica o filtro de busca do usuário
    if (!busca) return true;
    const buscaNormalizada = normalizeText(busca);
    return (produto.descricao && normalizeText(produto.descricao).includes(buscaNormalizada)) ||
           (produto.codigo && normalizeText(produto.codigo).includes(buscaNormalizada));
  });

  const adicionarProduto = (produto) => {
    const estoqueProduto = calcularEstoqueProduto(produto);
    if (estoqueProduto <= 0) {
      alert("Produto sem estoque disponível.");
      return;
    }
    
    const novoItem = {
      codigo: produto.codigo,
      descricao: produto.descricao,
      quantidade: 1,
      preco_unitario: produto.preco_varejo || 0,
      subtotal: produto.preco_varejo || 0,
      imagem_url: produto.imagem_url || ''
    };
    
    onAdicionarItem(novoItem);
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Carregando produtos...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Adicionar Produto ao Pedido
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produto por nome ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
            {produtosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum produto encontrado
              </div>
            ) : (
              <div className="divide-y">
                {produtosFiltrados.map(produto => {
                  const estoqueProduto = calcularEstoqueProduto(produto);
                  const semEstoque = estoqueProduto <= 0;
                  
                  return (
                    <div 
                      key={produto.id}
                      className={`p-4 m-1 hover:border-blue-500 border border-transparent cursor-pointer flex items-center gap-6 rounded-md transition-colors ${
                        semEstoque ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => !semEstoque && adicionarProduto(produto)}
                    >
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        {produto.imagem_url ? (
                          <img 
                            src={produto.imagem_url} 
                            alt={produto.descricao} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-xl">{produto.descricao}</div>
                        <div className="text-md text-gray-500">Código: {produto.codigo}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold text-2xl ${semEstoque ? 'text-gray-400' : 'text-green-600'}`}>
                          R$ ${(produto.preco_varejo || 0).toFixed(2)}
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
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal para exibir e editar detalhes do pedido
function ModalDetalhesPedido({ pedido, onClose, onSave, onEnviarParaPDV }) {
  const [nomeCliente, setNomeCliente] = useState(pedido.cliente_nome || '');
  const [itensEditados, setItensEditados] = useState(pedido.itens ? JSON.parse(JSON.stringify(pedido.itens)) : []);
  const [showBuscarProdutos, setShowBuscarProdutos] = useState(false);
  const navigate = useNavigate();

  const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

  const formatarDataHoraSP = (data) => {
    const dataObj = new Date(data);
    const dataSP = dataObj.toLocaleDateString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const horaSP = dataObj.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', 
      minute: '2-digit'
    });
    return `${dataSP} às ${horaSP}`;
  };

  const editarQuantidadeItem = (index, novaQuantidade) => {
    if (novaQuantidade < 0) return;
    
    const novosItens = [...itensEditados];
    novosItens[index] = {
      ...novosItens[index],
      quantidade: novaQuantidade,
      subtotal: novaQuantidade * novosItens[index].preco_unitario
    };
    setItensEditados(novosItens);
  };

  const removerItem = (index) => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      const novosItens = itensEditados.filter((_, i) => i !== index);
      setItensEditados(novosItens);
    }
  };

  const adicionarNovoItem = (novoItem) => {
    setItensEditados(prev => [...prev, novoItem]);
  };

  const calcularNovoTotal = () => {
    const subtotalItens = itensEditados.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    return subtotalItens + (pedido.taxa_entrega || 0);
  };

  const handleSalvar = async () => {
    const novoTotal = calcularNovoTotal();
    const dadosAtualizados = {
      cliente_nome: nomeCliente,
      itens: itensEditados,
      total: novoTotal
    };
    
    await onSave(pedido.id, dadosAtualizados);
  };

  const enviarParaPDV = async (tipoVenda) => {
    // Primeiro salvar as alterações
    try {
      const novoTotal = calcularNovoTotal();
      const dadosAtualizados = {
        cliente_nome: nomeCliente,
        itens: itensEditados,
        total: novoTotal
      };
      
      await onSave(pedido.id, dadosAtualizados);
    } catch (error) {
      console.error('Erro ao salvar alterações antes de enviar para PDV:', error);
    }

    // Ação para o status "Concluído"
    try {
      if (pedido.status !== 'confirmado') {
        await PedidoOnline.update(pedido.id, { status: 'confirmado' });
      }
    } catch (error) {
      console.error('Erro ao atualizar status para "Separado":', error);
    }

    const carrinhoParaPDV = {
      itens: itensEditados.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.codigo,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal
      })),
      total: calcularNovoTotal(),
      desconto: 0,
      cliente_nome: nomeCliente,
      cliente_telefone: pedido.cliente_telefone || '',
      endereco_entrega: '',
      taxa_entrega: pedido.taxa_entrega || 0
    };

    const storageKey = `carrinhoPdv_${tipoVenda}`;
    sessionStorage.setItem(storageKey, JSON.stringify(carrinhoParaPDV));
    
    const url = tipoVenda === 'varejo' 
      ? createPageUrl('PDV') 
      : createPageUrl(`PDV?tipo=${tipoVenda}`);
    
    onEnviarParaPDV(url);
  };

  const gerarImagemCarrinho = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const itemHeight = 100;
    canvas.width = 600;
    canvas.height = 150 + (itensEditados.length * itemHeight) + 150;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let yPos = 20;
    
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sabor de Minas - Pão D\'Queijo & CIA', canvas.width / 2, yPos);
    
    yPos += 30;
    ctx.font = '16px Arial';
    ctx.fillText(`Pedido: ${pedido.numero_pedido}`, canvas.width / 2, yPos);
    
    yPos += 20;
    ctx.fillText(`Cliente: ${nomeCliente || 'Não informado'}`, canvas.width / 2, yPos);
    
    yPos += 40;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(canvas.width - 20, yPos);
    ctx.stroke();
    
    yPos += 30;
    
    const carregarImagem = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };
    
    const imagensCarregadas = await Promise.all(
      itensEditados.map(item => 
        item.imagem_url ? carregarImagem(item.imagem_url) : Promise.resolve(null)
      )
    );
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Foto', 20, yPos);
    ctx.fillText('Item', 100, yPos);
    ctx.textAlign = 'center';
    ctx.fillText('Qtd', 400, yPos);
    ctx.fillText('Valor Unit.', 480, yPos);
    ctx.textAlign = 'right';
    ctx.fillText('Total', canvas.width - 20, yPos);
    
    yPos += 25;
    
    ctx.font = '12px Arial';
    itensEditados.forEach((item, index) => {
      const itemStartY = yPos;
      
      if (index % 2 === 0) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(10, itemStartY - 5, canvas.width - 20, itemHeight - 10);
      }
      
      const imagem = imagensCarregadas[index];
      if (imagem) {
        const imgSize = 70;
        const imgX = 25;
        const imgY = itemStartY + 5;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgX, imgY, imgSize, imgSize);
        ctx.clip();
        
        const aspectRatio = imagem.width / imagem.height;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (aspectRatio > 1) {
          drawHeight = imgSize;
          drawWidth = imgSize * aspectRatio;
          drawX = imgX - (drawWidth - imgSize) / 2;
          drawY = imgY;
        } else {
          drawWidth = imgSize;
          drawHeight = imgSize / aspectRatio;
          drawX = imgX;
          drawY = imgY - (drawHeight - imgSize) / 2;
        }
        
        ctx.drawImage(imagem, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(imgX, imgY, imgSize, imgSize);
      } else {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(25, itemStartY + 5, 70, 70);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sem', 60, itemStartY + 35);
        ctx.fillText('Imagem', 60, itemStartY + 50);
      }
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      
      const maxWidth = 280;
      const descricao = item.descricao;
      const words = descricao.split(' ');
      let line = '';
      let lineY = itemStartY + 25;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 105, lineY);
          line = words[n] + ' ';
          lineY += 15;
          if (lineY > itemStartY + 65) {
            line += '...';
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 105, lineY);
      
      ctx.textAlign = 'center';
      ctx.fillText(item.quantidade.toString(), 400, itemStartY + 40);
      ctx.fillText(formatarMoeda(item.preco_unitario), 480, itemStartY + 40);
      
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(formatarMoeda(item.subtotal), canvas.width - 20, itemStartY + 40);
      
      yPos += itemHeight;
    });
    
    yPos += 10;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(canvas.width - 20, yPos);
    ctx.stroke();
    
    yPos += 40;
    
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`TOTAL: ${formatarMoeda(calcularNovoTotal())}`, canvas.width - 20, yPos);
    
    const link = document.createElement('a');
    link.download = `pedido-${pedido.numero_pedido}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Detalhes do Pedido - {pedido.numero_pedido}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[70vh] p-1">
            <div className="grid grid-cols-1 gap-4">
              <div className="w-1/2">
                <Input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Itens do Pedido
                </h3>
                <Button 
                  onClick={() => setShowBuscarProdutos(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foto</TableHead>
                      <TableHead>Cód</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensEditados.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {item.imagem_url ? (
                              <img 
                                src={item.imagem_url} 
                                alt={item.descricao} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-gray-400">Sem foto</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell className="max-w-xs">{item.descricao}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarQuantidadeItem(index, item.quantidade - 1)}
                              className="w-6 h-6 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantidade}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarQuantidadeItem(index, item.quantidade + 1)}
                              className="w-6 h-6 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatarMoeda(item.preco_unitario)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatarMoeda(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
              <div className="space-y-2">
                {pedido.economia > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Economia:</span>
                    <span>{formatarMoeda(pedido.economia)}</span>
                  </div>
                )}
                {pedido.taxa_entrega > 0 && (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega:</span>
                    <span>{formatarMoeda(pedido.taxa_entrega)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
                  <span>Total do Pedido:</span>
                  <span>{formatarMoeda(calcularNovoTotal())}</span>
                </div>
              </div>
            </div>

            {pedido.observacoes && (
              <div>
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-sm bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                  {pedido.observacoes}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-wrap gap-2 justify-between bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <Button onClick={gerarImagemCarrinho} className="bg-purple-600 hover:bg-purple-700">
                <Camera className="w-4 h-4 mr-2" />
                Gerar Imagem
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => enviarParaPDV('varejo')} className="bg-blue-600 hover:bg-blue-700">
                Enviar para PDV Varejo
              </Button>
              <Button onClick={() => enviarParaPDV('atacado')} className="bg-purple-600 hover:bg-purple-700">
                Enviar para PDV Atacado
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Fechar</Button>
              <Button onClick={handleSalvar} className="bg-green-600 hover:bg-green-700">
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showBuscarProdutos && (
        <ModalBuscarProdutos
          onClose={() => setShowBuscarProdutos(false)}
          onAdicionarItem={adicionarNovoItem}
        />
      )}
    </>
  );
}

// Novo Modal para Criar Pedido
function ModalCriarNovoPedido({ onClose, onSave, onEnviarParaPDV }) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [itensEditados, setItensEditados] = useState([]);
  const [showBuscarProdutos, setShowBuscarProdutos] = useState(false);
  const navigate = useNavigate();

  const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

  const editarQuantidadeItem = (index, novaQuantidade) => {
    if (novaQuantidade < 0) return;
    
    const novosItens = [...itensEditados];
    novosItens[index] = {
      ...novosItens[index],
      quantidade: novaQuantidade,
      subtotal: novaQuantidade * novosItens[index].preco_unitario
    };
    setItensEditados(novosItens);
  };

  const removerItem = (index) => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      const novosItens = itensEditados.filter((_, i) => i !== index);
      setItensEditados(novosItens);
    }
  };

  const adicionarNovoItem = (novoItem) => {
    setItensEditados(prev => [...prev, novoItem]);
  };

  const calcularNovoTotal = () => {
    const subtotalItens = itensEditados.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    return subtotalItens;
  };

  const handleSalvar = async () => {
    if (!nomeCliente.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    if (itensEditados.length === 0) {
      alert('Por favor, adicione pelo menos um item ao pedido.');
      return;
    }

    const numeroPedido = `PED${Date.now()}`;
    const linkUnico = `${window.location.origin}/pedido/${numeroPedido}`;
    
    const novoPedido = {
      numero_pedido: numeroPedido,
      link_unico: linkUnico,
      cliente_nome: nomeCliente,
      cliente_telefone: '',
      bairro: '',
      taxa_entrega: 0,
      itens: itensEditados,
      total: calcularNovoTotal(),
      economia: 0,
      status: 'pendente',
      observacoes: ''
    };
    
    await onSave(novoPedido);
  };

  const enviarParaPDV = async (tipoVenda) => {
    if (!nomeCliente.trim()) {
      alert('Por favor, informe o nome do cliente antes de enviar para o PDV.');
      return;
    }

    if (itensEditados.length === 0) {
      alert('Por favor, adicione pelo menos um item antes de enviar para o PDV.');
      return;
    }

    try {
      const numeroPedido = `PED${Date.now()}`;
      const linkUnico = `${window.location.origin}/pedido/${numeroPedido}`;
      
      const novoPedido = {
        numero_pedido: numeroPedido,
        link_unico: linkUnico,
        cliente_nome: nomeCliente,
        cliente_telefone: '',
        bairro: '',
        taxa_entrega: 0,
        itens: itensEditados,
        total: calcularNovoTotal(),
        economia: 0,
        status: 'confirmado',
        observacoes: ''
      };
      
      // Save the newly created order
      await onSave(novoPedido);
    } catch (error) {
      console.error('Erro ao salvar pedido antes de enviar para PDV:', error);
    }

    const carrinhoParaPDV = {
      itens: itensEditados.map(item => ({
        id: Date.now() + Math.random(),
        item_id: item.codigo,
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal
      })),
      total: calcularNovoTotal(),
      desconto: 0,
      cliente_nome: nomeCliente,
      cliente_telefone: '',
      endereco_entrega: '',
      taxa_entrega: 0
    };

    const storageKey = `carrinhoPdv_${tipoVenda}`;
    sessionStorage.setItem(storageKey, JSON.stringify(carrinhoParaPDV));
    
    const url = tipoVenda === 'varejo' 
      ? createPageUrl('PDV') 
      : createPageUrl(`PDV?tipo=${tipoVenda}`);
    
    onEnviarParaPDV(url);
  };

  const gerarImagemCarrinho = async () => {
    if (itensEditados.length === 0) {
      alert('Adicione itens ao pedido antes de gerar a imagem.');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const itemHeight = 100;
    canvas.width = 600;
    canvas.height = 150 + (itensEditados.length * itemHeight) + 150;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let yPos = 20;
    
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sabor de Minas - Pão D\'Queijo & CIA', canvas.width / 2, yPos);
    
    yPos += 30;
    ctx.font = '16px Arial';
    ctx.fillText(`Pedido: Novo Pedido`, canvas.width / 2, yPos);
    
    yPos += 20;
    ctx.fillText(`Cliente: ${nomeCliente || 'Não informado'}`, canvas.width / 2, yPos);
    
    yPos += 40;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(canvas.width - 20, yPos);
    ctx.stroke();
    
    yPos += 30;
    
    const carregarImagem = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };
    
    const imagensCarregadas = await Promise.all(
      itensEditados.map(item => 
        item.imagem_url ? carregarImagem(item.imagem_url) : Promise.resolve(null)
      )
    );
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Foto', 20, yPos);
    ctx.fillText('Item', 100, yPos);
    ctx.textAlign = 'center';
    ctx.fillText('Qtd', 400, yPos);
    ctx.fillText('Valor Unit.', 480, yPos);
    ctx.textAlign = 'right';
    ctx.fillText('Total', canvas.width - 20, yPos);
    
    yPos += 25;
    
    ctx.font = '12px Arial';
    itensEditados.forEach((item, index) => {
      const itemStartY = yPos;
      
      if (index % 2 === 0) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(10, itemStartY - 5, canvas.width - 20, itemHeight - 10);
      }
      
      const imagem = imagensCarregadas[index];
      if (imagem) {
        const imgSize = 70;
        const imgX = 25;
        const imgY = itemStartY + 5;
        
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgX, imgY, imgSize, imgSize);
        ctx.clip();
        
        const aspectRatio = imagem.width / imagem.height;
        let drawWidth, drawHeight, drawX, drawY;
        
        if (aspectRatio > 1) {
          drawHeight = imgSize;
          drawWidth = imgSize * aspectRatio;
          drawX = imgX - (drawWidth - imgSize) / 2;
          drawY = imgY;
        } else {
          drawWidth = imgSize;
          drawHeight = imgSize / aspectRatio;
          drawX = imgX;
          drawY = imgY - (drawHeight - imgSize) / 2;
        }
        
        ctx.drawImage(imagem, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();
        
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(imgX, imgY, imgSize, imgSize);
      } else {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(25, itemStartY + 5, 70, 70);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sem', 60, itemStartY + 35);
        ctx.fillText('Imagem', 60, itemStartY + 50);
      }
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      
      const maxWidth = 280;
      const descricao = item.descricao;
      const words = descricao.split(' ');
      let line = '';
      let lineY = itemStartY + 25;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 105, lineY);
          line = words[n] + ' ';
          lineY += 15;
          if (lineY > itemStartY + 65) {
            line += '...';
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 105, lineY);
      
      ctx.textAlign = 'center';
      ctx.fillText(item.quantidade.toString(), 400, itemStartY + 40);
      ctx.fillText(formatarMoeda(item.preco_unitario), 480, itemStartY + 40);
      
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(formatarMoeda(item.subtotal), canvas.width - 20, itemStartY + 40);
      
      yPos += itemHeight;
    });
    
    yPos += 10;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(canvas.width - 20, yPos);
    ctx.stroke();
    
    yPos += 40;
    
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`TOTAL: ${formatarMoeda(calcularNovoTotal())}`, canvas.width - 20, yPos);
    
    const link = document.createElement('a');
    link.download = `novo-pedido.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Detalhes do Pedido - Novo Pedido
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto max-h-[70vh] p-1">
            <div className="grid grid-cols-1 gap-4">
              <div className="w-1/2">
                <Input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Itens do Pedido
                </h3>
                <Button 
                  onClick={() => setShowBuscarProdutos(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foto</TableHead>
                      <TableHead>Cód</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensEditados.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {item.imagem_url ? (
                              <img 
                                src={item.imagem_url} 
                                alt={item.descricao} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-xs text-gray-400">Sem foto</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell className="max-w-xs">{item.descricao}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarQuantidadeItem(index, item.quantidade - 1)}
                              className="w-6 h-6 p-0"
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantidade}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => editarQuantidadeItem(index, item.quantidade + 1)}
                              className="w-6 h-6 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatarMoeda(item.preco_unitario)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatarMoeda(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itensEditados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold border-t border-slate-200 dark:border-slate-600 pt-2">
                  <span>Total do Pedido:</span>
                  <span>{formatarMoeda(calcularNovoTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 justify-between bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <Button onClick={gerarImagemCarrinho} className="bg-purple-600 hover:bg-purple-700">
                <Camera className="w-4 h-4 mr-2" />
                Gerar Imagem
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => enviarParaPDV('varejo')} className="bg-blue-600 hover:bg-blue-700">
                Enviar para PDV Varejo
              </Button>
              <Button onClick={() => enviarParaPDV('atacado')} className="bg-purple-600 hover:bg-purple-700">
                Enviar para PDV Atacado
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">Fechar</Button>
              <Button onClick={handleSalvar} className="bg-green-600 hover:bg-green-700">
                Salvar Alterações
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showBuscarProdutos && (
        <ModalBuscarProdutos
          onClose={() => setShowBuscarProdutos(false)}
          onAdicionarItem={adicionarNovoItem}
        />
      )}
    </>
  );
}

export default function ModalPedidosOnline({ isOpen, onClose, onNavigate }) {
  const [pedidos, setPedidos] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showCriarPedidoModal, setShowCriarPedidoModal] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  
  // Helper function for accent-insensitive search
  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [dataFiltro, isOpen]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const pedidosList = await PedidoOnline.list("-created_date", 1000);
      setPedidos(pedidosList || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatusPedido = async (pedidoId, novoStatus) => {
    try {
      await PedidoOnline.update(pedidoId, { status: novoStatus });
      carregarDados();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const excluirPedido = async (pedidoId) => {
    if (confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      try {
        await PedidoOnline.delete(pedidoId);
        carregarDados();
        alert('Pedido excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir pedido:', error);
        alert('Erro ao excluir pedido');
      }
    }
  };

  const salvarAlteracoesPedido = async (pedidoId, dadosAtualizados) => {
    try {
      await PedidoOnline.update(pedidoId, dadosAtualizados);
      carregarDados();
      setShowDetalhesModal(false);
      setPedidoSelecionado(null);
      alert('Pedido atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      alert('Erro ao salvar alterações do pedido');
    }
  };

  const criarNovoPedido = async (dadosPedido) => {
    try {
      await PedidoOnline.create(dadosPedido);
      carregarDados();
      setShowCriarPedidoModal(false);
      alert('Pedido criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao criar pedido');
    }
  };

  const visualizarPedido = async (pedido) => {
    let pedidoParaExibir = { ...pedido };
    if (pedido.status === 'pendente') {
      try {
        await PedidoOnline.update(pedido.id, { status: 'em_preparo' });
        pedidoParaExibir.status = 'em_preparo';
        carregarDados();
      } catch (error) {
        console.error('Erro ao atualizar status para "Em Preparo":', error);
      }
    }
    setPedidoSelecionado(pedidoParaExibir);
    setShowDetalhesModal(true);
  };

  const handleEnviarParaPDV = (url) => {
    setShowDetalhesModal(false);
    setShowCriarPedidoModal(false);
    setPedidoSelecionado(null);
    onNavigate(url);
    onClose();
  };

  const formatarDataHoraSP = (data) => {
    const dataObj = new Date(data);
    
    // CORREÇÃO: Subtrair 3 horas para ajustar o fuso horário
    const dataCorrigida = new Date(dataObj.getTime() - (3 * 60 * 60 * 1000));
    
    const dataSP = dataCorrigida.toLocaleDateString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const horaSP = dataCorrigida.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', 
      minute: '2-digit'
    });
    
    return { data: dataSP, hora: horaSP };
  };

  const pedidosFiltrados = pedidos.filter(pedido => {
    const { data } = formatarDataHoraSP(pedido.created_date);
    const dataFormatted = data.split('/').reverse().join('-');
    const dataMatch = !dataFiltro || dataFormatted === dataFiltro;
    
    const statusMatch = filtroStatus === "todos" || pedido.status === filtroStatus;
    
    // Apply normalizeText for search terms
    const buscaNormalizada = normalizeText(busca);
    const buscaMatch = busca === "" || 
      normalizeText(pedido.numero_pedido).includes(buscaNormalizada) ||
      (pedido.cliente_nome && normalizeText(pedido.cliente_nome).includes(buscaNormalizada));
    
    return dataMatch && statusMatch && buscaMatch;
  });

  const getStatusBadge = (status) => {
    const statusMap = {
      'pendente': { label: 'Recebido', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
      'em_preparo': { label: 'Em Preparo', color: 'bg-blue-500 text-white hover:bg-blue-600' },
      'confirmado': { label: 'Separado', color: 'bg-green-600 text-white hover:bg-green-700' },
      'saiu_entrega': { label: 'Enviado', color: 'bg-purple-500 text-white hover:bg-purple-600' },
      'entregue': { label: 'Entregue', color: 'bg-gray-600 text-white hover:bg-gray-700' }
    };
    
    const config = statusMap[status] || { label: 'Pendente', color: 'bg-yellow-500 text-white hover:bg-yellow-600' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Gerenciamento de Pedidos Online
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-hidden flex flex-col p-4">
          <div className="flex gap-4 mb-4 flex-shrink-0">
            <Input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="w-40"
            />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="pendente">Recebido</SelectItem>
                <SelectItem value="confirmado">Separado</SelectItem>
                <SelectItem value="em_preparo">Em Preparo</SelectItem>
                <SelectItem value="saiu_entrega">Enviado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-grow relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar pedido ou cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={() => setShowCriarPedidoModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
            <Button onClick={carregarDados} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <div className="flex-grow overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="ml-2">Carregando...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead>Data</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.map(pedido => {
                    const { data, hora } = formatarDataHoraSP(pedido.created_date);
                    return (
                      <TableRow key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell>{data}</TableCell>
                        <TableCell>{hora}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => visualizarPedido(pedido)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {pedido.numero_pedido}
                          </button>
                        </TableCell>
                        <TableCell>{pedido.cliente_nome || 'Não informado'}</TableCell>
                        <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                        <TableCell>{formatarMoeda(pedido.total)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => visualizarPedido(pedido)}
                              title="Ver detalhes do pedido"
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => excluirPedido(pedido.id)}
                              title="Excluir pedido"
                              className="text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pedidosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {showCriarPedidoModal && (
          <ModalCriarNovoPedido
            onClose={() => setShowCriarPedidoModal(false)}
            onSave={criarNovoPedido}
            onEnviarParaPDV={handleEnviarParaPDV}
          />
        )}

        {showDetalhesModal && pedidoSelecionado && (
          <ModalDetalhesPedido
            pedido={pedidoSelecionado}
            onClose={() => {
              setShowDetalhesModal(false);
              setPedidoSelecionado(null);
            }}
            onSave={salvarAlteracoesPedido}
            onEnviarParaPDV={handleEnviarParaPDV}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
