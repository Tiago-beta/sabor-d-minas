import React, { useState, useEffect, useMemo } from "react";
import { Venda } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, ArrowLeft, Banknote, CreditCard, Smartphone, Clock, Building, Users } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

export default function FechamentoCaixa() {
  const [vendas, setVendas] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarVendas();
  }, []);

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const vendasList = await Venda.list("-created_date", 5000);
      setVendas(vendasList);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const dadosFechamento = useMemo(() => {
    const vendasDoDia = vendas.filter(v => v.created_date && v.created_date.startsWith(filtroData));
    
    const fechamento = vendasDoDia.reduce((acc, venda) => {
      const operador = venda.operador_nome || 'Sistema';
      if (!acc[operador]) {
        acc[operador] = {
          local: { dinheiro: 0, cartao: 0, pix: 0, aprazo: 0, interno: 0, ifood: 0, consignado: 0, total: 0 },
          delivery: { dinheiro: 0, cartao: 0, pix: 0, aprazo: 0, interno: 0, ifood: 0, consignado: 0, total: 0 },
          total: 0,
        };
      }
      
      const metodo = venda.metodo_pagamento || 'desconhecido';
      const valor = venda.total || 0;
      const tipo = venda.tipo_venda === 'delivery' ? 'delivery' : 'local';

      if (acc[operador][tipo] && acc[operador][tipo][metodo] !== undefined) {
        acc[operador][tipo][metodo] += valor;
      }
      if (acc[operador][tipo]) {
        acc[operador][tipo].total += valor;
      }
      acc[operador].total += valor;
      
      return acc;
    }, {});
    
    return Object.entries(fechamento).sort((a,b) => b[1].total - a[1].total);
  }, [vendas, filtroData]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Fechamento de Caixa
          </h1>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-40 bg-white"
            />
            <Link to={createPageUrl("Gerencia")}>
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </Link>
          </div>
        </div>
        
        {loading ? (
            <div className="text-center p-12">Carregando dados...</div>
        ) : dadosFechamento.length === 0 ? (
            <Card>
                <CardContent className="p-12 text-center text-gray-500">
                    Nenhuma venda encontrada para a data selecionada.
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-6">
            {dadosFechamento.map(([operador, totais]) => (
                <Card key={operador} className="overflow-hidden">
                <CardHeader style={{ backgroundColor: 'var(--card-bg)' }}>
                    <CardTitle className="flex justify-between items-center">
                    <span className="text-lg">{operador}</span>
                    <div className="text-right">
                        <span className="text-2xl font-bold">{formatCurrency(totais.total)}</span>
                        <p className="text-sm font-medium text-muted-foreground">Total do Dia</p>
                    </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                    <div>
                        <h4 className="font-semibold text-md mb-2">Vendas Local</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {metodosPagamento.map(metodo => (
                            <div key={metodo.id} className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                                <metodo.icon className={`w-6 h-6 mx-auto mb-1 ${metodo.color}`} />
                                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{metodo.label}</p>
                                <p className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{formatCurrency(totais.local[metodo.id])}</p>
                            </div>
                            ))}
                        </div>
                        <div className="text-right font-bold text-lg mt-2">Total Local: {formatCurrency(totais.local.total)}</div>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-md mb-2">Vendas Delivery</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {metodosPagamento.map(metodo => (
                            <div key={metodo.id} className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}>
                                <metodo.icon className={`w-6 h-6 mx-auto mb-1 ${metodo.color}`} />
                                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-color)' }}>{metodo.label}</p>
                                <p className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{formatCurrency(totais.delivery[metodo.id])}</p>
                            </div>
                            ))}
                        </div>
                        <div className="text-right font-bold text-lg mt-2">Total Delivery: {formatCurrency(totais.delivery.total)}</div>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}