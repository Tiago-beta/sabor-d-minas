
import React, { useState, useEffect, useMemo } from 'react';
import { Venda, Bairro, MotoboyFechamentoOverride } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bike, ArrowLeft, RefreshCw, Plus, Trash2, Printer, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select components

export default function Motoboy() {
    const [vendas, setVendas] = useState([]);
    const [listaTodosBairros, setListaTodosBairros] = useState([]);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [bairrosData, setBairrosData] = useState([]);
    const [outrosGanhos, setOutrosGanhos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modoVisualizacao, setModoVisualizacao] = useState('semana-atual'); // 'semana-atual', 'semana-anterior', 'personalizado'
    const [mostrarCamposData, setMostrarCamposData] = useState(false);
    const [filtroEntregas, setFiltroEntregas] = useState('com'); // Default agora mostra somente bairros com entregas
    const [quantOverrides, setQuantOverrides] = useState({}); // For manual total edits
    const [overrideRecords, setOverrideRecords] = useState([]); // To store full override records from DB
    const [editandoQuant, setEditandoQuant] = useState(null); // { bairroNome: string }
    const [valorEditando, setValorEditando] = useState('');
    const [busca, setBusca] = useState(''); // New state for search term

    // Function to normalize text for accent-insensitive and case-insensitive search
    const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    useEffect(() => {
        carregarDados();
        definirPeriodoInicial();
    }, []);

    useEffect(() => {
        const loadPeriodData = async () => {
            if (!dataInicio || !dataFim) return;

            try {
                setLoading(true);
                const overrides = await MotoboyFechamentoOverride.filter({
                    data_inicio: dataInicio,
                    data_fim: dataFim,
                });
                setOverrideRecords(overrides);
                
                const newQuantOverrides = overrides.reduce((acc, o) => {
                    acc[o.bairro_nome] = o.quantidade_manual;
                    return acc;
                }, {});
                setQuantOverrides(newQuantOverrides);
                
                processarDados(); // Process data after overrides are loaded
            } catch (error) {
                console.error("Erro ao carregar dados do período:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPeriodData();
    }, [dataInicio, dataFim, vendas, listaTodosBairros]); // Dependencies updated to include vendas/listaTodosBairros for processarDados

    // Função para calcular início e fim da semana (Segunda a Domingo)
    const calcularSemana = (tipo) => {
        const hoje = new Date();
        // Adjust for Brazil's timezone if necessary for consistent date boundaries
        // For simplicity and to match `toLocaleDateString('en-CA')`, we'll work with local time.
        // If a specific timezone like 'America/Sao_Paulo' is critical for date math,
        // more complex logic involving Intl.DateTimeFormat or a library like `date-fns-tz` would be needed.

        let diaAtual = hoje.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

        let inicioSemana = new Date(hoje);
        let fimSemana = new Date(hoje);
        
        // Adjust diaAtual so Monday is 0 for easier calculation
        diaAtual = (diaAtual === 0) ? 6 : diaAtual - 1; // 0 for Mon, 1 for Tue, ..., 6 for Sun

        if (tipo === 'atual') {
            // Semana atual: da segunda-feira desta semana até hoje
            inicioSemana.setDate(hoje.getDate() - diaAtual);
            // fimSemana remains 'hoje'
        } else { // tipo === 'anterior'
            // Semana anterior: da segunda-feira passada até domingo passado
            inicioSemana.setDate(hoje.getDate() - diaAtual - 7);
            fimSemana.setDate(hoje.getDate() - diaAtual - 1); // Sunday of previous week
        }

        return {
            inicio: inicioSemana.toISOString().split('T')[0],
            fim: fimSemana.toISOString().split('T')[0]
        };
    };

    const definirPeriodoInicial = () => {
        const semanaAtual = calcularSemana('atual');
        setDataInicio(semanaAtual.inicio);
        setDataFim(semanaAtual.fim);
        setModoVisualizacao('semana-atual');
        setMostrarCamposData(false);
    };

    const handleModoChange = (modo) => {
        setModoVisualizacao(modo);
        setMostrarCamposData(modo === 'personalizado');
        
        if (modo === 'semana-atual') {
            const semana = calcularSemana('atual');
            setDataInicio(semana.inicio);
            setDataFim(semana.fim);
        } else if (modo === 'semana-anterior') {
            const semana = calcularSemana('anterior');
            setDataInicio(semana.inicio);
            setDataFim(semana.fim);
        }
        // Para 'personalizado', as datas são mantidas ou ajustadas pelo usuário.
        // processarDados() será acionado pelo useEffect que observa dataInicio/dataFim
    };

    const formatarPeriodoTitulo = () => {
        if (!dataInicio || !dataFim) return '';
        
        const inicio = new Date(dataInicio + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues with new Date()
        const fim = new Date(dataFim + 'T00:00:00');
        
        const formatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

        if (modoVisualizacao === 'semana-atual') {
            return `Semana Atual (${inicio.toLocaleDateString('pt-BR', formatOptions)} - ${fim.toLocaleDateString('pt-BR', formatOptions)})`;
        } else if (modoVisualizacao === 'semana-anterior') {
            return `Semana Anterior (${inicio.toLocaleDateString('pt-BR', formatOptions)} - ${fim.toLocaleDateString('pt-BR', formatOptions)})`;
        } else {
            return dataInicio === dataFim 
                ? `${inicio.toLocaleDateString('pt-BR', formatOptions)}`
                : `${inicio.toLocaleDateString('pt-BR', formatOptions)} até ${fim.toLocaleDateString('pt-BR', formatOptions)}`;
        }
    };

    const limparNomeBairro = (nome) => {
        if (!nome) return '';
        return nome
            .replace(/\s*-\s*|[\(\)]/g, ' ') // Remove hífens e parênteses, substituindo por espaço
            .replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i, '') // Remove números romanos no final
            .replace(/\s+\d+$/, '') // Remove números arábicos no final
            .replace(/\s+/g, ' ') // Junta múltiplos espaços em um só
            .trim(); // Remove espaços no início e fim
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [vendasList, bairrosList] = await Promise.all([
                Venda.list("-created_date", 3000),
                Bairro.list()
            ]);
            setVendas(vendasList || []);
            setListaTodosBairros(bairrosList || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    const processarDados = () => {
        if (!dataInicio || !dataFim) {
            setBairrosData([]); // Clear data if dates are not set
            return;
        }

        // Filtrar vendas do período E que NÃO sejam de entrega externa (agregado ou ifood)
        const vendasNoPeriodo = vendas.filter(v => {
            if (!v.created_date || !v.bairro || v.tipo_venda !== 'delivery') return false;
            
            // NOVA LÓGICA: Excluir vendas com entrega externa
            if (v.tipo_entrega_externa === 'agregado' || v.tipo_entrega_externa === 'ifood') {
                return false;
            }

            try {
                // Ensure comparison is robust. Using YYYY-MM-DD string comparison is generally safe.
                // It's crucial that v.created_date is consistently parsed to YYYY-MM-DD for comparison.
                // Assuming v.created_date is an ISO string like '2023-10-26T10:00:00Z'
                const vendaDate = new Date(v.created_date);
                // Convert to a YYYY-MM-DD string, considering local timezone effects if `dataInicio/Fim` are local.
                // For consistency with `dataInicio`/`dataFim` set by `toISOString().split('T')[0]`,
                // we should also use a similar method for `vendaDate`.
                const dataVendaFormatted = vendaDate.toLocaleDateString('en-CA'); // 'en-CA' gives YYYY-MM-DD regardless of locale

                return dataVendaFormatted >= dataInicio && dataVendaFormatted <= dataFim;
            } catch (error) {
                console.error("Erro ao processar data da venda:", v.id, v.created_date, error);
                return false;
            }
        });

        // 1. Contar entregas usando o nome do bairro JÁ LIMPO E separar entregas simples e duplas
        const contagemPorBairroLimpo = vendasNoPeriodo.reduce((acc, venda) => {
            const nomeLimpo = limparNomeBairro(venda.bairro);
            if (nomeLimpo) {
                if (!acc[nomeLimpo]) {
                    acc[nomeLimpo] = {
                        simples: 0,
                        duplas: 0,
                        total: 0
                    };
                }
                
                // CORREÇÃO: O valor a ser verificado é o subtotal dos itens, não o total da venda.
                // O total da venda inclui frete e descontos, o que pode levar a erros de cálculo.
                const valorDosProdutos = (venda.itens || []).reduce((subtotal, item) => subtotal + (item.subtotal || 0), 0);
                const taxaEntrega = parseFloat(venda.taxa_entrega) || 0;
                
                // REGRA CORRIGIDA: Se o valor dos produtos for maior que R$ 140, a taxa é dupla.
                // A taxa original deve ser maior que zero e menor ou igual a R$ 20.
                if (valorDosProdutos > 140 && taxaEntrega > 0 && taxaEntrega <= 20) {
                    acc[nomeLimpo].duplas += 1;
                } else {
                    acc[nomeLimpo].simples += 1;
                }
                acc[nomeLimpo].total = acc[nomeLimpo].simples + acc[nomeLimpo].duplas;
            }
            return acc;
        }, {});

        // 2. Criar uma estrutura de dados para os bairros, usando o nome limpo como chave
        const bairrosProcessados = {};

        // 3. Popular a estrutura com os bairros CADASTRADOS para pegar a taxa correta primeiro
        listaTodosBairros
            .filter(b => b.ativo)
            .forEach(bairroCadastrado => {
                const nomeLimpo = limparNomeBairro(bairroCadastrado.nome);
                if (nomeLimpo && !bairrosProcessados[nomeLimpo]) { // Adiciona apenas se não existir para evitar duplicatas
                    bairrosProcessados[nomeLimpo] = {
                        bairro: nomeLimpo,
                        cidade: bairroCadastrado.cidade || '',
                        quant: 0, // Total de entregas
                        entregas_simples: 0,
                        entregas_duplas: 0,
                        taxa: bairroCadastrado.taxa_entrega || 5.00,
                        // Preservar o ID do primeiro bairro encontrado para salvar a taxa
                        bairro_id_original: bairroCadastrado.id, 
                    };
                }
            });

        // 4. Atualizar as quantidades e adicionar bairros que não estavam na lista de cadastro
        Object.entries(contagemPorBairroLimpo).forEach(([nomeLimpo, contagem]) => {
            if (bairrosProcessados[nomeLimpo]) {
                // Se o bairro já existe (veio dos cadastrados), apenas atualiza as quantidades
                bairrosProcessados[nomeLimpo].quant = contagem.total;
                bairrosProcessados[nomeLimpo].entregas_simples = contagem.simples;
                bairrosProcessados[nomeLimpo].entregas_duplas = contagem.duplas;
            } else {
                // Se não existe, é um bairro que só apareceu nas vendas (não cadastrado formalmente)
                bairrosProcessados[nomeLimpo] = {
                    bairro: nomeLimpo,
                    cidade: '', // cidade desconhecida quando não cadastrado
                    quant: contagem.total,
                    entregas_simples: contagem.simples,
                    entregas_duplas: contagem.duplas,
                    taxa: 5.00, // Usa uma taxa padrão
                    bairro_id_original: null, // Não tem ID de cadastro
                };
            }
        });

        // 5. Converter o objeto de volta para um array e ordenar alfabeticamente
        const bairrosArrayFinal = Object.values(bairrosProcessados)
            .sort((a, b) => a.bairro.localeCompare(b.bairro));
        
        setBairrosData(bairrosArrayFinal);
    };

    const handleTaxaChange = (bairroNome, novaTaxa) => {
        setBairrosData(prev =>
            prev.map(b => (b.bairro === bairroNome ? { ...b, taxa: parseFloat(novaTaxa) || 0 } : b))
        );
    };

    const salvarTaxaBairro = async (bairroNome, novaTaxa) => {
        const taxaNumerica = parseFloat(novaTaxa) || 0;
        const bairrosParaAtualizar = listaTodosBairros.filter(b => limparNomeBairro(b.nome) === bairroNome);

        if (bairrosParaAtualizar.length > 0) {
            try {
                const updates = bairrosParaAtualizar.map(b => 
                    Bairro.update(b.id, { taxa_entrega: taxaNumerica })
                );
                await Promise.all(updates);
                // alert('Taxa atualizada com sucesso!'); // Optional feedback
                
                // Atualiza o estado local para garantir que a mudança persista na UI
                setListaTodosBairros(prevBairros =>
                    prevBairros.map(b => {
                        const found = bairrosParaAtualizar.find(bairroAtualizado => bairroAtualizado.id === b.id);
                        if (found) {
                            return { ...b, taxa_entrega: taxaNumerica };
                        }
                        return b;
                    })
                );
            } catch (error) {
                console.error("Erro ao salvar taxa:", error);
                alert("Falha ao salvar a nova taxa. A página será recarregada.");
                carregarDados();
            }
        }
    };
    
    const handleSalvarQuantOverride = async (bairroNome) => {
        const novaQuant = parseInt(valorEditando, 10);
        if (isNaN(novaQuant)) {
            setEditandoQuant(null);
            return;
        }

        // Optimistic UI update
        setQuantOverrides(prev => ({
            ...prev,
            [bairroNome]: novaQuant,
        }));
        setEditandoQuant(null);

        // Find the record *before* the try block to have it available in the catch block
        const originalRecord = overrideRecords.find(o =>
            o.bairro_nome === bairroNome &&
            o.data_inicio === dataInicio &&
            o.data_fim === dataFim
        );

        try {
            let updatedOrNewRecord;
            if (originalRecord) {
                // Update existing override
                updatedOrNewRecord = await MotoboyFechamentoOverride.update(originalRecord.id, { quantidade_manual: novaQuant });
                // Update the full record in state to ensure consistency
                setOverrideRecords(prev => prev.map(o => o.id === updatedOrNewRecord.id ? updatedOrNewRecord : o));
            } else {
                // Create new override
                updatedOrNewRecord = await MotoboyFechamentoOverride.create({
                    data_inicio: dataInicio,
                    data_fim: dataFim,
                    bairro_nome: bairroNome,
                    quantidade_manual: novaQuant,
                });
                setOverrideRecords(prev => [...prev, updatedOrNewRecord]);
            }
        } catch (error) {
            console.error("Erro ao salvar override de quantidade:", error);
            alert("Falha ao salvar a quantidade. Tente novamente.");
            // Revert optimistic update if save fails
            setQuantOverrides(prev => {
                const newPrev = { ...prev };
                if (originalRecord) {
                    newPrev[bairroNome] = originalRecord.quantidade_manual;
                } else {
                    delete newPrev[bairroNome];
                }
                return newPrev;
            });
        }
    };

    const displayedBairros = useMemo(() => {
        if (!bairrosData) return [];

        let filtered = [];

        // Apply 'com/sem' filter first
        switch (filtroEntregas) {
            case 'com':
                filtered = bairrosData.filter(b => {
                    const quantFinal = quantOverrides[b.bairro] !== undefined ? quantOverrides[b.bairro] : b.quant;
                    return quantFinal > 0;
                });
                break;
            case 'sem':
                filtered = bairrosData.filter(b => {
                    const quantFinal = quantOverrides[b.bairro] !== undefined ? quantOverrides[b.bairro] : b.quant;
                    return !quantFinal || quantFinal === 0;
                });
                break;
            case 'todos':
            default:
                filtered = bairrosData;
                break;
        }

        // Apply text search filter
        if (busca) {
            const buscaNormalizada = normalizeText(busca);
            filtered = filtered.filter(b =>
                (b.bairro && normalizeText(b.bairro).includes(buscaNormalizada))
            );
        }
        return filtered;
    }, [bairrosData, filtroEntregas, quantOverrides, busca]);

    const { totalEntregasQuant, totalEntregasValor, totalOutrosValor, totalGeral, totalEntregasDuplas } = useMemo(() => {
        const totalEntregasValor = bairrosData.reduce((acc, b) => {
            if (quantOverrides[b.bairro] !== undefined) {
                // Se a quantidade foi editada, usa a taxa x quantidade editada
                return acc + (b.taxa * quantOverrides[b.bairro]);
            }
            // Senão, usa a lógica de entregas simples e duplas
            const valorSimples = b.taxa * (b.entregas_simples || 0);
            const valorDuplo = b.taxa * 2 * (b.entregas_duplas || 0);
            return acc + valorSimples + valorDuplo;
        }, 0);

        const totalEntregasQuant = bairrosData.reduce((acc, b) => {
            const quantFinal = quantOverrides[b.bairro] !== undefined ? quantOverrides[b.bairro] : (b.quant || 0);
            return acc + quantFinal;
        }, 0);

        const totalEntregasDuplas = bairrosData.reduce((acc, b) => {
            // Se a quantidade foi editada, não contamos as duplas para evitar inconsistência
            if (quantOverrides[b.bairro] !== undefined) {
                return acc;
            }
            return acc + (b.entregas_duplas || 0);
        }, 0);
        
        const totalOutrosValor = outrosGanhos.reduce((acc, item) => acc + (item.quantidade * item.valor), 0);
        const totalGeral = totalEntregasValor + totalOutrosValor;
        return { totalEntregasQuant, totalEntregasValor, totalOutrosValor, totalGeral, totalEntregasDuplas };
    }, [bairrosData, outrosGanhos, quantOverrides]);

    const adicionarOutroGanho = () => {
        setOutrosGanhos([...outrosGanhos, { id: Date.now(), descricao: '', quantidade: 1, valor: 0 }]);
    };

    const atualizarOutroGanho = (id, campo, valor) => {
        setOutrosGanhos(prev => 
            prev.map(item => 
                item.id === id ? { ...item, [campo]: valor } : item
            )
        );
    };

    const removerOutroGanho = (id) => {
        setOutrosGanhos(prev => prev.filter(item => item.id !== id));
    };

    const imprimirRecibo = () => {
        const bairrosComEntregas = bairrosData.filter(b => {
            const quantFinal = quantOverrides[b.bairro] !== undefined ? quantOverrides[b.bairro] : b.quant;
            return quantFinal > 0;
        });
        
        if (bairrosComEntregas.length === 0 && outrosGanhos.length === 0) {
            alert("Nenhuma entrega ou ganho adicional para imprimir.");
            return;
        }

        const periodoTexto = formatarPeriodoTitulo();

        const headerHTML = `
            <div style="text-align: center; font-family: monospace; font-size: 14px; margin-bottom: 20px;">
                <h2 style="margin: 5px 0;">PÃO D'QUEIJO & CIA</h2>
                <p style="margin: 2px 0;">RECIBO DE ENTREGAS - MOTOBOY</p>
                <p style="margin: 2px 0;">${periodoTexto}</p>
                <hr style="border: 1px solid #000; margin: 10px 0;">
            </div>
        `;

        const entregasHTML = bairrosComEntregas.length > 0 ? `
            <div style="font-family: monospace; font-size: 12px; margin-bottom: 15px;">
                <h3 style="margin: 10px 0;">ENTREGAS POR BAIRRO:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left; padding: 5px;">Bairro</th>
                            <th style="text-align: left; padding: 5px;">Cidade</th>
                            <th style="text-align: center; padding: 5px;">Taxa</th>
                            <th style="text-align: center; padding: 5px;">Qtd</th>
                            <th style="text-align: right; padding: 5px;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bairrosComEntregas.map(b => {
                            const quantFinal = quantOverrides[b.bairro] !== undefined ? quantOverrides[b.bairro] : b.quant;
                            let valorTotalBairro;
                            if (quantOverrides[b.bairro] !== undefined) {
                                valorTotalBairro = b.taxa * quantFinal; // Usa quantidade editada manualmente
                            } else {
                                const valorSimples = b.taxa * (b.entregas_simples || 0);
                                const valorDuplo = b.taxa * 2 * (b.entregas_duplas || 0);
                                valorTotalBairro = valorSimples + valorDuplo;
                            }
                            return `
                            <tr style="border-bottom: 1px dotted #ccc;">
                                <td style="padding: 5px;">${b.bairro}</td>
                                <td style="padding: 5px;">${b.cidade || '-'}</td>
                                <td style="text-align: center; padding: 5px;">R$ ${b.taxa.toFixed(2)}</td>
                                <td style="text-align: center; padding: 5px;">${quantFinal}</td>
                                <td style="text-align: right; padding: 5px;">R$ ${valorTotalBairro.toFixed(2)}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 10px;">
                    <p style="margin: 2px 0; font-weight: bold;">Total Geral Entregas: ${totalEntregasQuant} - R$ ${totalEntregasValor.toFixed(2)}</p>
                </div>
            </div>
        ` : '';

        const outrosHTML = outrosGanhos.length > 0 ? `
            <div style="font-family: monospace; font-size: 12px; margin-bottom: 15px;">
                <h3 style="margin: 10px 0;">OUTROS GANHOS:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #000;">
                            <th style="text-align: left; padding: 5px;">Descrição</th>
                            <th style="text-align: center; padding: 5px;">Qtd</th>
                            <th style="text-align: right; padding: 5px;">Valor Unit.</th>
                            <th style="text-align: right; padding: 5px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${outrosGanhos.map(item => `
                            <tr style="border-bottom: 1px dotted #ccc;">
                                <td style="padding: 5px;">${item.descricao || 'N/D'}</td>
                                <td style="text-align: center; padding: 5px;">${item.quantidade}</td>
                                <td style="text-align: right; padding: 5px;">R$ ${item.valor.toFixed(2)}</td>
                                <td style="text-align: right; padding: 5px;">R$ ${(item.quantidade * item.valor).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 10px; font-weight: bold;">
                    Total Outros: R$ ${totalOutrosValor.toFixed(2)}
                </div>
            </div>
        ` : '';

        const footerHTML = `
            <div style="font-family: monospace; font-size: 14px; border-top: 2px solid #000; padding-top: 10px; text-align: center;">
                <h3 style="margin: 5px 0;">TOTAL GERAL A RECEBER: R$ ${totalGeral.toFixed(2)}</h3>
                <br><br>
                <div style="text-align: left;">
                    <p>Data: ________________</p>
                    <p>Assinatura Motoboy: _____________________________</p>
                    <p>Assinatura Responsável: _________________________</p>
                </div>
            </div>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head><title>Recibo Motoboy</title></head>
                <body>
                    ${headerHTML}
                    ${entregasHTML}
                    ${outrosHTML}
                    ${footerHTML}
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

    const formatarMoeda = (valor) => `R$ ${(Number(valor) || 0).toFixed(2)}`;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Bike className="w-6 h-6" />
                        Fechamento de Motoboy
                    </h1>
                    <div className="flex gap-4 items-center">
                        <Button onClick={carregarDados} variant="outline" size="icon" title="Atualizar Dados">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button onClick={imprimirRecibo} variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir Recibo
                        </Button>
                        <Link to={createPageUrl("Gerencia")}>
                            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                        </Link>
                    </div>
                </div>

                {/* Navegação por Período */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-2">
                                <Button
                                    variant={modoVisualizacao === 'semana-atual' ? 'default' : 'outline'}
                                    onClick={() => handleModoChange('semana-atual')}
                                    className={modoVisualizacao === 'semana-atual' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                                >
                                    Semana Atual
                                </Button>
                                <Button
                                    variant={modoVisualizacao === 'semana-anterior' ? 'default' : 'outline'}
                                    onClick={() => handleModoChange('semana-anterior')}
                                    className={modoVisualizacao === 'semana-anterior' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                >
                                    Semana Anterior
                                </Button>
                                <Button
                                    variant={modoVisualizacao === 'personalizado' ? 'default' : 'outline'}
                                    onClick={() => handleModoChange('personalizado')}
                                    className={modoVisualizacao === 'personalizado' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                                >
                                    Selecionar Período
                                </Button>
                            </div>
                            
                            <div className="text-lg font-semibold text-gray-700">
                                {formatarPeriodoTitulo()}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t">
                            {mostrarCamposData && (
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="date"
                                        value={dataInicio}
                                        onChange={(e) => setDataInicio(e.target.value)}
                                        className="w-40"
                                    />
                                    <span className="text-gray-500">até</span>
                                    <Input
                                        type="date"
                                        value={dataFim}
                                        onChange={(e) => setDataFim(e.target.value)}
                                        className="w-40"
                                    />
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <label htmlFor="filtro-entregas" className="text-sm font-medium">Filtro:</label>
                                <Select value={filtroEntregas} onValueChange={setFiltroEntregas} id="filtro-entregas">
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Mostrar todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos os Bairros</SelectItem>
                                        <SelectItem value="com">Com Entregas</SelectItem>
                                        <SelectItem value="sem">Sem Entregas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                type="text"
                                placeholder="Buscar bairro..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="w-48"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Taxa</TableHead>
                                    <TableHead>Bairros</TableHead>
                                    <TableHead>Cidade</TableHead>
                                    <TableHead className="w-20 text-center">Qtd.</TableHead>
                                    <TableHead className="w-32 text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && <TableRow><TableCell colSpan={4} className="text-center h-24">Carregando...</TableCell></TableRow>}
                                {!loading && displayedBairros.map(({ bairro, taxa, quant, entregas_simples, entregas_duplas, cidade }) => {
                                    const quantFinal = quantOverrides[bairro] !== undefined ? quantOverrides[bairro] : quant;
                                    
                                    let valorTotal;
                                    if (quantOverrides[bairro] !== undefined) {
                                        valorTotal = taxa * quantFinal; // Use quantFinal here
                                    } else {
                                        const valorSimples = taxa * (entregas_simples || 0);
                                        const valorDuplo = taxa * 2 * (entregas_duplas || 0);
                                        valorTotal = valorSimples + valorDuplo;
                                    }
                                    
                                    const isEditingQuant = editandoQuant === bairro;

                                    return (
                                        <TableRow key={bairro}>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={taxa}
                                                    onChange={(e) => handleTaxaChange(bairro, e.target.value)}
                                                    onBlur={(e) => salvarTaxaBairro(bairro, e.target.value)}
                                                    className="font-bold w-16"
                                                />
                                            </TableCell>
                                            <TableCell>{bairro}</TableCell>
                                            <TableCell>{cidade || '-'}</TableCell>
                                            <TableCell className="text-center font-medium">
                                                {isEditingQuant ? (
                                                     <Input
                                                        type="number"
                                                        value={valorEditando}
                                                        onChange={(e) => setValorEditando(e.target.value)}
                                                        onBlur={() => handleSalvarQuantOverride(bairro)}
                                                        onKeyPress={(e) => e.key === 'Enter' && handleSalvarQuantOverride(bairro)}
                                                        autoFocus
                                                        className="w-20 h-8 text-center"
                                                    />
                                                ) : (
                                                    <span
                                                        className="cursor-pointer hover:bg-yellow-100 p-1 rounded"
                                                        onClick={() => {
                                                            setEditandoQuant(bairro);
                                                            setValorEditando((quantFinal || 0).toString());
                                                        }}
                                                    >
                                                        {quantFinal || 0}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatarMoeda(valorTotal)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {!loading && displayedBairros.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            Nenhum bairro encontrado para o filtro selecionado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-medium">Total Entregas:</span>
                            <div className="flex gap-8">
                                <span>{totalEntregasQuant}</span>
                                <span className="font-bold w-32 text-right">{formatarMoeda(totalEntregasValor)}</span>
                            </div>
                        </div>
                        
                        {totalEntregasDuplas > 0 && (
                            <div className="flex justify-between items-center text-lg text-green-600 bg-green-50 px-4 py-2 rounded">
                                <span className="font-medium">Entregas com Frete Duplo:</span>
                                <span className="font-bold">{totalEntregasDuplas}</span>
                            </div>
                        )}
                        
                        {/* Seção de Outros Ganhos */}
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-medium text-lg">Outros Ganhos:</span>
                                <Button onClick={adicionarOutroGanho} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Adicionar
                                </Button>
                            </div>
                            
                            {outrosGanhos.map((item) => (
                                <div key={item.id} className="flex gap-2 items-center mb-2 p-3 bg-gray-100 rounded">
                                    <Input
                                        placeholder="Descrição (ex: Combustível, Comissão...)"
                                        value={item.descricao}
                                        onChange={(e) => atualizarOutroGanho(item.id, 'descricao', e.target.value)}
                                        className="flex-grow"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Qtd"
                                        value={item.quantidade}
                                        onChange={(e) => atualizarOutroGanho(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                                        className="w-20"
                                    />
                                    <span className="text-gray-500">x</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Valor"
                                        value={item.valor}
                                        onChange={(e) => atualizarOutroGanho(item.id, 'valor', parseFloat(e.target.value) || 0)}
                                        className="w-24"
                                    />
                                    <span className="font-bold w-24 text-right">{formatarMoeda(item.quantidade * item.valor)}</span>
                                    <Button 
                                        onClick={() => removerOutroGanho(item.id)} 
                                        size="sm" 
                                        variant="ghost"
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            
                            <div className="flex justify-between items-center text-lg mt-4">
                                <span className="font-medium">Total Outros:</span>
                                <span className="font-bold w-32 text-right">{formatarMoeda(totalOutrosValor)}</span>
                            </div>
                        </div>
                        
                        <div className="border-t pt-4 mt-4 flex justify-between items-center text-2xl font-bold">
                            <span>TOTAL A PAGAR:</span>
                            <span className="text-green-600">{formatarMoeda(totalGeral)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Placeholder for ModalOrganizarEnderecos component
// This component would typically fetch and display a list of addresses
// for the user to select. For demonstration, it provides mock data.
function ModalOrganizarEnderecos({ onClose, onEnderecoSelecionado }) {
  const mockAddresses = [
    { logradouro: "Rua das Flores, 123", bairro: "Centro", localidade: "São Paulo", cep: "01000-000" },
    { logradouro: "Av. Brasil, 4567", bairro: "Jardim América", localidade: "Rio de Janeiro", cep: "20000-000" },
    { logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", cep: "01001-000" },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organizar Endereços</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <p className="text-sm text-gray-600">Selecione um endereço para preencher os campos:</p>
          {mockAddresses.length > 0 ? (
            mockAddresses.map((addr, index) => (
              <div key={index} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md shadow-sm bg-white">
                <span className="text-sm font-medium mb-2 sm:mb-0">
                  {addr.logradouro}, {addr.bairro} - {addr.localidade} ({addr.cep})
                </span>
                <Button onClick={() => onEnderecoSelecionado(addr)} size="sm">Selecionar</Button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">Nenhum endereço encontrado para organização.</p>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function ModalEditarCliente({ cliente, onClose, onSave }) {
  const [dadosCliente, setDadosCliente] = useState({
    codigo: cliente?.codigo || '',
    nome: cliente?.nome || '',
    telefone: cliente?.telefone || '',
    rua: cliente?.rua || '',
    numero: cliente?.numero || '',
    complemento: cliente?.complemento || '',
    bairro: cliente?.bairro || '',
    cidade: cliente?.cidade || '',
    cep: cliente?.cep || ''
  });
  const [showOrganizarEnderecos, setShowOrganizarEnderecos] = useState(false);

  const handleSave = () => {
    if (!dadosCliente.codigo || !dadosCliente.nome) {
      alert('Por favor, preencha pelo menos o código e nome do cliente.');
      return;
    }
    onSave(dadosCliente);
  };

  const handleEnderecoSelecionado = (endereco) => {
    setDadosCliente(prev => ({
      ...prev,
      rua: endereco.logradouro || '',
      bairro: endereco.bairro || '',
      cidade: endereco.localidade || '',
      cep: endereco.cep || ''
    }));
    setShowOrganizarEnderecos(false);
  };

  if (showOrganizarEnderecos) {
    return (
      <ModalOrganizarEnderecos
        onClose={() => setShowOrganizarEnderecos(false)}
        onEnderecoSelecionado={handleEnderecoSelecionado}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <Input
              value={dadosCliente.codigo}
              onChange={(e) => setDadosCliente(prev => ({ ...prev, codigo: e.target.value }))}
              placeholder="Código do cliente"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={dadosCliente.nome}
              onChange={(e) => setDadosCliente(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Telefone</label>
            <Input
              value={dadosCliente.telefone}
              onChange={(e) => setDadosCliente(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="Telefone de contato"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Rua</label>
            <div className="flex gap-2">
              <Input
                value={dadosCliente.rua}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, rua: e.target.value }))}
                placeholder="Nome da rua"
                className="flex-1"
              />
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowOrganizarEnderecos(true)}
                className="px-3"
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Número</label>
              <Input
                value={dadosCliente.numero}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, numero: e.target.value }))}
                placeholder="Número"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Complemento</label>
              <Input
                value={dadosCliente.complemento}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, complemento: e.target.value }))}
                placeholder="Complemento"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Bairro</label>
              <Input
                value={dadosCliente.bairro}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, bairro: e.target.value }))}
                placeholder="Bairro"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <Input
                value={dadosCliente.cidade}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="Cidade"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">CEP</label>
            <Input
              value={dadosCliente.cep}
              onChange={(e) => setDadosCliente(prev => ({ ...prev, cep: e.target.value }))}
              placeholder="CEP"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
