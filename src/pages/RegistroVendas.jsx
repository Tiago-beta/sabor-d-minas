
import React, { useState, useEffect } from "react";
import { Venda, Produto } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Calendar, ArrowLeft, Search, RefreshCw, Edit, Trash2, Shield, Eye, Printer, PlusCircle } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

// Helper functions for formatting
const formatarData = (data) => {
  if (!data) return '-';
  const dateObj = new Date(data);
  if (isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatarHora = (data) => {
  if (!data) return '-';
  const dateObj = new Date(data);
  if (isNaN(dateObj.getTime())) return '-';
  
  // CORREÇÃO: Subtrair 3 horas para ajustar o fuso horário
  const dataCorrigida = new Date(dateObj.getTime() - (3 * 60 * 60 * 1000));
  
  return dataCorrigida.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatarMoeda = (valor) => `R$${(Number(valor) || 0).toFixed(2).replace('.', ',')}`;

// Helper function for payment method badge variant with better colors
const getPaymentBadgeVariant = (metodo) => {
  switch (metodo) {
    case 'dinheiro': return 'default'; // Dark background with white text
    case 'cartao': return 'secondary'; // Light gray background
    case 'pix': return 'outline'; // Bordered, no fill
    case 'aprazo': return 'destructive'; // Red/Orange for pending/on credit
    case 'interno': return 'outline'; // Bordered, for internal use
    case 'ifood': return 'destructive'; // Red for iFood
    case 'consignado': return 'secondary'; // Light gray for consignment
    default: return 'outline';
  }
};

// Helper function for payment method label with better styling
const formatPaymentMethod = (metodo) => {
  const metodos = {
    'dinheiro': 'Dinheiro',
    'cartao': 'Cartão',
    'pix': 'Pix',
    'aprazo': 'A Prazo',
    'interno': 'Interno',
    'ifood': 'iFood',
    'consignado': 'Consignação'
  };
  return metodos[metodo] || metodo || 'N/D';
};

// Modal para verificar senha de gerência
function ModalSenhaGerencia({ onConfirm, onCancel, acao }) {
  const [senha, setSenha] = useState("");

  const handleConfirm = () => {
    if (senha === "2546") { // Hardcoded password as per outline
      onConfirm();
    } else {
      alert("Senha incorreta!");
      setSenha("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-600" />
            Autorização de Gerência
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Para {acao}, digite a senha de gerência:
          </p>
          <Input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite a senha..."
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="bg-orange-600 hover:bg-orange-700">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal para editar item (functionality preserved but not triggered from the main table now)
function ModalEditarItem({ item, onSave, onCancel }) {
  const [quantidade, setQuantidade] = useState(item.quantidade?.toString() || "1");
  const [precoUnitario, setPrecoUnitario] = useState(item.preco_unitario?.toString() || "0");

  const handleSave = () => {
    const novaQuantidade = parseFloat(quantidade) || 1;
    const novoPreco = parseFloat(precoUnitario) || 0;

    if (novaQuantidade <= 0) {
      alert("Quantidade deve ser maior que 0!");
      return;
    }
    if (novoPreco < 0) {
      alert("Preço unitário não pode ser negativo!");
      return;
    }

    onSave({
      ...item,
      quantidade: novaQuantidade,
      preco_unitario: novoPreco,
      subtotal: novaQuantidade * novoPreco
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Produto</label>
            <Input value={item.descricao} readOnly className="bg-gray-100" />
          </div>
          <div>
            <label className="text-sm font-medium">Código</label>
            <Input value={item.codigo} readOnly className="bg-gray-100" />
          </div>
          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <Input
              type="number"
              step="0.001"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Preço Unitário</label>
            <Input
              type="number"
              step="0.01"
              value={precoUnitario}
              onChange={(e) => setPrecoUnitario(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Subtotal</label>
            <Input
              value={formatarMoeda(((parseFloat(quantidade) || 0) * (parseFloat(precoUnitario) || 0)))}
              readOnly
              className="bg-gray-100"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RegistroVendas() {
  const [vendas, setVendas] = useState([]);
  const [produtos, setProdutos] = useState([]); // New state for products
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemEditando, setItemEditando] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState(null);

  // New state for viewing sale details
  const [vendaSelecionada, setVendaSelecionada] = useState(null);

  useEffect(() => {
    carregarDados(); // Call carregarDados
  }, [dataFiltro]);

  const carregarDados = async () => { // Renamed from carregarVendas
    try {
      setLoading(true);
      console.log('Carregando dados...'); // Updated log

      const [vendasList, produtosList] = await Promise.all([ // Fetch both vendas and produtos
        Venda.list("-created_date", 1000),
        Produto.list()
      ]);
      console.log('Vendas carregadas:', vendasList.length);
      console.log('Produtos carregados:', produtosList.length);

      setVendas(vendasList || []);
      setProdutos(produtosList || []); // Set products state
    } catch (error) {
      console.error('Erro ao carregar dados:', error); // Updated log
      setVendas([]);
      setProdutos([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  };

  // Filtrar vendas por data e busca
  const vendasFiltradas = vendas.filter(venda => {
    try {
      if (!venda.created_date) return false;

      // Convert sale date to YYYY-MM-DD in São Paulo timezone for comparison
      const dataVendaSP = new Date(venda.created_date).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      // Compare with the filter date
      const matchData = dataVendaSP === dataFiltro;

      const matchBusca = busca === "" ||
        (venda.numero_venda || '').toLowerCase().includes(busca.toLowerCase()) ||
        (venda.cliente_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (venda.operador_nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (venda.itens || []).some(item =>
          (item.codigo || '').toLowerCase().includes(busca.toLowerCase()) ||
          (item.descricao || '').toLowerCase().includes(busca.toLowerCase())
        );

      return matchData && matchBusca;
    } catch (error) {
      console.error('Erro ao filtrar venda:', error, venda);
      return false;
    }
  });

  // These item-level functions are preserved but not directly linked to the main table display now
  const handleEditarItem = (item) => {
    setAcaoPendente(() => () => {
      setItemEditando(item);
      setShowEditModal(true);
    });
    setShowSenhaModal(true);
  };

  const handleExcluirItem = (item) => {
    setAcaoPendente(() => () => {
      setItemParaExcluir({ item, venda: item.venda });
      setShowConfirmDelete(true);
    });
    setShowSenhaModal(true);
  };

  const handleSenhaConfirmada = () => {
    setShowSenhaModal(false);
    if (acaoPendente) {
      acaoPendente();
      setAcaoPendente(null);
    }
  };

  const handleSenhaCancelada = () => {
    setShowSenhaModal(false);
    setAcaoPendente(null);
  };

  const handleSalvarEdicao = async (itemEditado) => {
    try {
      const vendaOriginal = itemEditando.venda;

      const novosItens = vendaOriginal.itens.map(item =>
        (item.codigo === itemEditado.codigo && item.descricao === itemEditado.descricao && item.subtotal === itemEditando.subtotal)
          ? { ...itemEditado, subtotal: itemEditado.quantidade * itemEditado.preco_unitario }
          : item
      );

      const novoTotal = novosItens.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);

      await Venda.update(vendaOriginal.id, {
        itens: novosItens,
        total: novoTotal
      });

      carregarDados(); // Call carregarDados
      setShowEditModal(false);
      setItemEditando(null);
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar alterações!');
    }
  };

  const handleExcluirVenda = (venda) => {
    setAcaoPendente(() => async () => {
      try {
        setLoading(true);

        // Retorna os itens da venda ao estoque (com lógica para kits)
        if (venda.itens && venda.itens.length > 0) {
          const updates = [];
          for (const itemVendido of venda.itens) {
            const produtoVendidoFromState = produtos.find(p => p.id === itemVendido.item_id);

            if (produtoVendidoFromState) {
              if (produtoVendidoFromState.tipo_produto === 'kit' && produtoVendidoFromState.componentes_kit && produtoVendidoFromState.componentes_kit.length > 0) {
                // É um kit, devolve os componentes ao estoque
                for (const componente of produtoVendidoFromState.componentes_kit) {
                  const produtoComponente = produtos.find(p => p.id === componente.produto_id);
                  if (produtoComponente) {
                    const estoqueAtual = Number(produtoComponente.estoque) || 0;
                    const quantidadeDevolvida = (Number(itemVendido.quantidade) || 0) * (Number(componente.quantidade_utilizada) || 0);
                    updates.push(
                      Produto.update(produtoComponente.id, { estoque: estoqueAtual + quantidadeDevolvida })
                    );
                  }
                }
              } else {
                // É um produto individual
                const estoqueAtual = Number(produtoVendidoFromState.estoque) || 0;
                const quantidadeVendida = Number(itemVendido.quantidade) || 0;
                updates.push(
                  Produto.update(produtoVendidoFromState.id, { estoque: estoqueAtual + quantidadeVendida })
                );
              }
            }
          }
          if (updates.length > 0) {
            await Promise.all(updates);
          }
        }
        
        // Exclui a venda
        await Venda.delete(venda.id);

        // Exclui a despesa associada, se houver
        if (venda.custo_entrega_externa > 0) {
            const { Despesa } = await import('@/api/entities'); // Dynamic import as specified
            const nomeDespesa = (venda.tipo_entrega_externa === 'ifood' 
                ? `iFood Frete - Venda ${venda.numero_venda}`
                : `Motoboy Agregado - Venda ${venda.numero_venda}`);
            
            const despesas = await Despesa.filter({ nome: nomeDespesa });
            if (despesas.length > 0) {
                await Despesa.delete(despesas[0].id);
            }
        }

        alert(`Venda ${venda.numero_venda} excluída com sucesso!`);
        carregarDados();
      } catch (err) {
        console.error('Erro ao excluir venda:', err);
        alert('Falha ao excluir a venda. Tente novamente.');
      } finally {
        setLoading(false);
      }
    });
    setShowSenhaModal(true);
  };


  const handleConfirmarExclusao = async () => {
    try {
      const { item, venda } = itemParaExcluir;

      const novosItens = venda.itens.filter(i =>
        !(i.codigo === item.codigo && i.descricao === item.descricao && i.subtotal === item.subtotal)
      );

      if (novosItens.length === 0) {
        await Venda.delete(venda.id);
        console.log(`Venda ${venda.numero_venda} excluída pois todos os itens foram removidos.`);
      } else {
        const novoTotal = novosItens.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0);
        await Venda.update(venda.id, {
          itens: novosItens,
          total: novoTotal
        });
        console.log(`Item "${item.descricao}" removido da venda ${venda.numero_venda}. Venda atualizada.`);
      }

      carregarDados(); // Call carregarDados
      setShowConfirmDelete(false);
      setItemParaExcluir(null);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Erro ao excluir item!');
    }
  };

  const imprimirCupom = (venda) => {
    if (!venda || !venda.itens || venda.itens.length === 0) {
        alert("Nenhum item na venda para imprimir.");
        return;
    }

    const infoEmpresaHTML = `
        <div style="text-align: center; font-family: monospace; font-size: 12px; max-width: 300px; margin: auto;">
            <p style="font-weight: bold; margin: 2px 0;">PÃO D'QUEIJO & CIA</p>
            <p style="margin: 2px 0;">Rua Inajá, 18, Jd Mirante - Várzea Paulista - SP</p>
            <p style="margin: 2px 0;">CNPJ: 34.669.787/0001-09</p>
            <p style="margin: 2px 0;">Data: ${new Date(venda.created_date).toLocaleString('pt-BR')}</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
            <p style="font-weight: bold; margin: 2px 0;">CUPOM NÃO FISCAL</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
        </div>
    `;

    const deliveryInfoHTML = venda.tipo_venda === 'delivery' ? `
        <div style="text-align: center; font-family: monospace; font-size: 12px; max-width: 300px; margin: auto;">
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
            <p style="font-weight: bold; margin: 2px 0;">PEDIDO PARA ENTREGA</p>
            <p style="margin: 2px 0;">Cliente: ${venda.cliente_nome || 'Não Informado'}</p>
            <p style="margin: 2px 0;">Telefone: ${venda.cliente_telefone || 'Não Informado'}</p>
            <p style="margin: 2px 0;">Endereço: ${venda.endereco_entrega || 'Não Informado'}</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
        </div>
    ` : '';

    const itensHTML = venda.itens.map(item => `
        <tr style="font-family: monospace; font-size: 12px;">
            <td style="text-align: left; padding: 2px 0;">${item.descricao}</td>
            <td style="text-align: center; padding: 2px;">${item.quantidade}</td>
            <td style="text-align: right; padding: 2px;">${(item.preco_unitario || 0).toFixed(2)}</td>
            <td style="text-align: right; padding: 2px;">${(item.subtotal || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    const totalHTML = `
        <div style="font-family: monospace; font-size: 12px; text-align: right; margin-top: 10px; max-width: 300px; margin: 10px auto 0 auto;">
            <hr style="border: none; border-top: 1px dashed #000; margin: 5px 0;">
            ${(venda.desconto || 0) > 0 ? `<p style="margin: 2px 0;">Desconto: R$ ${venda.desconto.toFixed(2)}</p>` : ''}
            ${venda.tipo_venda === 'delivery' && (venda.taxa_entrega || 0) > 0 ? `<p style="margin: 2px 0;">Taxa de Entrega: R$ ${venda.taxa_entrega.toFixed(2)}</p>` : ''}
            <p style="font-weight: bold; font-size: 14px; margin: 5px 0;">TOTAL: R$ ${(venda.total || 0).toFixed(2)}</p>
        </div>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head><title>Cupom Venda ${venda.numero_venda}</title></head>
            <body>
                ${infoEmpresaHTML}
                ${deliveryInfoHTML}
                <table style="width: 100%; max-width: 300px; margin: auto; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="text-align: left; font-size: 12px; padding: 2px 0;">Desc</th>
                            <th style="text-align: center; font-size: 12px; padding: 2px;">Qtd</th>
                            <th style="text-align: right; font-size: 12px; padding: 2px;">V.Unit</th>
                            <th style="text-align: right; padding: 2px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHTML}
                    </tbody>
                </table>
                ${totalHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="ml-2">Carregando vendas...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Registro de Vendas
          </h1>
          <div className="flex gap-2">
            <Button onClick={carregarDados} variant="outline"> {/* Changed to carregarDados */}
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            {/* Removed the "Novo Pedido" button as per the outline */}
            <Link to={createPageUrl("PDV")}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao PDV</Button>
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, cliente, operador, ou produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabela de Vendas */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100 dark:bg-gray-600">
                  <TableHead className="font-bold">Data</TableHead>
                  <TableHead className="font-bold">Hora</TableHead>
                  <TableHead className="font-bold">Tipo</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Operador</TableHead>
                  <TableHead className="font-bold">Itens</TableHead>
                  <TableHead className="font-bold text-center">Pagamento</TableHead>
                  <TableHead className="font-bold text-right">Total</TableHead>
                  <TableHead className="font-bold text-right">Custo Entrega</TableHead>
                  <TableHead className="font-bold text-center">Diferença</TableHead>
                  <TableHead className="font-bold text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.map((venda) => {
                  // Calcular preço original baseado no tipo de venda e produtos atuais
                  const originalSubtotal = (venda.itens || []).reduce((acc, item) => {
                      // Buscar o produto atual no banco para pegar o preço correto
                      const produto = produtos.find(p => p.id === item.item_id); // Changed 'products' to 'produtos'
                      if (!produto) {
                        // Se não encontrou o produto, usar o preço registrado na venda
                        return acc + (item.quantidade * (Number(item.preco_unitario) || 0));
                      }
                      
                      // Determinar o preço que deveria ser usado baseado no tipo de venda
                      let precoOriginal;
                      if (venda.tipo_venda === 'atacado' && produto.preco_atacado != null) {
                        precoOriginal = produto.preco_atacado;
                      } else {
                        precoOriginal = produto.preco_varejo;
                      }
                      
                      return acc + (item.quantidade * (Number(precoOriginal) || 0));
                    }, 0);

                  // Calcular subtotal real registrado na venda
                  const actualSubtotal = (venda.itens || []).reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
                  
                  // Considerar desconto aplicado
                  const desconto = Number(venda.desconto) || 0;
                  
                  // A diferença é: (Preço Original - Preço Cobrado + Desconto)
                  // Se positiva = desconto foi dado, se negativa = cobraram mais caro
                  const diferenca = originalSubtotal - actualSubtotal + desconto;
                  
                  // Só mostrar diferença se for significativa (maior que 0.01)
                  const temDiferenca = Math.abs(diferenca) > 0.01;
                  
                  return (
                  <TableRow key={venda.id} className="hover:bg-white hover:text-black">
                    <TableCell className="font-medium">{formatarData(venda.created_date)}</TableCell>
                    <TableCell>{formatarHora(venda.created_date)}</TableCell>
                    <TableCell className="font-medium">
                          <span className={`px-2 py-1 rounded text-xs font-medium force-dark-text ${
                            venda.tipo_venda === 'atacado' ? 'bg-green-300' : 
                            venda.tipo_venda === 'delivery' ? 'bg-blue-300' : 
                            'bg-purple-300'
                          }`}>
                            {venda.tipo_venda === 'atacado' ? 'Atacado' : 
                             venda.tipo_venda === 'delivery' ? 'Delivery' : 
                             'Varejo'}
                          </span>
                        </TableCell>
                    <TableCell>{venda.cliente_nome || 'Cliente não informado'}</TableCell>
                    <TableCell>{venda.operador_nome || 'N/D'}</TableCell>
                    <TableCell>{venda.itens?.length || 0} item(s)</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        className={`px-2 py-1 text-xs font-medium ${
                          venda.metodo_pagamento === 'dinheiro' ? 'bg-green-100 text-black dark:bg-green-600 dark:text-black' :
                          venda.metodo_pagamento === 'cartao' ? 'bg-blue-100 text-black dark:bg-blue-600 dark:text-black' :
                          venda.metodo_pagamento === 'pix' ? 'bg-purple-100 text-black dark:bg-purple-600 dark:text-black' :
                          venda.metodo_pagamento === 'aprazo' ? 'bg-orange-100 text-black dark:bg-orange-600 dark:text-black' :
                          venda.metodo_pagamento === 'interno' ? 'bg-gray-100 text-black dark:bg-gray-600 dark:text-black' :
                          venda.metodo_pagamento === 'ifood' ? 'bg-red-100 text-black dark:bg-red-600 dark:text-black' :
                          venda.metodo_pagamento === 'consignado' ? 'bg-teal-100 text-black dark:bg-teal-600 dark:text-black' :
                          'bg-gray-100 text-black dark:bg-gray-600 dark:text-black'
                        }`}
                      >
                        {venda.metodo_pagamento === 'aprazo' ? 'A Prazo' : 
                         venda.metodo_pagamento === 'ifood' ? 'iFood' :
                         venda.metodo_pagamento?.charAt(0).toUpperCase() + venda.metodo_pagamento?.slice(1) || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-right">{formatarMoeda(venda.total)}</TableCell>
                    <TableCell className="text-right">
                      {venda.custo_entrega_externa ? (
                        <div className="text-sm">
                          <Badge
                            className={
                              venda.tipo_entrega_externa === 'ifood' 
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }
                          >
                            {venda.tipo_entrega_externa === 'ifood' ? 'iFood' : 'Agregado'}
                          </Badge>
                          <div className="font-semibold text-red-600">{formatarMoeda(venda.custo_entrega_externa)}</div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {temDiferenca ? (
                        <span className={diferenca > 0 ? "text-red-500" : "text-green-500"}>
                          {diferenca > 0 ? '-' : ''}{formatarMoeda(Math.abs(diferenca))}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVendaSelecionada(venda)}
                          title="Ver detalhes da venda"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => imprimirCupom(venda)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Imprimir cupom"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirVenda(venda)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir venda"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )})}
                {vendasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8  text-gray-500"> {/* Updated colSpan */}
                      {loading ? 'Carregando vendas...' : 'Nenhuma venda encontrada para esta data ou busca.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modais (These are kept for existing functionality, even if not triggered from this main table view anymore) */}
        {showSenhaModal && (
          <ModalSenhaGerencia
            onConfirm={handleSenhaConfirmada}
            onCancel={handleSenhaCancelada}
            acao={itemEditando ? "editar este item" : "excluir esta venda"}
          />
        )}

        {showEditModal && itemEditando && (
          <ModalEditarItem
            item={itemEditando}
            onSave={handleSalvarEdicao}
            onCancel={() => {
              setShowEditModal(false);
              setItemEditando(null);
            }}
          />
        )}

        {showConfirmDelete && itemParaExcluir && (
          <AlertDialog open={true} onOpenChange={() => setShowConfirmDelete(false)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o item "{itemParaExcluir.item.descricao}" da venda {itemParaExcluir.venda.numero_venda}?
                  Esta ação não pode ser desfeita e irá ajustar o total da venda ou excluí-la se for o último item.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowConfirmDelete(false)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmarExclusao}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Excluir Item
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Modal for displaying sale details */}
        {vendaSelecionada && (
          <Dialog open={true} onOpenChange={() => setVendaSelecionada(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Detalhes da Venda #{vendaSelecionada.numero_venda}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-4 text-sm">
                <p><strong>Data:</strong> {formatarData(vendaSelecionada.created_date)} às {formatarHora(vendaSelecionada.created_date)}</p>
                <p><strong>Cliente:</strong> {vendaSelecionada.cliente_nome || 'Não informado'}</p>
                <p><strong>Operador:</strong> {vendaSelecionada.operador_nome || 'Não informado'}</p>
                <p><strong>Total da Venda:</strong> <span className="font-bold text-lg">{formatarMoeda(vendaSelecionada.total)}</span></p>
                <p><strong>Método de Pagamento:</strong> {formatPaymentMethod(vendaSelecionada.metodo_pagamento)} {vendaSelecionada.status_pagamento === 'pendente' && '(Pendente)'}</p>
                {vendaSelecionada.custo_entrega_externa && (
                  <p>
                    <strong>Custo de Entrega:</strong> <span className="font-bold text-red-600">{formatarMoeda(vendaSelecionada.custo_entrega_externa)}</span> ({vendaSelecionada.tipo_entrega_externa === 'ifood' ? 'iFood' : 'Agregado'})
                  </p>
                )}
                <h3 className="font-semibold mt-4">Itens da Venda:</h3>
                <ul className="list-disc pl-5 max-h-40 overflow-y-auto border p-2 rounded">
                  {vendaSelecionada.itens && vendaSelecionada.itens.length > 0 ? (
                    vendaSelecionada.itens.map((item, idx) => (
                      <li key={idx} className="mb-1">
                        {item.quantidade}x {item.descricao} ({formatarMoeda(item.preco_unitario)} cada) = <span className="font-semibold">{formatarMoeda(item.subtotal)}</span>
                      </li>
                    ))
                  ) : (
                    <li>Nenhum item registrado.</li>
                  )}
                </ul>
              </div>
              <DialogFooter>
                <Button onClick={() => setVendaSelecionada(null)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
