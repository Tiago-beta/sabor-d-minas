
import React, { useState, useEffect } from "react";
import { Venda, Produto, Consignacao, ConsignacaoItem } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Saldo() {
    const [vendas, setVendas] = useState([]);
    const [consignacoes, setConsignacoes] = useState([]);
    const [itensConsignacao, setItensConsignacao] = useState([]);
    const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
    const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarDados();
    }, [mesAtual, anoAtual]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [vendasList, consignacoesList, itensConsignacaoList] = await Promise.all([
                Venda.list("-created_date", 3000),
                Consignacao.list("-created_date"),
                ConsignacaoItem.list("-created_date")
            ]);
            
            setVendas(vendasList);
            setConsignacoes(consignacoesList);
            setItensConsignacao(itensConsignacaoList);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDiasDoMes = () => {
        const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
        return Array.from({ length: diasNoMes }, (_, i) => i + 1);
    };

    const calcularCustoProdutoVendido = (venda) => {
        // Simplificado: 70% do total como custo
        return venda.total * 0.7;
    };

    const calcularVendasPorDia = (dia) => {
        const vendasDoDia = vendas.filter(v => {
            const dataVenda = new Date(v.created_date);
            return dataVenda.getFullYear() === anoAtual &&
                   dataVenda.getMonth() + 1 === mesAtual &&
                   dataVenda.getDate() === dia &&
                   v.status === 'finalizada';
        });

        const resultado = {
            varejo: {
                dinheiro: 0, cartao: 0, pix: 0, aprazo: 0, interno: 0, ifood: 0,
                total: 0, custo: 0, lucro: 0
            },
            atacado: {
                dinheiro: 0, cartao: 0, pix: 0, consignado: 0,
                total: 0, custo: 0, lucro: 0
            },
            geral: {
                total: 0, custo: 0, lucro: 0
            }
        };

        vendasDoDia.forEach(venda => {
            const valor = venda.total || 0;
            const custo = calcularCustoProdutoVendido(venda);
            const lucro = valor - custo;

            if (venda.tipo_venda === 'atacado') {
                resultado.atacado[venda.metodo_pagamento] += valor;
                resultado.atacado.total += valor;
                resultado.atacado.custo += custo;
                resultado.atacado.lucro += lucro;
            } else {
                // Varejo ou delivery
                // Ensure the payment method exists in varejo object before adding
                if (resultado.varejo.hasOwnProperty(venda.metodo_pagamento)) {
                    resultado.varejo[venda.metodo_pagamento] += valor;
                } else {
                    // Fallback for methods not explicitly defined (e.g., 'interno' if removed from object init but still comes from data)
                    // For now, these sales are still calculated and stored, just not displayed.
                    // If 'interno' needs to be entirely ignored or re-routed, logic here should change.
                    // As per current instruction, just remove display column.
                }
                resultado.varejo.total += valor;
                resultado.varejo.custo += custo;
                resultado.varejo.lucro += lucro;
            }

            resultado.geral.total += valor;
            resultado.geral.custo += custo;
            resultado.geral.lucro += lucro;
        });

        // Add sales from consignation in wholesale
        const consignacoesDoDia = consignacoes.filter(c => {
            const dataRetorno = new Date(c.data_retorno);
            return c.status === 'finalizado' &&
                   dataRetorno.getFullYear() === anoAtual &&
                   dataRetorno.getMonth() + 1 === mesAtual &&
                   dataRetorno.getDate() === dia;
        });

        consignacoesDoDia.forEach(consignacao => {
            const itensConsignacaoDoVendedor = itensConsignacao.filter(item => 
                item.consignacao_id === consignacao.id
            );

            let totalConsignacao = 0;
            let custoConsignacao = 0;

            itensConsignacaoDoVendedor.forEach(item => {
                const valorVendido = (item.quantidade_vendida || 0) * (item.preco_atacado || 0);
                const custoVendido = (item.quantidade_vendida || 0) * (item.custo || 0);
                
                totalConsignacao += valorVendido;
                custoConsignacao += custoVendido;
            });

            resultado.atacado.consignado += totalConsignacao;
            resultado.atacado.total += totalConsignacao;
            resultado.atacado.custo += custoConsignacao;
            resultado.atacado.lucro += (totalConsignacao - custoConsignacao);

            resultado.geral.total += totalConsignacao;
            resultado.geral.custo += custoConsignacao;
            resultado.geral.lucro += (totalConsignacao - custoConsignacao);
        });

        return resultado;
    };

    const calcularTotaisMes = () => {
        const dias = getDiasDoMes();
        return dias.reduce((acc, dia) => {
            const dadosDia = calcularVendasPorDia(dia);
            
            // Sum retail
            Object.keys(acc.varejo).forEach(key => {
                acc.varejo[key] += dadosDia.varejo[key];
            });
            
            // Sum wholesale
            Object.keys(acc.atacado).forEach(key => {
                acc.atacado[key] += dadosDia.atacado[key];
            });
            
            // Sum general
            Object.keys(acc.geral).forEach(key => {
                acc.geral[key] += dadosDia.geral[key];
            });
            
            return acc;
        }, {
            varejo: { dinheiro: 0, cartao: 0, pix: 0, aprazo: 0, interno: 0, ifood: 0, total: 0, custo: 0, lucro: 0 },
            atacado: { dinheiro: 0, cartao: 0, pix: 0, consignado: 0, total: 0, custo: 0, lucro: 0 },
            geral: { total: 0, custo: 0, lucro: 0 }
        });
    };

    const formatarMoeda = (valor) => {
        if (valor === 0) return 'R$ 0,00';
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    };

    const dias = getDiasDoMes();
    const totaisMes = calcularTotaisMes();
    const diasUteis = dias.filter(dia => {
        const dadosDia = calcularVendasPorDia(dia);
        return dadosDia.geral.total > 0;
    }).length || 1;
    
    const mediaDiaria = totaisMes.geral.total / diasUteis;
    const diaAtual = new Date().getDate();
    const mesAtualReal = new Date().getMonth() + 1;
    const anoAtualReal = new Date().getFullYear();

    const meses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-center items-center h-64">
                        <TrendingUp className="w-8 h-8 animate-pulse" />
                        <span className="ml-2">Carregando dados...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <style>{`
                :root {
                --bg-color: #e2e8f0;
                --text-color: #1e293b;
                --card-bg: #f1f5f9;
                --border-color: #cbd5e1;
                --input-bg: #f8fafc;
                --header-bg: #e2e8f0;
                }

                .dark {
                --bg-color: #111827;
                --text-color: #ffffff;
                --card-bg: #1f2937;
                --border-color: #374151;
                --input-bg: #374151;
                --header-bg: #1f2937;
                }
                
                body {
                background-color: var(--bg-color) !important;
                color: var(--text-color) !important;
                }
                
                /* Destaque específico para o dia atual */
                .dia-atual {
                background-color: #bbf7d0 !important; /* Verde claro */
                }
                
                .dia-atual td {
                background-color: #bbf7d0 !important; /* Verde claro para todas as células */
                }
                
                /* Sobrescrever colors específicas das colunas para o dia atual */
                .dia-atual .bg-blue-50 {
                background-color: #bbf7d0 !important;
                }
                
                .dia-atual .bg-green-50 {
                background-color: #bbf7d0 !important;
                }
                
                .dia-atual .bg-yellow-50 {
                background-color: #bbf7d0 !important;
                }
                
                /* Ocultar setas de input de número */
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                -webkit-appearance: none; 
                margin: 0; 
                }
                input[type=number] {
                -moz-appearance: textfield;
                }
            `}</style>
            <div className="max-w-full mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Saldo Diário - {meses[mesAtual - 1]} {anoAtual}
                    </h1>
                    <div className="flex gap-2 items-center">
                        <Input
                            type="number"
                            value={mesAtual}
                            onChange={(e) => setMesAtual(parseInt(e.target.value))}
                            min="1"
                            max="12"
                            className="w-20"
                        />
                        <Input
                            type="number"
                            value={anoAtual}
                            onChange={(e) => setAnoAtual(parseInt(e.target.value))}
                            className="w-24"
                        />
                        <Link to={createPageUrl("Gerencia")}>
                            <Button variant="outline">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar à Gerência
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2 font-bold sticky left-0 bg-gray-100 z-10">DATA</th>
                                        
                                        {/* VAREJO - removida coluna Interno */}
                                        <th className="border p-1 font-bold bg-blue-50" colSpan="8">VAREJO</th>
                                        
                                        {/* ATACADO */}
                                        <th className="border p-1 font-bold bg-green-50" colSpan="7">ATACADO</th>
                                        
                                        {/* GERAL */}
                                        <th className="border p-1 font-bold bg-yellow-50" colSpan="3">GERAL</th>
                                    </tr>
                                    <tr className="bg-gray-50 text-xs">
                                        <th className="border p-1 sticky left-0 bg-gray-50 z-10"></th>
                                        
                                        {/* Varejo headers - removida coluna Interno */}
                                        <th className="border p-1 bg-blue-50">Dinheiro</th>
                                        <th className="border p-1 bg-blue-50">Cartão</th>
                                        <th className="border p-1 bg-blue-50">Pix</th>
                                        <th className="border p-1 bg-blue-50">A Prazo</th>
                                        <th className="border p-1 bg-blue-50">iFood</th>
                                        <th className="border p-1 bg-blue-50 font-bold">TOTAL</th>
                                        <th className="border p-1 bg-blue-50">CUSTO</th>
                                        <th className="border p-1 bg-blue-50 font-bold">LUCRO</th>
                                        
                                        {/* Atacado headers */}
                                        <th className="border p-1 bg-green-50">Dinheiro</th>
                                        <th className="border p-1 bg-green-50">Cartão</th>
                                        <th className="border p-1 bg-green-50">Pix</th>
                                        <th className="border p-1 bg-green-50">Consignado</th>
                                        <th className="border p-1 bg-green-50 font-bold">TOTAL</th>
                                        <th className="border p-1 bg-green-50">CUSTO</th>
                                        <th className="border p-1 bg-green-50 font-bold">LUCRO</th>
                                        
                                        {/* Geral headers */}
                                        <th className="border p-1 bg-yellow-50 font-bold">TOTAL</th>
                                        <th className="border p-1 bg-yellow-50">CUSTO</th>
                                        <th className="border p-1 bg-yellow-50 font-bold">LUCRO</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dias
                                        .filter(dia => {
                                            const dadosDia = calcularVendasPorDia(dia);
                                            // Show only days that have some movement
                                            return dadosDia.geral.total > 0;
                                        })
                                        .map(dia => {
                                        const dadosDia = calcularVendasPorDia(dia);
                                        const isDiaAtual = dia === diaAtual && mesAtual === mesAtualReal && anoAtual === anoAtualReal;
                                        
                                        return (
                                            <tr key={dia} className={isDiaAtual ? 'dia-atual font-semibold' : 'hover:bg-gray-50'}>
                                                <td className={`border p-2 font-bold sticky left-0 z-10 ${isDiaAtual ? '' : 'bg-white'}`}>
                                                    {dia}/{mesAtual.toString().padStart(2, '0')}
                                                </td>
                                                
                                                {/* Varejo - removed Interno column */}
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.varejo.dinheiro)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.varejo.cartao)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.varejo.pix)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.varejo.aprazo)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.varejo.ifood)}</td>
                                                <td className="border p-1 text-right font-bold bg-blue-50">{formatarMoeda(dadosDia.varejo.total)}</td>
                                                <td className="border p-1 text-right text-red-600">{formatarMoeda(dadosDia.varejo.custo)}</td>
                                                <td className="border p-1 text-right font-bold text-green-600">{formatarMoeda(dadosDia.varejo.lucro)}</td>
                                                
                                                {/* Atacado */}
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.atacado.dinheiro)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.atacado.cartao)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.atacado.pix)}</td>
                                                <td className="border p-1 text-right">{formatarMoeda(dadosDia.atacado.consignado)}</td>
                                                <td className="border p-1 text-right font-bold bg-green-50">{formatarMoeda(dadosDia.atacado.total)}</td>
                                                <td className="border p-1 text-right text-red-600">{formatarMoeda(dadosDia.atacado.custo)}</td>
                                                <td className="border p-1 text-right font-bold text-green-600">{formatarMoeda(dadosDia.atacado.lucro)}</td>
                                                
                                                {/* Geral */}
                                                <td className="border p-1 text-right font-bold bg-yellow-50">{formatarMoeda(dadosDia.geral.total)}</td>
                                                <td className="border p-1 text-right text-red-600">{formatarMoeda(dadosDia.geral.custo)}</td>
                                                <td className="border p-1 text-right font-bold text-green-600">{formatarMoeda(dadosDia.geral.lucro)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-800 text-white font-bold">
                                        <td className="border p-2 sticky left-0 bg-gray-800 z-10">TOTAL MÊS</td>
                                        
                                        {/* Totals Retail - removed Interno column */}
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.dinheiro)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.cartao)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.pix)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.aprazo)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.ifood)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.total)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.custo)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.varejo.lucro)}</td>
                                        
                                        {/* Totals Wholesale */}
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.dinheiro)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.cartao)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.pix)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.consignado)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.total)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.custo)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.atacado.lucro)}</td>
                                        
                                        {/* Totals General */}
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.geral.total)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.geral.custo)}</td>
                                        <td className="border p-1 text-right">{formatarMoeda(totaisMes.geral.lucro)}</td>
                                    </tr>
                                    <tr className="bg-blue-600 text-white">
                                        <td className="border p-2 sticky left-0 bg-blue-600 z-10 font-bold">MÉDIA/DIA</td>
                                        <td className="border p-1 text-right" colSpan="17">
                                            <div className="flex justify-end gap-4">
                                                <span className="font-bold">Vendas: {formatarMoeda(mediaDiaria)}</span>
                                                <span className="font-bold">Lucro: {formatarMoeda(totaisMes.geral.lucro / diasUteis)}</span>
                                                <span className="text-xs">({diasUteis} dias úteis)</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
