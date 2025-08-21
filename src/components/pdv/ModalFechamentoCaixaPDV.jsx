
import React, { useState, useEffect, useMemo } from "react";
import { Venda, User, FechamentoCaixa } from "@/api/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Banknote, CreditCard, Smartphone, Clock, Building, Users, Lock, Unlock } from "lucide-react";
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

const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const metodosPagamento = [
    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-green-600' },
    { id: 'cartao', label: 'Cartão', icon: CreditCard, color: 'text-blue-600' },
    { id: 'pix', label: 'Pix', icon: Smartphone, color: 'text-purple-600' },
    { id: 'aprazo', label: 'A Prazo', icon: Clock, color: 'text-orange-600' },
    { id: 'interno', label: 'Interno', icon: Building, color: 'text-gray-600' },
    { id: 'ifood', label: 'iFood', icon: Smartphone, color: 'text-red-500' },
    { id: 'consignado', label: 'Consignado', icon: Users, color: 'text-teal-500' },
];

const InfoCard = ({ title, children, bgColor }) => (
  <div className={`p-3 rounded-lg dark:bg-gray-200 ${bgColor}`}>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-800">{title}</div>
    {children}
  </div>
);

const PagamentoGrid = ({ title, data, total }) => (
  <div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {metodosPagamento.map(metodo => (
        <div key={metodo.id} className="text-center p-3 rounded-lg border dark:bg-gray-200">
          <metodo.icon className={`w-6 h-6 mx-auto mb-1 ${metodo.color}`} />
          <p className="text-sm font-medium mb-1 text-gray-800 dark:text-gray-800">{metodo.label}</p>
          <p className="text-lg font-bold text-gray-800 dark:text-gray-800">{formatCurrency(data[metodo.id])}</p>
        </div>
      ))}
    </div>
    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-300 rounded-lg text-right">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-800">Total {title}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-gray-800">{formatCurrency(total)}</p>
    </div>
  </div>
);

