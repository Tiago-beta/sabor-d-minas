
import React, { useState, useEffect } from 'react';
import { Recebimento, RecebimentoItem, Produto } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Truck, ArrowLeft, X, Search, Check, Eye, ListTodo, FilePlus2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Recebimentos() {
  const [recebimentos, setRecebimentos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [modalProduto, setModalProduto] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [recebimentoSelecionado, setRecebimentoSelecionado] = useState(null);
  const [itensRecebimento, setItensRecebimento] = useState([]);
  const [fornecedorAtual, setFornecedorAtual] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().split('T')[0]);
  const [numeroNota, setNumeroNota] = useState('');
  const [itensRecebimentoNovo, setItensRecebimentoNovo] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSelecionados, setProdutosSelecionados] = useState(new Set());
  
  // State for the new workflow
  const [modalPedidosPendentes, setModalPedidosPendentes] = useState(false);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [recebimentoPendenteId, setRecebimentoPendenteId] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const [recebimentosList, produtosList] = await Promise.all([
      Recebimento.filter({ status: "Recebido" }, '-created_date'),
      Produto.list('-created_date')
    ]);
    setRecebimentos(recebimentosList);
    setProdutos(produtosList);
  };

  const carregarItensRecebimento = async (recebimentoId) => {
    try {
      const itens = await RecebimentoItem.filter({ recebimento_id: recebimentoId });
      setItensRecebimento(itens);
    } catch (error) {
      console.error('Erro ao carregar itens do recebimento:', error);
      setItensRecebimento([]);
    }
  };

  const abrirDetalhesRecebimento = async (recebimento) => {
    setRecebimentoSelecionado(recebimento);
    await carregarItensRecebimento(recebimento.id);
    setModalDetalhes(true);
  };

  const fornecedoresUnicos = [...new Set(produtos.map(p => p.fornecedor).filter(Boolean))].sort();

  // Filtrar produtos por fornecedor selecionado
  const produtosFiltrados = produtos.filter(p => {
    const matchFornecedor = !fornecedorAtual || p.fornecedor === fornecedorAtual;
    const matchBusca = !buscaProduto ||
      (p.descricao || '').toLowerCase().includes(buscaProduto.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(buscaProduto.toLowerCase());
    return matchFornecedor && matchBusca;
  });

  const abrirModalNovo = (manual = false) => {
    setRecebimentoPendenteId(null);
    setFornecedorAtual('');
    setDataRecebimento(new Date().toISOString().split('T')[0]);
    setNumeroNota('');
    setItensRecebimentoNovo([]);
    setModalPedidosPendentes(false);
    setModalNovo(true);
  };

  const abrirModalPedidosPendentes = async () => {
    try {
      const pendentes = await Recebimento.filter({ status: "Pendente" }, '-created_date');
      setPedidosPendentes(pendentes);
      setModalPedidosPendentes(true);
    } catch (error) {
      console.error("Erro ao carregar pedidos pendentes:", error);
      alert("Não foi possível carregar os pedidos pendentes.");
    }
  };

  const carregarPedidoParaRecebimento = async (pedido) => {
    try {
      const itensDb = await RecebimentoItem.filter({ recebimento_id: pedido.id });
      
      const itensParaForm = itensDb.map(itemDb => {
        const produto = produtos.find(p => p.id === itemDb.produto_id);
        const uc = produto?.unidade_caixa || 1;
        const qtdCaixas = itemDb.quantidade > 0 && uc > 0 ? itemDb.quantidade / uc : 0;
        
        return {
          id: itemDb.id, // Original DB item ID for updates
          produto_id: itemDb.produto_id,
          codigo: produto?.codigo,
          descricao: produto?.descricao,
          unidade_caixa: uc,
          quantidade_caixas: qtdCaixas,
          quantidade_produtos: itemDb.quantidade
        };
      });
      
      setFornecedorAtual(pedido.fornecedor);
      setDataRecebimento(new Date(pedido.data_recebimento).toISOString().split('T')[0]);
      setNumeroNota(pedido.numero_nota || '');
      setItensRecebimentoNovo(itensParaForm);
      setRecebimentoPendenteId(pedido.id);

      setModalPedidosPendentes(false);
      setModalNovo(true);

    } catch (error) {
      console.error("Erro ao carregar itens do pedido:", error);
      alert("Não foi possível carregar os itens do pedido.");
    }
  };

  const abrirModalProduto = () => {
    setProdutosSelecionados(new Set());
    setBuscaProduto('');
    setModalProduto(true);
  };

  const toggleProdutoSelecionado = (produtoId) => {
    const novosIds = new Set(produtosSelecionados);
    if (novosIds.has(produtoId)) {
      novosIds.delete(produtoId);
    } else {
      novosIds.add(produtoId);
    }
    setProdutosSelecionados(novosIds);
  };

  const selecionarTodosProdutos = () => {
    const todosProdutosVisiveis = produtosFiltrados
      .filter(p => !itensRecebimentoNovo.find(item => item.produto_id === p.id))
      .map(p => p.id);
    setProdutosSelecionados(new Set(todosProdutosVisiveis));
  };

  const desselecionarTodosProdutos = () => {
    setProdutosSelecionados(new Set());
  };

  const adicionarProdutosSelecionados = () => {
    if (produtosSelecionados.size === 0) {
      alert('Selecione pelo menos um produto!');
      return;
    }

    const novosItens = Array.from(produtosSelecionados).map(produtoId => {
      const produto = produtos.find(p => p.id === produtoId);
      return {
        id: Date.now() + Math.random(), // Temporary ID for new items
        produto_id: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        unidade_caixa: produto.unidade_caixa || 1,
        quantidade_caixas: 1,
        quantidade_produtos: (produto.unidade_caixa || 1) * 1
      };
    });

    setItensRecebimentoNovo([...itensRecebimentoNovo, ...novosItens]);
    setModalProduto(false);
    setProdutosSelecionados(new Set());
    setBuscaProduto('');
  };

  const adicionarProduto = (produto) => {
    const jaExiste = itensRecebimentoNovo.find(item => item.produto_id === produto.id);
    if (jaExiste) {
      alert('Produto já adicionado!');
      return;
    }

    const novoItem = {
      id: Date.now(), // Temporary ID for new items
      produto_id: produto.id,
      codigo: produto.codigo,
      descricao: produto.descricao,
      unidade_caixa: produto.unidade_caixa || 1,
      quantidade_caixas: 1,
      quantidade_produtos: (produto.unidade_caixa || 1) * 1
    };

    setItensRecebimentoNovo([...itensRecebimentoNovo, novoItem]);
    setModalProduto(false);
    setBuscaProduto('');
  };

  const removerItem = (id) => {
    setItensRecebimentoNovo(itensRecebimentoNovo.filter(item => item.id !== id));
  };

  const atualizarQuantidadeCaixas = (id, quantidadeCaixas) => {
    setItensRecebimentoNovo(itensRecebimentoNovo.map(item => {
      if (item.id === id) {
        const qtdCx = Math.max(0, parseFloat(quantidadeCaixas) || 0);
        return {
          ...item,
          quantidade_caixas: qtdCx,
          quantidade_produtos: qtdCx * (item.unidade_caixa || 1)
        };
      }
      return item;
    }));
  };

  const salvarRecebimento = async () => {
    if (!fornecedorAtual || itensRecebimentoNovo.length === 0) {
      alert('Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      if (recebimentoPendenteId) { // It's an update of a pending receipt
        await Recebimento.update(recebimentoPendenteId, {
          status: 'Recebido',
          data_recebimento: dataRecebimento,
          numero_nota: numeroNota,
        });

        // Update items in case quantities were changed during confirmation
        for (const item of itensRecebimentoNovo) {
          if (item.id && (typeof item.id === 'string' || (typeof item.id === 'number' && String(item.id).length < 13))) { // Check for existing DB ID (string or shorter number)
            await RecebimentoItem.update(item.id, {
              quantidade: item.quantidade_produtos,
            });
          } else { // This is a new item added to a pending receipt (likely has a Date.now() ID)
            await RecebimentoItem.create({
              recebimento_id: recebimentoPendenteId,
              produto_id: item.produto_id,
              codigo: item.codigo,
              descricao: item.descricao,
              quantidade: item.quantidade_produtos
            });
          }
        }
      } else { // It's a new, manual receipt
        const recebimento = await Recebimento.create({
          fornecedor: fornecedorAtual,
          data_recebimento: dataRecebimento,
          numero_nota: numeroNota,
          status: 'Recebido'
        });

        const itensParaCriar = itensRecebimentoNovo.map(item => ({
          recebimento_id: recebimento.id,
          produto_id: item.produto_id,
          codigo: item.codigo,
          descricao: item.descricao,
          quantidade: item.quantidade_produtos
        }));

        await RecebimentoItem.bulkCreate(itensParaCriar);
      }

      // Atualizar estoque dos produtos COM controle de visibilidade automática
      const estoqueUpdates = [];
      for (const item of itensRecebimentoNovo) {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          const estoqueAnterior = produto.estoque || 0;
          const novoEstoque = estoqueAnterior + item.quantidade_produtos;
          
          // Preparar dados para atualização
          const dadosAtualizacao = { estoque: novoEstoque };
          
          // Se o estoque estava zerado e agora ficou positivo, marcar como visível no catálogo
          if (estoqueAnterior === 0 && novoEstoque > 0) {
            dadosAtualizacao.aparece_catalogo = true;
          }
          
          estoqueUpdates.push(
            Produto.update(produto.id, dadosAtualizacao)
          );
        }
      }

      if (estoqueUpdates.length > 0) {
        await Promise.all(estoqueUpdates);
      }

      alert('Recebimento salvo com sucesso e estoque atualizado!');
      setModalNovo(false);
      setRecebimentoPendenteId(null);
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar recebimento:', error);
      alert('Erro ao salvar recebimento.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && produtosSelecionados.size > 0) {
      e.preventDefault();
      adicionarProdutosSelecionados();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Recebimento de Produtos
          </h1>
          <div className="flex gap-2">
            <Link to={createPageUrl("PDV")}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao PDV
              </Button>
            </Link>
            <Button onClick={abrirModalPedidosPendentes} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Recebimento
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Recebimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Nº Nota Fiscal</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebimentos.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell>{rec.fornecedor}</TableCell>
                    <TableCell>{new Date(rec.data_recebimento).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{rec.numero_nota || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirDetalhesRecebimento(rec)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Ver detalhes do recebimento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recebimentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">Nenhum recebimento registrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal: Select Pending Order */}
        <Dialog open={modalPedidosPendentes} onOpenChange={setModalPedidosPendentes}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTodo className="w-6 h-6" />
                Pedidos de Compra Pendentes
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data do Pedido</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosPendentes.map(pedido => (
                    <TableRow key={pedido.id}>
                      <TableCell>{pedido.fornecedor}</TableCell>
                      <TableCell>{new Date(pedido.data_recebimento).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{pedido.observacoes || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" onClick={() => carregarPedidoParaRecebimento(pedido)}>
                          Carregar Pedido
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pedidosPendentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhum pedido de compra pendente.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t">
                <Button variant="outline" onClick={() => abrirModalNovo(true)}>
                    <FilePlus2 className="w-4 h-4 mr-2"/>
                    Criar Recebimento Manual
                </Button>
            </div>
          </DialogContent>
        </Dialog>


        {/* Modal de Novo Recebimento */}
        <Dialog open={modalNovo} onOpenChange={setModalNovo}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Novo Recebimento</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4 flex-shrink-0">
              <Select onValueChange={setFornecedorAtual} value={fornecedorAtual}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedoresUnicos.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
              <Input placeholder="Nº da Nota Fiscal" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
            </div>

            <div className="border rounded-lg p-4 flex-grow min-h-0 flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="font-semibold">Produtos Recebidos</h3>
                <Button onClick={abrirModalProduto} disabled={!fornecedorAtual}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-24 text-center">Qtd. Caixas</TableHead>
                      <TableHead className="w-24 text-center">UC</TableHead>
                      <TableHead className="w-24 text-center">Qtd. Produtos</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensRecebimentoNovo.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium">{item.descricao}</p>
                          <p className="text-xs text-gray-500">Cód: {item.codigo}</p>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantidade_caixas}
                            onChange={(e) => atualizarQuantidadeCaixas(item.id, e.target.value)}
                            className="w-20 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                            {item.unidade_caixa}
                        </TableCell>
                         <TableCell className="text-center font-bold">
                            {item.quantidade_produtos}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removerItem(item.id)}>
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itensRecebimentoNovo.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                           Adicione produtos a este recebimento.
                         </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
              <Button variant="outline" onClick={() => setModalNovo(false)}>Cancelar</Button>
              <Button onClick={salvarRecebimento} className="bg-green-600 hover:bg-green-700">Salvar Recebimento</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Seleção de Produtos com Seleção Múltipla */}
        <Dialog open={modalProduto} onOpenChange={setModalProduto}>
          <DialogContent className="max-w-2xl h-[70vh] flex flex-col" onKeyDown={handleKeyPress}>
            <DialogHeader>
              <DialogTitle>Adicionar Produtos ao Recebimento</DialogTitle>
            </DialogHeader>
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex justify-between items-center py-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={selecionarTodosProdutos}>
                  Selecionar Todos
                </Button>
                <Button size="sm" variant="outline" onClick={desselecionarTodosProdutos}>
                  Limpar Seleção
                </Button>
              </div>
              <span className="text-sm text-gray-500">
                {produtosSelecionados.size} produto(s) selecionado(s)
              </span>
            </div>

            <div className="flex-grow overflow-y-auto mt-2 space-y-2 pr-2">
              {produtosFiltrados
                .filter(p => !itensRecebimentoNovo.find(item => item.produto_id === p.id))
                .map(p => (
                <div
                  key={p.id}
                  className="p-3 border rounded-lg hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                  onClick={() => toggleProdutoSelecionado(p.id)}
                >
                  <Checkbox
                    checked={produtosSelecionados.has(p.id)}
                    onCheckedChange={() => toggleProdutoSelecionado(p.id)}
                  />
                  <div className="flex-grow">
                    <p className="font-medium">{p.descricao}</p>
                    <p className="text-sm text-gray-500">Código: {p.codigo}</p>
                  </div>
                </div>
              ))}
              {produtosFiltrados.filter(p => !itensRecebimentoNovo.find(item => item.produto_id === p.id)).length === 0 && (
                <div className="text-center py-8 text-gray-500">Nenhum produto disponível para este fornecedor ou que já não esteja na lista.</div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
              <Button variant="outline" onClick={() => setModalProduto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={adicionarProdutosSelecionados}
                className="bg-green-600 hover:bg-green-700"
                disabled={produtosSelecionados.size === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Adicionar {produtosSelecionados.size > 0 ? `(${produtosSelecionados.size})` : ''}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes do Recebimento */}
        <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Detalhes do Recebimento - {recebimentoSelecionado?.fornecedor}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4 flex-shrink-0">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-medium">Fornecedor:</label>
                  <p className="text-gray-600">{recebimentoSelecionado?.fornecedor}</p>
                </div>
                <div>
                  <label className="font-medium">Data:</label>
                  <p className="text-gray-600">
                    {recebimentoSelecionado?.data_recebimento 
                      ? new Date(recebimentoSelecionado.data_recebimento).toLocaleDateString('pt-BR')
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <label className="font-medium">Nota Fiscal:</label>
                  <p className="text-gray-600">{recebimentoSelecionado?.numero_nota || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 flex-grow min-h-0 flex flex-col">
              <h3 className="font-semibold mb-4">Produtos Recebidos</h3>
              
              <div className="flex-grow overflow-y-auto min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensRecebimento.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.codigo}</TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-center font-bold">
                          {item.quantidade}
                        </TableCell>
                      </TableRow>
                    ))}
                    {itensRecebimento.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                          Nenhum item encontrado para este recebimento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
              <Button variant="outline" onClick={() => setModalDetalhes(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
