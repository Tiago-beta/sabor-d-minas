
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Produto } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Printer, ArrowLeft, Save, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';

export default function Compras() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [listaCompra, setListaCompra] = useState([]);
  const [fornecedorFiltro, setFornecedorFiltro] = useState('');
  const [ordenacao, setOrdenacao] = useState('descricao');
  const [apenasComSugestao, setApenasComSugestao] = useState(false);
  const printRef = useRef();

  const [editandoCampo, setEditandoCampo] = useState(null);
  const [valorEditando, setValorEditando] = useState('');

  const [observacoes, setObservacoes] = useState('');
  const [estoqueIdeal, setEstoqueIdeal] = useState({});

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    const produtosList = await Produto.list('-created_date', 5000);
    setProdutos(produtosList);

    const idealStockMap = produtosList.reduce((acc, produto) => {
        // Load estoque_ideal_cx if it exists and is not null/undefined (including 0)
        if (produto.estoque_ideal_cx !== undefined && produto.estoque_ideal_cx !== null) {
            acc[produto.id] = produto.estoque_ideal_cx;
        }
        return acc;
    }, {});
    setEstoqueIdeal(idealStockMap);
  };

  const fornecedores = useMemo(() => {
    const fornecedoresUnicos = [...new Set(produtos.map(p => p.fornecedor).filter(Boolean))];
    return fornecedoresUnicos.sort();
  }, [produtos]);

  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const handleEstoqueIdealChange = async (produtoId, valor) => {
    const valorNumerico = parseFloat(valor);
    
    // Atualiza o estado local imediatamente para a UI responder
    if (!isNaN(valorNumerico) && valorNumerico >= 0) {
      setEstoqueIdeal(prev => ({ ...prev, [produtoId]: valorNumerico }));
    } else if (valor === '') {
      // Remove do estado se o campo for limpo (effectively setting it to 0 as per save logic)
      const { [produtoId]: _, ...rest } = estoqueIdeal;
      setEstoqueIdeal(rest);
    }
    
    // Salva no banco de dados
    try {
      // Se o valor for inválido ou vazio, salva 0 no banco
      const valorParaSalvar = (!isNaN(valorNumerico) && valorNumerico >= 0) ? valorNumerico : 0;
      await Produto.update(produtoId, { estoque_ideal_cx: valorParaSalvar });
    } catch (error) {
      console.error('Erro ao salvar estoque ideal:', error);
      alert('Não foi possível salvar o estoque ideal.');
    }
  };

  const produtosFiltrados = useMemo(() => {
    const produtosComSugestao = produtos
      .filter(p => p.tipo_produto !== 'kit')
      .map(p => {
        const uc = p.unidade_caixa > 0 ? p.unidade_caixa : 1;
        const estoqueAtualUnidades = p.estoque || 0;
        const estoqueAtualCx = estoqueAtualUnidades / uc;

        const estoqueIdealCx = estoqueIdeal[p.id] || 0; // Use the value from estoqueIdeal state, default to 0
        const sugestaoCaixas = Math.ceil(Math.max(0, estoqueIdealCx - estoqueAtualCx));

        const itemExistente = listaCompra.find(item => item.id === p.id);
        return {
          ...p,
          estoque_ideal_cx: estoqueIdeal[p.id] !== undefined && estoqueIdeal[p.id] !== null ? estoqueIdeal[p.id] : '', // Pass the actual value from state for input display
          sugestao_compra: sugestaoCaixas,
          qtd_compra: itemExistente ? itemExistente.qtd_compra : 0
        };
      });

    let filtrados = produtosComSugestao;

    if (fornecedorFiltro) {
      filtrados = filtrados.filter(p => p.fornecedor === fornecedorFiltro);
    }

    if (busca) {
      const buscaNormalizada = normalizeText(busca);
      filtrados = filtrados.filter(p =>
        (p.descricao && normalizeText(p.descricao).includes(buscaNormalizada)) ||
        (p.codigo && normalizeText(p.codigo).includes(buscaNormalizada))
      );
    }

    if (apenasComSugestao) {
      filtrados = filtrados.filter(p => p.sugestao_compra > 0);
    }

    filtrados.sort((a, b) => {
      if (ordenacao === 'descricao') {
        return (a.descricao || '').localeCompare(b.descricao || '');
      }
      if (ordenacao === 'sugestao') {
        return (b.sugestao_compra || 0) - (a.sugestao_compra || 0);
      }
      return 0;
    });

    return filtrados;
  }, [produtos, busca, fornecedorFiltro, ordenacao, apenasComSugestao, estoqueIdeal, listaCompra]);

  const aceitarSugestoes = () => {
    const novaListaCompra = [...listaCompra];
    let sugestoesAplicadas = 0;

    produtosFiltrados.forEach(produto => {
        if (produto.sugestao_compra > 0) {
            const itemIndex = novaListaCompra.findIndex(item => item.id === produto.id);
            const novaQtd = produto.sugestao_compra;
            if (itemIndex > -1) {
                novaListaCompra[itemIndex].qtd_compra = novaQtd;
            } else {
                novaListaCompra.push({ ...produto, qtd_compra: novaQtd });
            }
            sugestoesAplicadas++;
        }
    });
    setListaCompra(novaListaCompra);
    if(sugestoesAplicadas > 0){
        alert(`${sugestoesAplicadas} sugestão(ões) aplicada(s) à coluna de Quantidade de Compra!`);
    } else {
        alert('Nenhuma sugestão de compra a ser aplicada.');
    }
  };

  const handleQtdCompraChange = (produtoId, valor) => {
    const valorNumerico = parseInt(valor, 10);
    let novaQtd = 0;
    
    if (!isNaN(valorNumerico) && valorNumerico >= 0) {
      novaQtd = valorNumerico;
    }
    
    setListaCompra(prev => {
      const itemIndex = prev.findIndex(item => item.id === produtoId);
      if (itemIndex > -1) {
        const novaLista = [...prev];
        novaLista[itemIndex].qtd_compra = novaQtd;
        return novaLista;
      }
      const produto = produtos.find(p => p.id === produtoId);
      return [...prev, { ...produto, qtd_compra: novaQtd }];
    });
  };

  const iniciarEdicao = (id, campo, valorAtual) => {
    setEditandoCampo({ id, campo });
    setValorEditando(valorAtual);
  };

  const cancelarEdicao = () => {
    setEditandoCampo(null);
    setValorEditando('');
  };

  const salvarEdicaoInline = async () => {
    if (!editandoCampo) return;
    
    try {
      const { id, campo } = editandoCampo;
      let valor = valorEditando;
      
      if (campo === 'codigo') {
        if (!valor.trim()) {
            alert("O código não pode ser vazio.");
            return;
        }
        const produtosExistentes = await Produto.filter({ codigo: valor });
        const isDuplicate = produtosExistentes.some(p => p.id !== id);
        if (isDuplicate) {
            alert(`O código "${valor}" já está em uso por outro produto. Por favor, escolha um código único.`);
            return;
        }
      }

      if (['preco_varejo', 'preco_atacado', 'estoque', 'custo', 'unidade_caixa'].includes(campo)) {
        if (campo === 'unidade_caixa') {
          valor = parseInt(valorEditando) || 1;
        } else {
          valor = parseFloat(valorEditando) || 0;
        }
      }
      
      await Produto.update(id, { [campo]: valor });
      
      setProdutos(prev => prev.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      ));
      
      setEditandoCampo(null);
      setValorEditando("");
      
      carregarDados();
    } catch (error) {
      alert('Erro ao atualizar produto!');
      console.error(error);
    }
  };

  const gerarPedido = async () => {
    if (!fornecedorFiltro) {
        alert("Por favor, selecione um fornecedor para gerar o pedido.");
        return;
    }

    const produtosParaComprar = produtosFiltrados.filter(p => (p.qtd_compra || 0) > 0);
    if (produtosParaComprar.length === 0) {
        alert("Nenhum produto com quantidade de compra maior que zero para gerar o pedido.");
        return;
    }

    try {
        const { Recebimento, RecebimentoItem } = await import('@/api/entities');
        
        // 1. Create the main pending Recebimento record
        const novoRecebimento = await Recebimento.create({
            fornecedor: fornecedorFiltro,
            data_recebimento: new Date().toISOString().split('T')[0],
            observacoes: observacoes,
            status: "Pendente"
        });

        // 2. Create the items for this Recebimento
        const itensParaCriar = produtosParaComprar.map(produto => ({
            recebimento_id: novoRecebimento.id,
            produto_id: produto.id,
            codigo: produto.codigo,
            descricao: produto.descricao,
            quantidade: (produto.qtd_compra || 0) * (produto.unidade_caixa || 1) // Store total units
        }));

        if (itensParaCriar.length > 0) {
            await RecebimentoItem.bulkCreate(itensParaCriar);
        }

        alert(`Pedido de compra para "${fornecedorFiltro}" gerado com sucesso! Agora você pode recebê-lo na tela de Recebimentos.`);
        
        // Clear the form after success
        setListaCompra([]);
        setObservacoes('');

    } catch (error) {
        console.error("Erro ao gerar pedido de compra:", error);
        alert("Ocorreu um erro ao gerar o pedido de compra.");
    }
  };


  const handleImprimir = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Ordem de Compra</title>');
    printWindow.document.write(`
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          font-size: 12px;
        }
        h1, h2 {
          text-align: center;
          margin: 10px 0;
        }
        h1 {
          font-size: 18px;
          font-weight: bold;
        }
        h2 {
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .total-final {
          font-size: 18px;
          font-weight: bold;
          text-align: right;
          margin-top: 20px;
          border-top: 2px solid #000;
          padding-top: 10px;
        }
        @media print {
          body { margin: 10px; }
          .total-final { page-break-inside: avoid; }
        }
      </style>
    `);
    printWindow.document.write('</head><body>');

    printWindow.document.write('<h1>Ordem de Compra</h1>');
    if (fornecedorFiltro) {
      printWindow.document.write(`<h2>Fornecedor: ${fornecedorFiltro}</h2>`);
    }
    printWindow.document.write(`<h2>Data: ${new Date().toLocaleDateString('pt-BR')}</h2>`);

    if (observacoes) {
        printWindow.document.write(`
            <div style="background-color: #ffc; padding: 10px; border: 1px solid #ccc; margin-top: 15px; margin-bottom: 15px; border-radius: 5px;">
                <h3 style="margin-top:0; font-weight: bold;">Observações:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${observacoes}</p>
            </div>
        `);
    }

    printWindow.document.write(`
      <table>
        <thead>
          <tr>
            <th>Qtd</th>
            <th>Produto</th>
            <th>Custo Unit.</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
    `);

    const produtosParaImprimir = produtosFiltrados.filter(p => (p.qtd_compra || 0) > 0);

    produtosParaImprimir.forEach(produto => {
      const qtdCompra = produto.qtd_compra || 0;
      const custoUnit = produto.custo || 0;
      const valorTotal = custoUnit * qtdCompra * (produto.unidade_caixa || 1);

      printWindow.document.write(`
        <tr>
          <td class="text-center">${qtdCompra}</td>
          <td>${produto.descricao}</td>
          <td class="text-right">R$ ${custoUnit.toFixed(2)}</td>
          <td class="text-right">R$ ${valorTotal.toFixed(2)}</td>
        </tr>
      `);
    });

    printWindow.document.write('</tbody></table>');

    printWindow.document.write(`
      <div class="total-final">
        VALOR TOTAL DA COMPRA: R$ ${valorTotalCompra.toFixed(2)}
      </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const valorTotalCompra = useMemo(() => {
    return produtosFiltrados.reduce((acc, p) => {
      const custo = p.custo || 0;
      const qtd = p.qtd_compra || 0;
      const uc = p.unidade_caixa || 1;
      return acc + (custo * qtd * uc);
    }, 0);
  }, [produtosFiltrados]);

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Lista de Compras</h1>
          <div className="flex gap-2">
            <Button onClick={aceitarSugestoes} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Aceitar Sugestões
            </Button>
            <Button onClick={gerarPedido} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Gerar Pedido de Compra
            </Button>
            <Button onClick={handleImprimir} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Link to={createPageUrl("Gerencia")}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
            </Link>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <Label>Buscar por código ou descrição</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600"
                />
              </div>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {fornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordenar por</Label>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="bg-gray-700 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descricao">Descrição</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="sugestao-filter" checked={apenasComSugestao} onCheckedChange={setApenasComSugestao} />
              <Label htmlFor="sugestao-filter">Apenas com sugestão &gt; 0</Label>
            </div>
            <div className="md:col-span-4 mt-2">
              {fornecedorFiltro && (
                  <div>
                      <Label>Observações para a Ordem de Compra</Label>
                      <Textarea
                          placeholder="Ex: Entregar até sexta-feira, ligar para João ao chegar..."
                          value={observacoes}
                          onChange={(e) => setObservacoes(e.target.value)}
                          className="bg-gray-700 border-gray-600 mt-1"
                      />
                  </div>
              )}
            </div>
          </div>
        </div>

        <div ref={printRef}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>UC</TableHead>
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead>Sugestão Compra (cx)</TableHead>
                  <TableHead>Qtd. Compra (cx)</TableHead>
                  <TableHead>Estoque Atual (cx)</TableHead>
                  <TableHead>Estoque Ideal (cx)</TableHead>
                  <TableHead>Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>{produto.codigo}</TableCell>
                    <TableCell>{produto.descricao}</TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'fornecedor' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="h-8 bg-gray-700 border-gray-600 text-white"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer px-1 py-1 rounded hover:bg-gray-700 transition-colors"
                          onClick={() => iniciarEdicao(produto.id, 'fornecedor', produto.fornecedor)}
                        >
                          <span className="bg-gray-700 px-2 py-1 rounded-full text-xs">
                            {produto.fornecedor || "Clique para editar"}
                          </span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'unidade_caixa' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-16 h-8 bg-gray-700 border-gray-600 text-white"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer px-1 py-1 rounded font-medium hover:bg-gray-700 transition-colors"
                          onClick={() => iniciarEdicao(produto.id, 'unidade_caixa', produto.unidade_caixa)}
                        >
                          {produto.unidade_caixa || "1"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'custo' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-20 h-8 bg-gray-700 border-gray-600 text-white"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer px-1 py-1 rounded font-medium hover:bg-gray-700 transition-colors"
                          onClick={() => iniciarEdicao(produto.id, 'custo', produto.custo)}
                        >
                          R$ {(produto.custo || 0).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                       <div className="w-20 text-center bg-purple-600 text-white p-2 rounded font-bold">
                         {produto.sugestao_compra}
                       </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={produto.qtd_compra != null ? produto.qtd_compra : ''}
                        onChange={(e) => handleQtdCompraChange(produto.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === '+') {
                            e.preventDefault();
                          }
                        }}
                        className="w-20 bg-gray-700 border-gray-600 text-center"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                       <div className="w-20 text-center bg-gray-700 p-2 rounded">
                          {(produto.estoque / (produto.unidade_caixa || 1)).toFixed(1)}
                       </div>
                    </TableCell>
                    <TableCell>
                       <Input
                            type="number"
                            min="0"
                            step="1"
                            value={produto.estoque_ideal_cx !== null && produto.estoque_ideal_cx !== undefined ? produto.estoque_ideal_cx : ''}
                            onChange={(e) => handleEstoqueIdealChange(produto.id, e.target.value)}
                            className="w-20 bg-gray-700 border-gray-600 text-center"
                            placeholder="0"
                        />
                    </TableCell>
                    <TableCell>R$ {((produto.custo || 0) * (produto.qtd_compra || 0) * (produto.unidade_caixa || 1)).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-right mt-4 font-bold text-xl">
            Valor Total da Compra: R$ {valorTotalCompra.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