export default function ModalFechamentoCaixaPDV() {
  const [vendas, setVendas] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [operadorAtual, setOperadorAtual] = useState('');
  const [isGerente, setIsGerente] = useState(false);
  
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [reforcos, setReforcos] = useState(0);
  const [sangrias, setSangrias] = useState(0);
  const [devolucoes, setDevolucoes] = useState(0);
  
  const [caixaFechado, setCaixaFechado] = useState(false);
  const [fechamentoId, setFechamentoId] = useState(null);
  
  const [open, setOpen] = useState(false);
  const [alertaConfirmacao, setAlertaConfirmacao] = useState(false);

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open, filtroData]);

  const carregarDados = async () => {
    setLoading(true);
    setCaixaFechado(false); // Reset to false before loading, set true only if record status is 'fechado'
    setFechamentoId(null);

    try {
      const [vendasList, user] = await Promise.all([
        Venda.list("-created_date", 5000),
        User.me()
      ]);
      setVendas(vendasList);
      const opNome = user.operador_nome || user.full_name || "OPERADOR";
      setOperadorAtual(opNome);
      setIsGerente(user.is_gerente || false);
      
      const fechamentos = await FechamentoCaixa.filter({ 
        operador_nome: opNome, 
        data_fechamento: filtroData 
      });

      if (fechamentos.length > 0) {
        const fechamentoAtual = fechamentos[0];
        setFechamentoId(fechamentoAtual.id);
        setSaldoInicial(fechamentoAtual.saldo_inicial);
        setReforcos(fechamentoAtual.reforcos);
        setSangrias(fechamentoAtual.sangrias);
        setDevolucoes(fechamentoAtual.devolucoes);
        if (fechamentoAtual.status === 'fechado') {
          setCaixaFechado(true);
        }
      } else {
        // Reset fields if no record found for the day
        setSaldoInicial(0);
        setReforcos(0);
        setSangrias(0);
        setDevolucoes(0);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const dadosFechamento = useMemo(() => {
    const vendasDoDia = vendas.filter(v => 
      v.created_date && 
      v.created_date.startsWith(filtroData) && 
      v.operador_nome === operadorAtual
    );
    
    const initialTotals = {
      dinheiro: 0, cartao: 0, pix: 0, aprazo: 0, interno: 0, ifood: 0, consignado: 0, total: 0,
    };

    const fechamento = {
        local: { ...initialTotals },
        delivery: { ...initialTotals },
        totalGeral: 0,
    };
    
    vendasDoDia.forEach(venda => {
      const metodo = venda.metodo_pagamento || 'desconhecido';
      const valor = venda.total || 0;
      const tipo = venda.tipo_venda === 'delivery' ? 'delivery' : 'local';

      // Ensure the method exists in the initial totals, or add it with default 0
      if (fechamento[tipo][metodo] === undefined) {
          fechamento[tipo][metodo] = 0;
      }
      fechamento[tipo][metodo] += valor;
      fechamento[tipo].total += valor;
      fechamento.totalGeral += valor;
    });
    
    return fechamento;
  }, [vendas, filtroData, operadorAtual]);

  const calcularSaldoFinal = () => {
    return saldoInicial + dadosFechamento.local.dinheiro + dadosFechamento.delivery.dinheiro + reforcos - sangrias - devolucoes;
  };
  
  const handleConfirmarFechamento = async () => {
    setAlertaConfirmacao(false);
    const dadosParaSalvar = {
      operador_nome: operadorAtual,
      data_fechamento: filtroData,
      saldo_inicial: saldoInicial,
      reforcos: reforcos,
      sangrias: sangrias,
      devolucoes: devolucoes,
      saldo_final_calculado: calcularSaldoFinal(),
      dados_venda: {
        local: dadosFechamento.local,
        delivery: dadosFechamento.delivery,
      },
      status: 'fechado'
    };
    
    try {
      if (fechamentoId) {
        await FechamentoCaixa.update(fechamentoId, dadosParaSalvar);
      } else {
        await FechamentoCaixa.create(dadosParaSalvar);
      }
      setCaixaFechado(true);
      alert('Caixa fechado com sucesso!');
    } catch(error) {
      console.error('Erro ao fechar o caixa:', error);
      alert('Ocorreu um erro. Tente novamente.');
    }
  };

  const handleReabrirCaixa = async () => {
    if (!isGerente) {
      alert("Apenas gerentes podem reabrir o caixa.");
      return;
    }
    const senha = prompt("Digite a senha de gerente para reabrir o caixa:");
    // This is a placeholder for a real authentication mechanism.
    // In a real application, this should involve a secure backend check.
    if (senha === "2546") { 
      try {
        await FechamentoCaixa.update(fechamentoId, { status: 'aberto' });
        setCaixaFechado(false);
        await carregarDados(); // Re-load data after re-opening to ensure state consistency
        alert('Caixa reaberto com sucesso!');
      } catch (error) {
        alert('Erro ao reabrir o caixa.');
      }
    } else if (senha) {
      alert("Senha incorreta!");
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Fechamento de Caixa">
          <Store className="w-5 h-5 text-gray-500 hover:text-blue-500 transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Store className="w-5 h-5" />
            Fechamento de Caixa - {operadorAtual}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Data:</label>
                <Input
                  type="date"
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-40"
                  readOnly={caixaFechado}
                />
            </div>
            <div>
                {!caixaFechado && (
                  <Button onClick={() => setAlertaConfirmacao(true)} className="bg-green-600 hover:bg-green-700">
                    <Lock className="w-4 h-4 mr-2"/>
                    Confirmar Fechamento
                  </Button>
                )}
                {caixaFechado && isGerente && (
                  <Button onClick={handleReabrirCaixa} variant="destructive">
                    <Unlock className="w-4 h-4 mr-2"/>
                    Reabrir Caixa
                  </Button>
                )}
            </div>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-6 gap-4 text-center">
                <InfoCard title="Saldo Inicial" bgColor="bg-gray-100">
                  <Input type="number" step="0.01" value={saldoInicial} onChange={(e) => setSaldoInicial(parseFloat(e.target.value) || 0)} className="text-center font-bold text-gray-800 dark:text-gray-800 bg-white dark:bg-white mt-1" placeholder="0,00" readOnly={caixaFechado}/>
                </InfoCard>
                <InfoCard title="Vendas (Dinheiro)" bgColor="bg-blue-100">
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-800">{formatCurrency(dadosFechamento.local.dinheiro + dadosFechamento.delivery.dinheiro)}</div>
                </InfoCard>
                <InfoCard title="Reforços" bgColor="bg-green-100">
                  <Input type="number" step="0.01" value={reforcos} onChange={(e) => setReforcos(parseFloat(e.target.value) || 0)} className="text-center font-bold text-gray-800 dark:text-gray-800 bg-white dark:bg-white mt-1" placeholder="0,00" readOnly={caixaFechado}/>
                </InfoCard>
                <InfoCard title="Sangrias" bgColor="bg-orange-100">
                  <Input type="number" step="0.01" value={sangrias} onChange={(e) => setSangrias(parseFloat(e.target.value) || 0)} className="text-center font-bold text-gray-800 dark:text-gray-800 bg-white dark:bg-white mt-1" placeholder="0,00" readOnly={caixaFechado}/>
                </InfoCard>
                <InfoCard title="Devoluções" bgColor="bg-red-100">
                  <Input type="number" step="0.01" value={devolucoes} onChange={(e) => setDevolucoes(parseFloat(e.target.value) || 0)} className="text-center font-bold text-gray-800 dark:text-gray-800 bg-white dark:bg-white mt-1" placeholder="0,00" readOnly={caixaFechado}/>
                </InfoCard>
                <InfoCard title="Saldo Final" bgColor="bg-purple-100">
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-800">{formatCurrency(calcularSaldoFinal())}</div>
                </InfoCard>
              </div>
            </CardContent>
          </Card>

          {loading ? <div className="text-center p-12">Carregando...</div> : (
            <Card>
              <CardContent className="p-4 space-y-6">
                <PagamentoGrid title="Vendas Local" data={dadosFechamento.local} total={dadosFechamento.local.total} />
                <PagamentoGrid title="Vendas Delivery" data={dadosFechamento.delivery} total={dadosFechamento.delivery.total} />
              </CardContent>
            </Card>
          )}
        </div>
        <AlertDialog open={alertaConfirmacao} onOpenChange={setAlertaConfirmacao}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Fechamento</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem certeza que deseja fechar o caixa? Após a confirmação, ele só poderá ser reaberto pela gerência.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmarFechamento} className="bg-green-600 hover:bg-green-700">Confirmar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
