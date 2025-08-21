
import React, { useState, useEffect, useMemo } from "react";
import { Venda, Cliente, Produto } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Search, CheckCircle, Calendar, DollarSign, User, Phone, FileText, Calculator, Trash2, Pencil } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ModalSenhaGerencia component removed as per instructions

const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function ModalEditarVenda({ venda, onSave, onCancel }) {
    const [dataPagamento, setDataPagamento] = useState(venda.data_pagamento || '');
    const [pagamentoParcial, setPagamentoParcial] = useState('');

    const handleSave = () => {
        onSave({
            data_pagamento: dataPagamento,
            pagamentoParcial: parseFloat(pagamentoParcial.replace(',', '.')) || 0
        });
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Venda a Prazo #{venda.numero_venda}</DialogTitle>
                    <DialogDescription>
                        Cliente: {venda.cliente_nome}<br/>
                        Saldo Devedor: <span className="font-bold">{formatCurrency(venda.total)}</span>
                        {venda.total_original && ` (Valor Original: ${formatCurrency(venda.total_original)})`}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="data_vencimento">Nova Data de Vencimento</Label>
                        <Input 
                            id="data_vencimento"
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="pagamento_parcial">Registrar Pagamento Parcial</Label>
                        <Input
                            id="pagamento_parcial"
                            type="text"
                            placeholder="0,00"
                            value={pagamentoParcial}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numericValue = value.replace(/[^0-9,]/g, '').replace(',', '.');
                              if (!isNaN(parseFloat(numericValue)) || numericValue === '') {
                                setPagamentoParcial(value.replace('.', ','));
                              }
                            }}
                            onBlur={(e) => {
                                const value = parseFloat(e.target.value.replace(',', '.')) || 0;
                                setPagamentoParcial(value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            }}
                        />
                    </div>
                    {venda.observacoes && (
                        <div>
                            <Label>Histórico de Observações</Label>
                            <Textarea value={venda.observacoes} readOnly rows={4} className="bg-gray-100 mt-1" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Alterações</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
};

const calcularDiasAtraso = (dataPagamento) => {
    if (!dataPagamento) return 0;
    const hoje = new Date();
    const dataVencimento = new Date(dataPagamento + 'T00:00:00'); // Ensure date is treated as local day start
    const diffTime = hoje - dataVencimento;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

export default function APrazo() {
  const [vendasAPrazo, setVendasAPrazo] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]); // New state for products
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendentes'); // Inicia filtrado por pendentes
  const [filtroCliente, setFiltroCliente] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [vendaParaMarcarPaga, setVendaParaMarcarPaga] = useState(null);
  const [clienteParaFecharConta, setClienteParaFecharConta] = useState(null);
  // showSenhaModal and acaoPendente states removed
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null); // Stores the sale object to be deleted
  const [vendaParaEditar, setVendaParaEditar] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [vendasList, clientesList, produtosList] = await Promise.all([
        Venda.filter({ metodo_pagamento: 'aprazo' }, '-created_date'),
        Cliente.list(),
        Produto.list() // Fetch products
      ]);
      
      setVendasAPrazo(vendasList);
      setClientes(clientesList);
      setProdutos(produtosList); // Set products state
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPaga = async () => {
    if (!vendaParaMarcarPaga) return;

    try {
      await Venda.update(vendaParaMarcarPaga.id, { 
        status_pagamento: 'pago',
        data_pagamento_realizado: new Date().toISOString().split('T')[0]
      });
      
      setVendaParaMarcarPaga(null);
      carregarDados();
    } catch (error) {
      console.error("Erro ao marcar como paga:", error);
      alert("Erro ao marcar venda como paga!");
    }
  };

  const fecharContaCliente = async () => {
    if (!clienteParaFecharConta) return;

    try {
      // Filter from the full list to ensure all pending sales for the client are captured
      const vendasPendentesCliente = vendasAPrazo.filter(v => 
        v.cliente_nome === clienteParaFecharConta && v.status_pagamento === 'pendente'
      );

      const promises = vendasPendentesCliente.map(venda =>
        Venda.update(venda.id, { 
          status_pagamento: 'pago',
          data_pagamento_realizado: new Date().toISOString().split('T')[0]
        })
      );

      await Promise.all(promises);
      
      setClienteParaFecharConta(null);
      carregarDados();
      alert(`Conta fechada! ${vendasPendentesCliente.length} vendas marcadas como pagas.`);
    } catch (error) {
      console.error("Erro ao fechar conta:", error);
      alert("Erro ao fechar conta do cliente!");
    }
  };

  const handleExcluirVenda = (venda) => {
    // Directly set the sale to be deleted, no password modal needed
    setVendaParaExcluir(venda);
  };
  
  const handleEditarVenda = (venda) => {
    // Directly set the sale to be edited, no password modal needed
    setVendaParaEditar(venda);
  };

  // handleSenhaConfirmada and handleSenhaCancelada functions removed

  const confirmarExclusaoVenda = async () => {
    if (!vendaParaExcluir) return;

    try {
      setLoading(true);

      // Return items to stock
      if (vendaParaExcluir.itens && vendaParaExcluir.itens.length > 0) {
        const updates = [];
        for (const itemVendido of vendaParaExcluir.itens) {
          const produtoVendido = produtos.find(p => p.id === itemVendido.item_id);
          if (produtoVendido) {
            if (produtoVendido.tipo_produto === 'kit' && produtoVendido.componentes_kit && produtoVendido.componentes_kit.length > 0) {
              for (const componente of produtoVendido.componentes_kit) {
                const produtoComponente = produtos.find(p => p.id === componente.produto_id);
                if (produtoComponente) {
                  const estoqueAtual = Number(produtoComponente.estoque) || 0;
                  // Quantity to return to stock: sold item quantity * component quantity used per kit
                  const quantidadeDevolvida = (Number(itemVendido.quantidade) || 0) * (Number(componente.quantidade_utilizada) || 0);
                  updates.push(
                    Produto.update(produtoComponente.id, { estoque: estoqueAtual + quantidadeDevolvida })
                  );
                }
              }
            } else {
              const estoqueAtual = Number(produtoVendido.estoque) || 0;
              const quantidadeVendida = Number(itemVendido.quantidade) || 0;
              updates.push(
                Produto.update(produtoVendido.id, { estoque: estoqueAtual + quantidadeVendida })
              );
            }
          }
        }
        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }
      
      // Delete the sale
      await Venda.delete(vendaParaExcluir.id);

      alert(`Venda ${vendaParaExcluir.numero_venda} excluída com sucesso!`);
      setVendaParaExcluir(null); // Clear the pending deletion
      carregarDados(); // Reload data
    } catch (err) {
      console.error('Erro ao excluir venda:', err);
      alert('Falha ao excluir a venda. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicaoVenda = async (dadosEditados) => {
    if (!vendaParaEditar) return;
    
    try {
        const updateData = {};
        let newTotal = vendaParaEditar.total;
        let newObservacoes = vendaParaEditar.observacoes || '';

        // Handle partial payment
        if (dadosEditados.pagamentoParcial > 0) {
            if (dadosEditados.pagamentoParcial > vendaParaEditar.total + 0.01) { // Add a small threshold for comparison
                alert('O pagamento parcial não pode ser maior que o valor restante.');
                return;
            }
            
            // Set total_original if it doesn't exist (this is the first partial payment for this sale)
            if (vendaParaEditar.total_original === undefined || vendaParaEditar.total_original === null) {
                updateData.total_original = vendaParaEditar.total;
            }
            
            newTotal = parseFloat((newTotal - dadosEditados.pagamentoParcial).toFixed(2));
            
            const obsTextPagamento = `\n- Pagamento parcial de ${formatCurrency(dadosEditados.pagamentoParcial)} em ${new Date().toLocaleDateString('pt-BR')}. Saldo anterior: ${formatCurrency(vendaParaEditar.total)}. Novo saldo: ${formatCurrency(newTotal)}.`;
            newObservacoes += obsTextPagamento;

            updateData.total = newTotal;

            if (newTotal <= 0.01) { // Using a small threshold for floating point issues
                updateData.status_pagamento = 'pago';
                updateData.total = 0; // Set to 0 to avoid negative micro-cents
                updateData.data_pagamento_realizado = new Date().toISOString().split('T')[0];
            }
        }

        // Handle due date change
        if (dadosEditados.data_pagamento && dadosEditados.data_pagamento !== vendaParaEditar.data_pagamento) {
            updateData.data_pagamento = dadosEditados.data_pagamento;
            const obsTextVencimento = `\n- Data de vencimento alterada de ${formatDate(vendaParaEditar.data_pagamento)} para ${formatDate(dadosEditados.data_pagamento)}.`;
            newObservacoes += obsTextVencimento;
        }

        // Only update observacoes if they actually changed
        if (newObservacoes !== (vendaParaEditar.observacoes || '')) {
            updateData.observacoes = newObservacoes.trim();
        }

        if (Object.keys(updateData).length > 0) {
              await Venda.update(vendaParaEditar.id, updateData);
        }
      
        setVendaParaEditar(null);
        carregarDados();

    } catch (error) {
        console.error("Erro ao salvar edição:", error);
        alert("Erro ao salvar alterações da venda!");
    }
  };

  const getClienteInfo = (identifier) => {
    if (!identifier) return { nome: 'Cliente não encontrado', telefone: '' };
    const cliente = clientes.find(c => c.id === identifier || c.nome === identifier);
    return cliente || { nome: identifier, telefone: '' };
  };

  const vendasFiltradas = vendasAPrazo.filter(venda => {
    const clienteInfo = getClienteInfo(venda.cliente_id || venda.cliente_nome);
    const diasAtraso = calcularDiasAtraso(venda.data_pagamento);
    
    const matchBusca = (venda.numero_venda || '').toLowerCase().includes(busca.toLowerCase()) ||
                      (clienteInfo.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
                      (venda.cliente_nome || '').toLowerCase().includes(busca.toLowerCase());
    
    let matchStatus = true;
    if (filtroStatus === 'pendentes') {
      matchStatus = venda.status_pagamento === 'pendente';
    } else if (filtroStatus === 'pagas') {
      matchStatus = venda.status_pagamento === 'pago';
    } else if (filtroStatus === 'vencidas') {
      matchStatus = venda.status_pagamento === 'pendente' && diasAtraso > 0;
    }

    let matchCliente = true;
    if (filtroCliente !== 'todos') {
      const nomeDaVenda = getClienteInfo(venda.cliente_id || venda.cliente_nome).nome;
      matchCliente = nomeDaVenda === filtroCliente;
    }
    
    return matchBusca && matchStatus && matchCliente;
  });

  const totais = useMemo(() => {
    let pendente = 0;
    let vencido = 0;
    let pago = 0;
    
    vendasFiltradas.forEach(venda => {
        if (venda.status_pagamento === 'pago') {
            pago += (venda.total || 0);
        } else {
            pendente += (venda.total || 0);
            if (calcularDiasAtraso(venda.data_pagamento) > 0) {
                vencido += (venda.total || 0);
            }
        }
    });

    return { pendente, vencido, pago, geral: pendente + pago };
  }, [vendasFiltradas]);
  
  const totalPendenteClienteSelecionado = useMemo(() => {
    if (filtroCliente === 'todos') return 0;
    // `filtroCliente` now holds the client's name
    return vendasAPrazo
      .filter(v => v.cliente_nome === filtroCliente && v.status_pagamento === 'pendente')
      .reduce((acc, v) => acc + (v.total || 0), 0);
  }, [vendasAPrazo, filtroCliente]);

  const clientesComPendencias = useMemo(() => {
    const clientesMap = new Map();
    
    vendasAPrazo.forEach(venda => {
      if (venda.status_pagamento === 'pendente') {
        const clienteIdentifier = venda.cliente_nome || venda.cliente_id;
        if (!clienteIdentifier) return;

        const clienteInfo = getClienteInfo(clienteIdentifier);
        const nomeCliente = clienteInfo.nome;
        
        if (nomeCliente && nomeCliente !== 'Cliente não encontrado') {
            if (!clientesMap.has(nomeCliente)) {
                clientesMap.set(nomeCliente, {
                    id: nomeCliente, 
                    nome: nomeCliente,
                    totalPendente: 0
                });
            }
            const clienteData = clientesMap.get(nomeCliente);
            clienteData.totalPendente += (venda.total || 0);
        }
      }
    });
    
    return Array.from(clientesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vendasAPrazo, clientes]);

  const imprimirRelatorio = () => {
    if (filtroCliente === 'todos') return;
    
    const clienteInfo = getClienteInfo(filtroCliente);
    
    // Usar as vendas já filtradas que respeitam o filtroStatus
    // vendasFiltradas already contains sales for the selected client name
    const vendasDoCliente = vendasFiltradas; 
    
    if (vendasDoCliente.length === 0) {
      alert('Nenhuma venda encontrada para este cliente no status selecionado.');
      return;
    }

    const printWindow = window.open('', '_blank');
    
    // Calcular totais baseado no filtro de status atual
    let totalGeral = 0;
    let totalPendente = 0;
    let totalPago = 0;
    
    vendasDoCliente.forEach(venda => {
      totalGeral += (venda.total || 0);
      if (venda.status_pagamento === 'pendente') {
        totalPendente += (venda.total || 0);
      } else {
        totalPago += (venda.total || 0);
      }
    });
    
    const statusTexto = filtroStatus === 'pendentes' ? 'PENDENTES' : 
                      filtroStatus === 'pagas' ? 'PAGAS' :
                      filtroStatus === 'vencidas' ? 'VENCIDAS' : 'TODAS';

    // Função para truncar texto
    const truncateText = (text, maxLength = 50) => {
      if (!text) return '';
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Vendas a Prazo - ${clienteInfo.nome}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-name { font-size: 16px; font-weight: bold; }
          .company-info { font-size: 11px; margin: 3px 0; }
          .report-title { font-size: 14px; font-weight: bold; margin: 15px 0; }
          .client-info { font-size: 12px; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background-color: #f2f2f2; font-weight: bold; font-size: 13px; }
          td { font-size: 12px; }
          .currency { text-align: right; }
          .date-col { width: 15%; }
          .items-col { width: 65%; }
          .value-col { width: 20%; text-align: right; }
          .summary { border: 2px solid #333; padding: 15px; margin: 15px 0; font-size: 13px; }
          .summary-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
          .footer { text-align: center; margin-top: 25px; font-size: 10px; }
          .item-line { margin: 1px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">PÃO D'QUEIJO & CIA</div>
          <div class="company-info">Rua Inajá, 18, Jd Mirante - Várzea Paulista - SP</div>
          <div class="company-info">CNPJ: 34.669.787/0001-09</div>
          <div class="report-title">RELATÓRIO DE VENDAS A PRAZO - ${statusTexto}</div>
          <div class="client-info">Cliente: ${clienteInfo.nome}</div>
          <div class="client-info">Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="date-col">Data</th>
              <th class="items-col">Itens</th>
              <th class="value-col">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${vendasDoCliente.map(venda => {
              const itensFormatados = (venda.itens && venda.itens.length > 0) ?
                venda.itens.map(item => {
                  const descricaoTruncada = truncateText(item.descricao, 50);
                  return `${item.quantidade}x ${descricaoTruncada}`;
                }).join('<br>') : 'N/A';
              
              return `
                <tr>
                  <td class="date-col">${formatDate(venda.created_date)}</td>
                  <td class="items-col">${itensFormatados}</td>
                  <td class="value-col currency">${formatCurrency(venda.total)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-title">RESUMO FINANCEIRO</div>
          <div>Total Geral das Vendas: ${formatCurrency(totalGeral)}</div>
          ${filtroStatus !== 'pagas' ? `<div>Total Pendente: ${formatCurrency(totalPendente)}</div>` : ''}
          ${filtroStatus !== 'pendentes' && filtroStatus !== 'vencidas' ? `<div>Total Pago: ${formatCurrency(totalPago)}</div>` : ''}
        </div>
        
        <div class="footer">
          <div>Relatório gerado automaticamente pelo sistema PDV</div>
          <div>Data/Hora: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Clock className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl sm:text-3xl font-bold">Vendas a Prazo</h1>
          </div>
          <Link to={createPageUrl('PDV')}>
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao PDV
            </Button>
          </Link>
        </header>

        <Card className="mb-6 bg-white dark:bg-gray-800 shadow-md">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="sm:col-span-2 md:col-span-1">
                <label className="block text-sm font-medium mb-1">Buscar Venda ou Cliente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Número da venda, nome do cliente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por Cliente</label>
                <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Clientes</SelectItem>
                    {clientesComPendencias.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {formatCurrency(cliente.totalPendente)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Filtrar por Status</label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="pendentes">Pendentes</SelectItem>
                    <SelectItem value="vencidas">Vencidas</SelectItem>
                    <SelectItem value="pagas">Pagas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {filtroCliente !== 'todos' && (
          <Card className="mb-6 bg-white dark:bg-gray-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span>{getClienteInfo(filtroCliente).nome}</span>
                </CardTitle>
                <p className="text-gray-500 dark:text-gray-400">
                  Total Pendente: <span className="font-bold text-red-500">{formatCurrency(totalPendenteClienteSelecionado)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={imprimirRelatorio}>
                  <FileText className="w-4 h-4 mr-2"/>
                  Relatório
                </Button>
                <Button 
                  onClick={() => setClienteParaFecharConta(filtroCliente)} 
                  disabled={totalPendenteClienteSelecionado === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Calculator className="w-4 h-4 mr-2"/>
                  Fechar Conta
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <TableHeader>
              <TableRow>
                {/* Removed "Número Venda" and "Telefone" columns */}
                <TableHead>Cliente</TableHead>
                <TableHead>Data Venda</TableHead>
                <TableHead>Data Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-12">Carregando vendas a prazo...</TableCell>
                </TableRow>
              ) : vendasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-12 text-gray-500">
                    Nenhuma venda a prazo encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                vendasFiltradas.map((venda) => {
                  const clienteInfo = getClienteInfo(venda.cliente_id || venda.cliente_nome); // Use the more robust lookup
                  const diasAtraso = calcularDiasAtraso(venda.data_pagamento);
                  const isVencida = venda.status_pagamento === 'pendente' && diasAtraso > 0;
                  
                  return (
                    <TableRow key={venda.id} className={isVencida ? 'bg-red-50 dark:bg-red-950' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                      {/* Removed TableCell for venda.numero_venda */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {venda.cliente_nome || clienteInfo.nome}
                        </div>
                      </TableCell>
                      {/* Removed TableCell for clienteInfo.telefone */}
                      <TableCell>{formatDate(venda.created_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDate(venda.data_pagamento)}</span>
                          {isVencida && (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              {diasAtraso} dias em atraso
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(venda.total)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            venda.status_pagamento === 'pago' 
                              ? 'success' 
                              : isVencida 
                                ? 'destructive' 
                                : 'secondary'
                          }
                          className={
                            venda.status_pagamento === 'pago'
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : isVencida
                                ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                          }
                        >
                          {venda.status_pagamento === 'pago' 
                            ? 'Pago' 
                            : isVencida 
                              ? 'Vencida' 
                              : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                           <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditarVenda(venda)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Editar Venda"
                          >
                              <Pencil className="w-4 h-4" />
                          </Button>
                          {venda.status_pagamento === 'pendente' && (
                            <Button
                              size="sm"
                              onClick={() => setVendaParaMarcarPaga(venda)}
                              className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Marcar Pago
                            </Button>
                          )}
                          <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleExcluirVenda(venda)}
                              className="text-red-500 hover:text-red-700"
                              title="Excluir Venda"
                          >
                              <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de confirmação de pagamento */}
      <AlertDialog open={!!vendaParaMarcarPaga} onOpenChange={() => setVendaParaMarcarPaga(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar a venda {vendaParaMarcarPaga?.numero_venda} como paga?
              <br />
              Valor: {formatCurrency(vendaParaMarcarPaga?.total)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={marcarComoPaga}
              className="bg-green-600 hover:bg-green-700"
            >
              Sim, Marcar como Pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de fechamento de conta */}
      <AlertDialog open={!!clienteParaFecharConta} onOpenChange={() => setClienteParaFecharConta(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Conta do Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja fechar a conta de <strong>{getClienteInfo(clienteParaFecharConta)?.nome}</strong>?
              <br /><br />
              Isso marcará <strong>TODAS</strong> as vendas pendentes como pagas.
              <br />
              Valor total: <strong>{formatCurrency(totalPendenteClienteSelecionado)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={fecharContaCliente}
              className="bg-green-600 hover:bg-green-700"
            >
              Sim, Fechar Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de senha de gerência (removed as per instructions) */}
      {/*
      {showSenhaModal && (
        <ModalSenhaGerencia 
          onConfirm={handleSenhaConfirmada} 
          onCancel={handleSenhaCancelada}
          acao="realizar esta operação"
        />
      )}
      */}

      {/* Dialog de confirmação de exclusão de venda */}
      <AlertDialog open={!!vendaParaExcluir} onOpenChange={() => setVendaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente a venda <strong>{vendaParaExcluir?.numero_venda}</strong>? 
              <br/>
              Esta ação não pode ser desfeita e os itens retornarão ao estoque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarExclusaoVenda}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir Venda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Edição de Venda */}
      {vendaParaEditar && (
        <ModalEditarVenda 
            venda={vendaParaEditar}
            onSave={handleSalvarEdicaoVenda}
            onCancel={() => setVendaParaEditar(null)}
        />
      )}
    </div>
  );
}
