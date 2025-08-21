
import React, { useState, useEffect } from "react";
import { VendedorExterno, CadastroVendedor, Venda, ValeVendedor } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ArrowLeft, Plus, Save, Trash2, Pencil } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function VendedorExternoPage() {
  // Renamed: registros -> vendedoresExternosRaw (all records, unfiltered)
  const [vendedoresExternosRaw, setVendedoresExternosRaw] = useState([]);
  // Renamed: vendedores -> vendedoresCadastrados (list of registered sellers)
  const [vendedoresCadastrados, setVendedoresCadastrados] = useState([]);
  const [editandoRegistro, setEditandoRegistro] = useState(null);
  const [novoRegistro, setNovoRegistro] = useState({
    nome: "",
    data: new Date().toISOString().split('T')[0],
    dinheiro: "",
    cartao: "",
    pix: "",
    retirada: "",
  });
  const [loading, setLoading] = useState(true);
  // Renamed: vendas -> vendasAll (all sales, unfiltered)
  const [vendasAll, setVendasAll] = useState([]);
  // Renamed: valesVendedor -> valesMesAtual (filtered for current month/year display)
  const [valesMesAtual, setValesMesAtual] = useState([]);
  // New: valesAll (all vales, unfiltered for background calculation)
  const [valesAll, setValesAll] = useState([]);

  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  const [novoVale, setNovoVale] = useState({
    tipo: 'VALE',
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0]
  });

  // Helper function to format currency
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0); // Ensure 0 for null/undefined
  };

  // Helper function for delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função para carregar todos os dados necessários (otimizada para evitar rate limit)
  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar dados em sequência com delays para evitar sobrecarga
      const vendedoresExternosData = await VendedorExterno.list('-data');
      await delay(200); // 200ms delay
      
      const vendedoresCadastradosData = await CadastroVendedor.list();
      await delay(200);
      
      const vendasData = await Venda.list('-created_date');
      await delay(200);
      
      const valesData = await ValeVendedor.list();

      setVendedoresExternosRaw(vendedoresExternosData);
      setVendedoresCadastrados(vendedoresCadastradosData.filter(v => v.ativo !== false));
      setVendasAll(vendasData);
      setValesAll(valesData);

      // Reset vendedorSelecionado e valesMesAtual quando month/year muda ou dados são atualizados
      setVendedorSelecionado('');
      setValesMesAtual([]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      if (error.message && error.message.includes('429')) {
        alert('Muitas requisições simultâneas. Por favor, aguarde alguns segundos e tente novamente.');
      } else {
        alert('Não foi possível carregar os dados necessários. Tente recarregar a página.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [mesAtual, anoAtual]);

  // Função para calcular automaticamente o valor dos produtos vendidos em consignação
  const calcularValorProdutosConsignacao = (vendedorNome, data) => {
    if (!vendasAll || vendasAll.length === 0) return 0;
    
    return vendasAll
      .filter(venda => {
        if (!venda.vendedor_consignacao || venda.metodo_pagamento !== 'consignado' || venda.status !== 'finalizada') return false; 
        
        const dataVenda = new Date(venda.created_date);
        const dataFiltro = new Date(data + 'T00:00:00'); 
        
        return venda.vendedor_consignacao === vendedorNome &&
               dataVenda.toDateString() === dataFiltro.toDateString();
      })
      .reduce((total, venda) => total + (venda.total || 0), 0);
  };

  // Função para recalcular automaticamente os valores com base nas vendas (otimizada)
  const recalcularValores = async () => {
    if (vendedoresExternosRaw.length === 0 || vendasAll.length === 0) return;

    let needsUpdate = false;
    const updatedRecords = [];

    for (const vendedor of vendedoresExternosRaw) {
      const valorProdutos = calcularValorProdutosConsignacao(vendedor.nome, vendedor.data);
      
      // CORRIGIDO: Total Recebido = Dinheiro + Cartão + PIX + Retirada
      const totalRecebido = (vendedor.dinheiro || 0) + (vendedor.cartao || 0) + (vendedor.pix || 0) + (vendedor.retirada || 0);
      
      // CORRIGIDO: Lucro = Total Recebido - Valor dos Produtos
      const novoLucro = totalRecebido - valorProdutos; 

      // Check if custo_produtos, total_recebido or lucro actually changed
      // Use Math.abs and a small tolerance for floating-point comparisons
      if (Math.abs((vendedor.custo_produtos || 0) - valorProdutos) > 0.01 || 
          Math.abs((vendedor.total_recebido || 0) - totalRecebido) > 0.01 ||
          Math.abs((vendedor.lucro || 0) - novoLucro) > 0.01) {
        updatedRecords.push({
          id: vendedor.id,
          total_recebido: totalRecebido,
          custo_produtos: valorProdutos,
          lucro: novoLucro,
        });
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      try {
        // Atualizar registros com delay entre cada atualização
        for (let i = 0; i < updatedRecords.length; i++) {
          const recordToUpdate = updatedRecords[i];
          await VendedorExterno.update(recordToUpdate.id, {
            total_recebido: recordToUpdate.total_recebido,
            custo_produtos: recordToUpdate.custo_produtos,
            lucro: recordToUpdate.lucro
          });
          
          // Delay entre atualizações para evitar rate limit
          if (i < updatedRecords.length - 1) {
            await delay(150);
          }
        }
        
        console.log("Valores atualizados no banco de dados.");
        
        // Aguardar um pouco antes de recarregar para evitar conflitos
        setTimeout(() => {
          carregarDados();
          if (vendedorSelecionado) {
            carregarValesVendedor(vendedorSelecionado);
          }
        }, 500);
        
      } catch (error) {
        console.error('Erro ao atualizar vendedor(es) durante recálculo:', error);
        if (error.message && error.message.includes('429')) {
          alert('Muitas atualizações simultâneas. Os dados serão sincronizados automaticamente em alguns segundos.');
          // Tentar novamente após um delay maior
          setTimeout(recalcularValores, 3000);
        } else {
          alert('Ocorreu um erro de comunicação ao recalcular os valores dos vendedores. Tente atualizar a página.');
        }
      }
    }
  };

  // Executar recálculo quando os dados brutos de vendas ou vendedores externos forem carregados/alterados
  useEffect(() => {
    // Only trigger recalcularValores if data is available and not empty, and loading is false
    if (!loading && (vendedoresExternosRaw.length > 0 || vendasAll.length > 0)) { 
      recalcularValores();
    }
  }, [vendasAll, vendedoresExternosRaw, loading]); 

  // Filter records for display based on current month/year
  const vendedoresExternosDisplay = vendedoresExternosRaw.filter(registro => {
    const dataRegistro = new Date(registro.data + 'T00:00:00');
    return dataRegistro.getMonth() + 1 === mesAtual && 
           dataRegistro.getFullYear() === anoAtual;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNovoRegistro(prev => ({ ...prev, [name]: value }));
  };

  const handleVendedorChange = (nomeVendedor) => {
    setNovoRegistro(prev => ({ ...prev, nome: nomeVendedor }));
  };

  const salvarRegistro = async () => {
    if (!novoRegistro.nome) {
      alert("Selecione um vendedor!");
      return;
    }
    if (!novoRegistro.data) {
      alert("A data é obrigatória!");
      return;
    }

    const dinheiro = parseFloat(novoRegistro.dinheiro) || 0;
    const cartao = parseFloat(novoRegistro.cartao) || 0;
    const pix = parseFloat(novoRegistro.pix) || 0;
    const retirada = parseFloat(novoRegistro.retirada) || 0;

    // CORRIGIDO: Total Recebido = Dinheiro + Cartão + PIX + Retirada
    const total_recebido = dinheiro + cartao + pix + retirada;
    const custo_produtos = calcularValorProdutosConsignacao(novoRegistro.nome, novoRegistro.data);
    
    // CORRIGIDO: Lucro = Total Recebido - Valor dos Produtos
    const lucro = total_recebido - custo_produtos; 

    const dadosParaSalvar = {
      ...novoRegistro,
      dinheiro,
      cartao,
      pix,
      retirada,
      total_recebido,
      custo_produtos,
      lucro,
    };

    try {
      if (editandoRegistro) {
        await VendedorExterno.update(editandoRegistro.id, dadosParaSalvar);
      } else {
        await VendedorExterno.create(dadosParaSalvar);
      }
      
      limparFormulario();
      await carregarDados(); 
    } catch (error) {
      console.error("Erro ao salvar registro:", error);
      alert("Erro ao salvar registro! Verifique os dados.");
    }
  };

  const editarRegistro = (registro) => {
    setEditandoRegistro(registro);
    setNovoRegistro({
      nome: registro.nome,
      data: registro.data,
      dinheiro: registro.dinheiro ? registro.dinheiro.toString() : "",
      cartao: registro.cartao ? registro.cartao.toString() : "",
      pix: registro.pix ? registro.pix.toString() : "",
      retirada: registro.retirada ? registro.retirada.toString() : "",
    });
  };

  const limparFormulario = () => {
    setEditandoRegistro(null);
    setNovoRegistro({
      nome: "",
      data: new Date().toISOString().split('T')[0],
      dinheiro: "",
      cartao: "",
      pix: "",
      retirada: "",
    });
  };

  const removerRegistro = async (id) => {
    if (confirm("Tem certeza que deseja remover este registro?")) {
      try {
        await VendedorExterno.delete(id);
        await carregarDados();
      } catch (error) {
        console.error("Erro ao remover registro:", error);
        alert("Erro ao remover registro!");
      }
    }
  };

  const calcularTotaisGerais = () => {
    return vendedoresExternosDisplay.reduce((acc, reg) => ({
      dinheiro: acc.dinheiro + (reg.dinheiro || 0),
      cartao: acc.cartao + (reg.cartao || 0),
      pix: acc.pix + (reg.pix || 0),
      retirada: acc.retirada + (reg.retirada || 0),
      total_recebido: acc.total_recebido + (reg.total_recebido || 0),
      custo_produtos: acc.custo_produtos + (reg.custo_produtos || 0),
      lucro: acc.lucro + (reg.lucro || 0)
    }), {
      dinheiro: 0, cartao: 0, pix: 0, retirada: 0,
      total_recebido: 0, custo_produtos: 0, lucro: 0
    });
  };

  const carregarValesVendedor = async (nomeVendedor) => {
    if (!nomeVendedor) {
      setValesMesAtual([]);
      return;
    }
    
    try {
      const vales = valesAll.filter(vale => {
        const dataVale = new Date(vale.data + 'T00:00:00');
        return vale.vendedor_nome === nomeVendedor &&
               dataVale.getMonth() + 1 === mesAtual && 
               dataVale.getFullYear() === anoAtual;
      });
      
      setValesMesAtual(vales);
      
      // REMOVIDO: verificação automática de saldo anterior
      // Agora todos os saldos anteriores devem ser inseridos manualmente
      
    } catch (error) {
      console.error('Erro ao carregar vales do vendedor:', error);
      setValesMesAtual([]);
    }
  };

  const salvarVale = async () => {
    if (!vendedorSelecionado) {
      alert('Selecione um vendedor primeiro!');
      return;
    }
    
    if (!novoVale.descricao || !novoVale.valor) {
      alert('Preencha a descrição e o valor!');
      return;
    }

    try {
      await ValeVendedor.create({
        vendedor_nome: vendedorSelecionado,
        tipo: novoVale.tipo,
        descricao: novoVale.descricao,
        valor: parseFloat(novoVale.valor),
        data: novoVale.data
      });

      setNovoVale({
        tipo: 'VALE',
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0]
      });

      // Aguardar antes de recarregar dados para evitar rate limit
      setTimeout(async () => {
        await carregarDados(); 
        carregarValesVendedor(vendedorSelecionado); 
      }, 300);
      
    } catch (error) {
      console.error('Erro ao salvar vale:', error);
      if (error.message && error.message.includes('429')) {
        alert('Muitas requisições. Aguarde alguns segundos antes de tentar novamente.');
      } else {
        alert('Erro ao salvar vale!');
      }
    }
  };

  const removerVale = async (valeId) => {
    if (confirm('Tem certeza que deseja remover este vale?')) {
      try {
        await ValeVendedor.delete(valeId);
        await carregarDados(); 
        carregarValesVendedor(vendedorSelecionado); 
      } catch (error) {
        console.error('Erro ao remover vale:', error);
        alert('Erro ao remover vale!');
      }
    }
  };

  const calcularSaldoTotalVendedor = () => {
    if (!vendedorSelecionado) return 0;

    // CORRIGIDO: Saldo = (Dinheiro + Cartão + PIX) - Valor dos Produtos - Vales
    // Retirada NÃO entra no saldo porque já foi retirada pelo vendedor
    const valorEntregueNaLoja = vendedoresExternosDisplay
        .filter(reg => reg.nome === vendedorSelecionado)
        .reduce((acc, reg) => acc + ((reg.dinheiro || 0) + (reg.cartao || 0) + (reg.pix || 0)), 0);
    
    const valorDosProdutos = vendedoresExternosDisplay
        .filter(reg => reg.nome === vendedorSelecionado)
        .reduce((acc, reg) => acc + (reg.custo_produtos || 0), 0);
    
    const totalVales = valesMesAtual.reduce((acc, vale) => {
        return acc + (vale.valor || 0);
    }, 0);

    // Saldo = Valor Entregue na Loja - Valor dos Produtos - Vales
    return valorEntregueNaLoja - valorDosProdutos - totalVales;
  };

  const totaisGerais = calcularTotaisGerais();

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex justify-center items-center">
        <p className="text-lg text-gray-700">Carregando dados...</p>
      </div>
    );
  }

  const saldoFinalVendedor = calcularSaldoTotalVendedor();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Controle de Vendedores Externos - {meses[mesAtual - 1]} {anoAtual}
          </h1>
          <div className="flex gap-2 items-center">
            <Select value={mesAtual.toString()} onValueChange={(value) => setMesAtual(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((mes, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {mes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={anoAtual}
              onChange={(e) => setAnoAtual(parseInt(e.target.value))}
              className="w-20"
              min="2020"
              max="2050"
            />
            <Link to={createPageUrl("PDV")}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao PDV</Button>
            </Link>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editandoRegistro ? 'Editar Registro' : 'Novo Lançamento'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div className="col-span-2 lg:col-span-1">
                <label className="text-sm font-medium">Vendedor *</label>
                <Select value={novoRegistro.nome} onValueChange={handleVendedorChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                        {vendedoresCadastrados.map(vendedor => (
                            <SelectItem key={vendedor.id} value={vendedor.nome}>
                                {vendedor.nome}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  name="data"
                  value={novoRegistro.data}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Dinheiro</label>
                <Input
                  type="number"
                  name="dinheiro"
                  value={novoRegistro.dinheiro}
                  onChange={handleInputChange}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cartão</label>
                <Input
                  type="number"
                  name="cartao"
                  value={novoRegistro.cartao}
                  onChange={handleInputChange}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">PIX</label>
                <Input
                  type="number"
                  name="pix"
                  value={novoRegistro.pix}
                  onChange={handleInputChange}
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Retirada</label>
                <Input
                  type="number"
                  name="retirada"
                  value={novoRegistro.retirada}
                  onChange={handleInputChange}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={salvarRegistro} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {editandoRegistro ? 'Atualizar' : 'Salvar'}
              </Button>
              {editandoRegistro && (
                <Button onClick={limparFormulario} variant="outline">Cancelar</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nova seção de Vales e Saldos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Controle de Vales e Saldos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Seleção do Vendedor e Novo Vale */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Vendedor</label>
                  <Select 
                    value={vendedorSelecionado} 
                    onValueChange={(value) => {
                      setVendedorSelecionado(value);
                      carregarValesVendedor(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedoresCadastrados.map(vendedor => ( 
                        <SelectItem key={vendedor.id} value={vendedor.nome}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {vendedorSelecionado && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tipo</label>
                        <Select 
                          value={novoVale.tipo} 
                          onValueChange={(value) => setNovoVale(prev => ({...prev, tipo: value}))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALDO ANT">SALDO ANTERIOR</SelectItem>
                            <SelectItem value="VALE">VALE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Data</label>
                        <Input
                          type="date"
                          value={novoVale.data}
                          onChange={(e) => setNovoVale(prev => ({...prev, data: e.target.value}))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descrição</label>
                      <Input
                        placeholder="Ex: MOTO 16/18, Celular 7/10, Saldo Julho/2025"
                        value={novoVale.descricao}
                        onChange={(e) => setNovoVale(prev => ({...prev, descricao: e.target.value}))}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Valor</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00 (use valores negativos para débitos)"
                        value={novoVale.valor}
                        onChange={(e) => setNovoVale(prev => ({...prev, valor: e.target.value}))}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Para saldos anteriores: use valor positivo se o vendedor tinha crédito, negativo se tinha débito
                      </p>
                    </div>

                    <Button onClick={salvarVale} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Adicionar {novoVale.tipo === 'SALDO ANT' ? 'Saldo Anterior' : 'Vale'}
                    </Button>
                  </>
                )}
              </div>

              {/* Lista de Vales e Saldo Total */}
              <div className="space-y-4">
                {vendedorSelecionado && (
                  <>
                    <div className="bg-gray-100 p-4 rounded-lg border">
                      <h3 className="font-bold text-lg mb-2">Saldo Total do Vendedor</h3>
                      <p className={`text-2xl font-bold ${saldoFinalVendedor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatarMoeda(saldoFinalVendedor)}
                      </p>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="w-16">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {valesMesAtual.map((vale) => ( 
                            <TableRow key={vale.id}>
                              <TableCell>{new Date(vale.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  vale.tipo === 'VALE' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {vale.tipo === 'SALDO ANT' ? 'SALDO ANTERIOR' : vale.tipo}
                                </span>
                              </TableCell>
                              <TableCell>{vale.descricao}</TableCell>
                              <TableCell>
                                <span className={vale.valor >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatarMoeda(vale.valor)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removerVale(vale.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {valesMesAtual.length === 0 && ( 
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                Nenhum vale ou saldo registrado para este vendedor no mês.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {!vendedorSelecionado && (
                  <div className="text-center text-gray-500 py-8">
                    Selecione um vendedor para gerenciar vales e saldos
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Histórico de Lançamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Dinheiro</TableHead>
                  <TableHead>Cartão</TableHead>
                  <TableHead>Pix</TableHead>
                  <TableHead>Retirada</TableHead>
                  <TableHead>Total Recebido</TableHead>
                  <TableHead>Valor dos Produtos</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedoresExternosDisplay.length === 0 ? ( 
                    <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-500">
                            Nenhum registro encontrado para o mês selecionado.
                        </TableCell>
                    </TableRow>
                ) : (
                    vendedoresExternosDisplay.map((registro) => ( 
                        <TableRow key={registro.id}>
                            <TableCell>{registro.nome}</TableCell>
                            <TableCell>{new Date(registro.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                            <TableCell>{formatarMoeda(registro.dinheiro)}</TableCell>
                            <TableCell>{formatarMoeda(registro.cartao)}</TableCell>
                            <TableCell>{formatarMoeda(registro.pix)}</TableCell>
                            <TableCell>{formatarMoeda(registro.retirada)}</TableCell>
                            <TableCell>{formatarMoeda(registro.total_recebido)}</TableCell>
                            <TableCell>{formatarMoeda(registro.custo_produtos)}</TableCell>
                            <TableCell className={(registro.lucro || 0) >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {formatarMoeda(registro.lucro)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => editarRegistro(registro)}
                                    className="text-blue-600 hover:text-blue-700 mr-2"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removerRegistro(registro.id)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
                {vendedoresExternosDisplay.length > 0 && ( 
                    <TableRow className="bg-gray-100 font-bold">
                        <TableCell colSpan={2}>TOTAL GERAL ►</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.dinheiro)}</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.cartao)}</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.pix)}</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.retirada)}</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.total_recebido)}</TableCell>
                        <TableCell>{formatarMoeda(totaisGerais.custo_produtos)}</TableCell>
                        <TableCell className={(totaisGerais.lucro || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatarMoeda(totaisGerais.lucro)}
                        </TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
