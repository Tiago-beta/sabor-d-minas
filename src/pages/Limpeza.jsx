import React, { useState, useEffect } from "react";
import { Venda } from "@/api/entities";
import { PedidoOnline } from "@/api/entities";
import { Consignacao } from "@/api/entities";
import { ConsignacaoItem } from "@/api/entities";
import { EntregaMotoboy } from "@/api/entities";
import { FechamentoCaixa } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2, Database, Calendar, AlertTriangle } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Limpeza() {
  const [vendas, setVendas] = useState([]);
  const [pedidosOnline, setPedidosOnline] = useState([]);
  const [consignacoes, setConsignacoes] = useState([]);
  const [itensConsignacao, setItensConsignacao] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [mesLimpeza, setMesLimpeza] = useState(new Date().getMonth()); // Mês anterior como padrão
  const [anoLimpeza, setAnoLimpeza] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarEstatisticas();
  }, [mesLimpeza, anoLimpeza]);

  const carregarEstatisticas = async () => {
    try {
      const [vendasList, pedidosList, consignacoesList, itensConsignacaoList, entregasList, fechamentosList] = await Promise.all([
        Venda.list("-created_date"),
        PedidoOnline.list("-created_date"),
        Consignacao.list("-created_date"),
        ConsignacaoItem.list("-created_date"),
        EntregaMotoboy.list("-created_date"),
        FechamentoCaixa.list("-created_date")
      ]);

      setVendas(vendasList);
      setPedidosOnline(pedidosList);
      setConsignacoes(consignacoesList);
      setItensConsignacao(itensConsignacaoList);
      setEntregas(entregasList);
      setFechamentos(fechamentosList);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const filtrarPorPeriodo = (lista, campo = 'created_date') => {
    return lista.filter(item => {
      const data = new Date(item[campo]);
      return data.getMonth() === mesLimpeza && data.getFullYear() === anoLimpeza;
    });
  };

  const vendasPeriodo = filtrarPorPeriodo(vendas);
  const pedidosPeriodo = filtrarPorPeriodo(pedidosOnline);
  const consignacoesPeriodo = filtrarPorPeriodo(consignacoes);
  const entregasPeriodo = filtrarPorPeriodo(entregas);
  const fechamentosPeriodo = fechamentos.filter(f => {
    const data = new Date(f.data_fechamento);
    return data.getMonth() === mesLimpeza && data.getFullYear() === anoLimpeza;
  });

  const executarLimpeza = async (tipo) => {
    setLoading(true);
    let deletedCount = 0;

    try {
      switch (tipo) {
        case 'vendas':
          for (const venda of vendasPeriodo) {
            await Venda.delete(venda.id);
            deletedCount++;
          }
          break;
          
        case 'pedidos':
          for (const pedido of pedidosPeriodo) {
            await PedidoOnline.delete(pedido.id);
            deletedCount++;
          }
          break;
          
        case 'consignacoes':
          // Primeiro deletar itens de consignação
          const itensParaDeletar = itensConsignacao.filter(item => 
            consignacoesPeriodo.some(c => c.id === item.consignacao_id)
          );
          for (const item of itensParaDeletar) {
            await ConsignacaoItem.delete(item.id);
          }
          
          // Depois deletar consignações
          for (const consignacao of consignacoesPeriodo) {
            await Consignacao.delete(consignacao.id);
            deletedCount++;
          }
          break;
          
        case 'entregas':
          for (const entrega of entregasPeriodo) {
            await EntregaMotoboy.delete(entrega.id);
            deletedCount++;
          }
          break;
          
        case 'fechamentos':
          for (const fechamento of fechamentosPeriodo) {
            await FechamentoCaixa.delete(fechamento.id);
            deletedCount++;
          }
          break;
          
        case 'tudo':
          // Executar todas as limpezas em sequência
          await executarLimpeza('vendas');
          await executarLimpeza('pedidos');
          await executarLimpeza('consignacoes');
          await executarLimpeza('entregas');
          await executarLimpeza('fechamentos');
          break;
      }

      if (tipo !== 'tudo') {
        alert(`${deletedCount} registros foram excluídos com sucesso!`);
      } else {
        alert('Limpeza completa realizada com sucesso!');
      }
      
      carregarEstatisticas();
    } catch (error) {
      console.error("Erro na limpeza:", error);
      alert("Erro ao executar limpeza!");
    } finally {
      setLoading(false);
      setConfirmacao(null);
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Limpeza de Dados
          </h1>
          <Link to={createPageUrl("Gerencia")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar à Gerência
            </Button>
          </Link>
        </div>

        {/* Seletor de Período */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Selecionar Período para Limpeza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <label className="text-sm font-medium">Mês</label>
                <Select value={mesLimpeza.toString()} onValueChange={(value) => setMesLimpeza(parseInt(value))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ano</label>
                <Select value={anoLimpeza.toString()} onValueChange={(value) => setAnoLimpeza(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(ano => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-600 ml-4">
                Período selecionado: <span className="font-semibold">{meses[mesLimpeza]} de {anoLimpeza}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Vendas</p>
                  <p className="text-2xl font-bold">{vendasPeriodo.length}</p>
                </div>
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pedidos Online</p>
                  <p className="text-2xl font-bold">{pedidosPeriodo.length}</p>
                </div>
                <Trash2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Consignações</p>
                  <p className="text-2xl font-bold">{consignacoesPeriodo.length}</p>
                </div>
                <Trash2 className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botões de Limpeza */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Button
            onClick={() => setConfirmacao('vendas')}
            disabled={loading || vendasPeriodo.length === 0}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-red-600" />
            <span>Limpar Vendas ({vendasPeriodo.length})</span>
          </Button>
          
          <Button
            onClick={() => setConfirmacao('pedidos')}
            disabled={loading || pedidosPeriodo.length === 0}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-blue-600" />
            <span>Limpar Pedidos ({pedidosPeriodo.length})</span>
          </Button>
          
          <Button
            onClick={() => setConfirmacao('consignacoes')}
            disabled={loading || consignacoesPeriodo.length === 0}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-purple-600" />
            <span>Limpar Consignações ({consignacoesPeriodo.length})</span>
          </Button>
          
          <Button
            onClick={() => setConfirmacao('entregas')}
            disabled={loading || entregasPeriodo.length === 0}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-green-600" />
            <span>Limpar Entregas ({entregasPeriodo.length})</span>
          </Button>
          
          <Button
            onClick={() => setConfirmacao('fechamentos')}
            disabled={loading || fechamentosPeriodo.length === 0}
            variant="outline"
            className="h-16 flex flex-col items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5 text-orange-600" />
            <span>Limpar Fechamentos ({fechamentosPeriodo.length})</span>
          </Button>
          
          <Button
            onClick={() => setConfirmacao('tudo')}
            disabled={loading}
            className="h-16 flex flex-col items-center justify-center gap-2 bg-red-600 hover:bg-red-700"
          >
            <AlertTriangle className="w-5 h-5" />
            <span>LIMPAR TUDO</span>
          </Button>
        </div>

        {/* Aviso */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">⚠️ ATENÇÃO:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Esta operação é <strong>IRREVERSÍVEL</strong></li>
                  <li>Certifique-se de que os dados do período selecionado já foram consolidados nos relatórios</li>
                  <li>Recomendado usar apenas após o fechamento mensal</li>
                  <li>Os produtos, clientes e outras configurações NÃO serão afetadas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Confirmação */}
      <AlertDialog open={!!confirmacao} onOpenChange={() => setConfirmacao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {
                confirmacao === 'vendas' ? `${vendasPeriodo.length} vendas` :
                confirmacao === 'pedidos' ? `${pedidosPeriodo.length} pedidos online` :
                confirmacao === 'consignacoes' ? `${consignacoesPeriodo.length} consignações` :
                confirmacao === 'entregas' ? `${entregasPeriodo.length} entregas` :
                confirmacao === 'fechamentos' ? `${fechamentosPeriodo.length} fechamentos` :
                'TODOS os dados'
              } do período {meses[mesLimpeza]} de {anoLimpeza}?
              <br/><br/>
              <strong>Esta ação não pode ser desfeita!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => executarLimpeza(confirmacao)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}