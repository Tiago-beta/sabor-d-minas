
import React, { useState, useEffect } from 'react';
import { User, PontoFuncionario, Adiantamento, Feriado } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Briefcase, Save, PlusCircle, Calendar, Clock, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ModalAdiantamento from '@/components/rh/ModalAdiantamento';

export default function RH() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [pontos, setPontos] = useState([]);
    const [adiantamentos, setAdiantamentos] = useState([]);
    const [feriados, setFeriados] = useState([]);
    const [folha, setFolha] = useState([]); // Renamed from folhaPagamento
    
    const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1); // Renamed from mes
    const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear()); // Renamed from ano
    
    const [loading, setLoading] = useState(false);
    const [editando, setEditando] = useState({}); // Retained for inline editing
    
    const [modalAberto, setModalAberto] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

    useEffect(() => {
        carregarDados();
    }, [mesFiltro, anoFiltro]); // Changed dependencies

    const carregarDados = async () => {
        setLoading(true);
        try {
            const [usersList, pontosList, adiantamentosList, feriadosList] = await Promise.all([
                User.list(),
                PontoFuncionario.list(),
                Adiantamento.list(),
                Feriado.filter({ ativo: true }) // Fetch only active holidays
            ]);
            
            // Retain original filtering of managers
            const nonManagerUsers = usersList.filter(u => !u.is_gerente);
            
            setFuncionarios(nonManagerUsers);
            setPontos(pontosList);
            setAdiantamentos(adiantamentosList);
            setFeriados(feriadosList);

            // Pass fetched data directly to the calculation function
            calcularFolhaPagamento(nonManagerUsers, pontosList, adiantamentosList, feriadosList);

        } catch (error) {
            console.error('Erro ao carregar dados de RH:', error);
        } finally {
            setLoading(false);
        }
    };

    // Função para calcular as horas de um conjunto de pontos
    const calcularTotalHoras = (pontosDoMes) => {
        // Agrupa os pontos por dia para evitar cálculo entre dias diferentes
        const pontosPorDia = pontosDoMes.reduce((acc, ponto) => {
            (acc[ponto.data] = acc[ponto.data] || []).push(ponto);
            return acc;
        }, {});
    
        let totalMinutosMes = 0;
    
        // Itera sobre cada dia que teve registro de ponto
        for (const dia in pontosPorDia) {
            let totalMinutosDia = 0;
            let entrada = null;
            // Ordena os pontos do dia por hora
            const pontosDoDiaOrdenados = pontosPorDia[dia].sort((a, b) => a.hora.localeCompare(b.hora));
    
            pontosDoDiaOrdenados.forEach(ponto => {
                if (ponto.tipo === 'entrada') {
                    // Considera a primeira entrada de um par
                    if (!entrada) {
                        entrada = ponto.hora;
                    }
                } else if (ponto.tipo === 'saida' && entrada) {
                    // Calcula a duração em minutos e soma ao total do dia
                    const [hE, mE] = entrada.split(':').map(Number);
                    const [hS, mS] = ponto.hora.split(':').map(Number);
                    const minutosEntrada = hE * 60 + mE;
                    const minutosSaida = hS * 60 + mS;
                    
                    if (minutosSaida > minutosEntrada) {
                        totalMinutosDia += (minutosSaida - minutosEntrada);
                    }
                    
                    entrada = null; // Reseta para o próximo par de entrada/saída
                }
            });
            totalMinutosMes += totalMinutosDia;
        }
    
        return totalMinutosMes / 60; // Retorna o total de horas do mês
    };

    // Function to get calendar information for DSR calculation
    const getCalendarInfo = (ano, mes, feriadosList) => {
        const diasNoMes = new Date(ano, mes, 0).getDate(); // Last day of the month
        let diasUteis = 0;
        const feriadosDatas = feriadosList.map(f => f.data); // Array of 'YYYY-MM-DD' strings

        // Use a Set to count unique rest days (Sundays + holidays) to avoid double-counting
        const restDaysSet = new Set(); 

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtual = new Date(ano, mes - 1, dia); // Month is 0-indexed in Date object
            const diaSemana = dataAtual.getDay(); // 0 for Sunday, 6 for Saturday
            const dataString = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isFeriado = feriadosDatas.includes(dataString);

            if (diaSemana >= 1 && diaSemana <= 5 && !isFeriado) { // Monday to Friday and not a holiday
                diasUteis++;
            }
            
            if (diaSemana === 0 || isFeriado) { // If it's a Sunday or any holiday
                restDaysSet.add(dataString);
            }
        }
        const domingosEFeriados = restDaysSet.size;

        return { diasUteis, domingosEFeriados };
    };

    // Function to group point entries by custom week number (as per outline)
    const groupPointsByWeek = (pontosDoMes) => {
        const semanas = {};
        pontosDoMes.forEach(ponto => {
            const data = new Date(ponto.data + 'T00:00:00');
            // Outline's week number calculation (not standard ISO week)
            const primeiroDiaAno = new Date(data.getFullYear(), 0, 1);
            const diasPassados = Math.floor((data - primeiroDiaAno) / (24 * 60 * 60 * 1000));
            const numeroSemana = Math.ceil((data.getDay() + 1 + diasPassados) / 7);
            const chaveSemana = `${data.getFullYear()}-${numeroSemana}`; // Unique key for the week

            if (!semanas[chaveSemana]) {
                semanas[chaveSemana] = [];
            }
            semanas[chaveSemana].push(ponto);
        });
        // Return an array of arrays, where each inner array is a week's points
        return Object.values(semanas);
    };

    const calcularFolhaPagamento = (users, allPontos, allAdiantamentos, allFeriados) => {
        const { diasUteis, domingosEFeriados } = getCalendarInfo(anoFiltro, mesFiltro, allFeriados);

        // Sanity checks for month's days for debugging
        if (diasUteis < 15) console.warn(`Alerta de Sanidade: Mês com apenas ${diasUteis} dias úteis em ${mesFiltro}/${anoFiltro}.`);
        if (domingosEFeriados < 4 || domingosEFeriados > 10) console.warn(`Alerta de Sanidade: Mês com ${domingosEFeriados} domingos/feriados em ${mesFiltro}/${anoFiltro}.`);

        const folhaCalculada = users.map(func => {
            const valorHora = func.valor_hora || 0;
            const prefixoData = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}`;

            const pontosDoFuncionario = allPontos.filter(p => p.funcionario_id === func.id && p.data.startsWith(prefixoData));
            
            const horasTrabalhadasMes = calcularTotalHoras(pontosDoFuncionario);
            
            // Handle cases where no hours are worked and no valor_hora is set
            if (horasTrabalhadasMes === 0 && valorHora === 0) {
                return {
                    ...func,
                    horasTrabalhadas: 0, horasNormais: 0, horasExtras: 0, horasEmFeriados: 0,
                    salarioHorasNormais: 0, salarioHorasExtras: 0, salarioHorasFeriados: 0,
                    salarioBruto: 0, dsr: 0, salarioComDsr: 0,
                    totalAdiantamentos: 0, totalBonus: 0, totalDescontos: 0, salarioLiquido: 0,
                    diasTrabalhados: 0
                };
            }
            
            const salarioBase = horasTrabalhadasMes * valorHora;
            let dsr = 0;

            const semanas = groupPointsByWeek(pontosDoFuncionario);

            // DSR Calculation logic as specified in the outline
            if (semanas.length > 0) { // Weekly Method (Preferential)
                let dsrTotalSemanal = 0;
                semanas.forEach(semana => {
                    if (semana.length > 0) {
                        const horasSemana = calcularTotalHoras(semana);
                        const diasTrabalhadosSemana = new Set(semana.map(p => p.data)).size;
                        
                        if (diasTrabalhadosSemana > 0) {
                            const dsrSemanaHoras = horasSemana / diasTrabalhadosSemana; // Average hours per working day in the week
                            const dsrSemanaValor = dsrSemanaHoras * valorHora; // Average daily salary in the week
                            dsrTotalSemanal += dsrSemanaValor; // Summing these average daily salaries
                        }
                    }
                });
                dsr = dsrTotalSemanal;
            } else { // Monthly Method (Fallback if no weekly data points)
                if (diasUteis > 0) {
                    dsr = (salarioBase / diasUteis) * domingosEFeriados;
                }
            }

            // Sanity validation for DSR value
            const dsrRatio = salarioBase > 0 ? dsr / salarioBase : 0;
            if (dsrRatio > 0.35) { // If DSR is more than 35% of base salary, it might indicate an issue
                console.warn(`Alerta DSR alto para ${func.operador_nome} (${mesFiltro}/${anoFiltro}): ${(dsrRatio * 100).toFixed(2)}% do salário base. Verifique os insumos.`);
            }

            const adiantamentosFunc = allAdiantamentos.filter(a => a.funcionario_id === func.id && a.data.startsWith(prefixoData));
            const totalBonus = adiantamentosFunc.filter(a => a.tipo === 'bonus').reduce((acc, val) => acc + val.valor, 0);
            const totalAdiantamentos = adiantamentosFunc.filter(a => a.tipo === 'adiantamento').reduce((acc, val) => acc + val.valor, 0);
            const totalDescontos = adiantamentosFunc.filter(a => a.tipo === 'desconto').reduce((acc, val) => acc + val.valor, 0);

            // As per outline, hours extras and feriados are zeroed out for this DSR calculation context
            const horasNormais = horasTrabalhadasMes; 
            const horasExtras = 0;
            const horasEmFeriados = 0;
            
            const salarioHorasNormais = salarioBase;
            const salarioHorasExtras = 0;
            const salarioHorasFeriados = 0;
            const salarioBruto = salarioHorasNormais + salarioHorasExtras + salarioHorasFeriados;

            const salarioComDsr = salarioBruto + dsr; // Total remuneration before adiantamentos/deductions

            const salarioLiquido = salarioComDsr + totalBonus - totalAdiantamentos - totalDescontos;
            
            return {
                ...func,
                horasTrabalhadas: horasTrabalhadasMes,
                horasNormais,
                horasExtras,
                horasEmFeriados,
                salarioHorasNormais,
                salarioHorasExtras,
                salarioHorasFeriados,
                salarioBruto,
                dsr,
                salarioComDsr,
                totalAdiantamentos,
                totalBonus,
                totalDescontos,
                salarioLiquido,
                diasTrabalhados: new Set(pontosDoFuncionario.map(p => p.data)).size // Number of unique days worked
            };
        });
        setFolha(folhaCalculada);
    };

    // Handler for changes in inline editable fields (cargo, valor_hora)
    const handleEditChange = (id, campo, valor) => {
        setEditando(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
    };

    // Handler for saving inline editable fields
    const handleSave = async (id) => {
        const dadosParaSalvar = editando[id];
        if (!dadosParaSalvar) return; // No pending edits for this ID

        try {
            await User.update(id, {
                valor_hora: parseFloat(dadosParaSalvar.valor_hora) || 0,
                cargo: dadosParaSalvar.cargo || ''
            });
            alert('Dados do funcionário atualizados!');
            setEditando(prev => {
                const novoEditando = { ...prev };
                delete novoEditando[id]; // Clear pending edits for this ID
                return novoEditando;
            });
            carregarDados(); // Reload data to reflect changes in payroll
        } catch (error) {
            console.error('Erro ao salvar dados do funcionário:', error);
            alert('Erro ao salvar.');
        }
    };
    
    // Handler for opening the adiantamento modal
    const handleOpenModal = (func) => {
        setFuncionarioSelecionado(func);
        setModalAberto(true);
    };

    // Handler for saving a new adiantamento/bonus/desconto
    const handleSaveAdiantamento = async (dados) => {
        try {
            await Adiantamento.create(dados);
            alert('Lançamento salvo com sucesso!');
            setModalAberto(false);
            carregarDados(); // Reload data to reflect new adiantamento in payroll
        } catch (error) {
            console.error('Erro ao salvar adiantamento:', error);
            alert('Erro ao salvar lançamento.');
        }
    };

    const handleImprimirHolerite = (func) => {
        const totalVencimentos = (func.salarioHorasNormais || 0) + (func.dsr || 0) + (func.totalBonus || 0);
        const totalDescontosValor = (func.totalAdiantamentos || 0) + (func.totalDescontos || 0);
        
        const prefixoData = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}`;
        const pontosDoFuncionario = pontos.filter(p => p.funcionario_id === func.id && p.data.startsWith(prefixoData));
        const adiantamentosDoFuncionario = adiantamentos.filter(a => a.funcionario_id === func.id && a.data.startsWith(prefixoData));

        const diasNoMes = new Date(anoFiltro, mesFiltro, 0).getDate();
        let logDiarioHtml = '';

        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtual = `${prefixoData}-${String(dia).padStart(2, '0')}`;
            
            const ocorrenciaDoDia = adiantamentosDoFuncionario.find(a => a.data === dataAtual && !['adiantamento', 'bonus', 'desconto'].includes(a.tipo));
            const pontosDoDia = pontosDoFuncionario.filter(p => p.data === dataAtual).sort((a,b) => a.hora.localeCompare(b.hora));

            let linha = `<tr><td>${dataAtual.split('-').reverse().join('/')}</td><td style="text-align: left; padding-left: 10px;">`;

            if (ocorrenciaDoDia) {
                let textoOcorrencia = ocorrenciaDoDia.tipo.toUpperCase().replace(/_/g, ' '); // Use regex for global replacement
                if (ocorrenciaDoDia.descricao) {
                    textoOcorrencia += ` - ${ocorrenciaDoDia.descricao}`;
                }
                linha += `<strong>${textoOcorrencia}</strong>`;
            } else if (pontosDoDia.length > 0) {
                const registros = pontosDoDia.map(p => `${p.tipo.slice(0,3)}. ${p.hora.slice(0,5)}`).join(' &nbsp; | &nbsp; ');
                linha += registros;
            } else {
                linha += ``; // Deixa em branco se não houver nada
            }
            
            linha += `</td></tr>`;
            logDiarioHtml += linha;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Holerite - ${func.operador_nome}</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        body { 
                            font-family: 'Courier New', Courier, monospace; 
                            font-size: 9pt; /* Reduced font size */
                            background-color: #fff; 
                            color: #000;
                            line-height: 1.2; /* Adjusted line height */
                        }
                        .holerite { border: 1px solid #000; padding: 4px; width: 100%; }
                        table { width: 100%; border-collapse: collapse; }
                        td, th { padding: 2px; } /* Reduced padding */
                        .header-table td { border: 1px solid #000; vertical-align: top; }
                        .header-table .company-info { font-size: 8pt; } /* Reduced font size */
                        .header-table .receipt-title { text-align: center; }
                        .employee-table td { border: 1px solid #000; }
                        .items-table { margin-top: 4px; }
                        .items-table th { border: 1px solid #000; background-color: #f2f2f2; font-weight: normal; font-size: 8pt;}
                        .items-table td { border: 1px solid #000; vertical-align: top; height: 14px; }
                        .items-table .col-cod { width: 8%; text-align: center; }
                        .items-table .col-desc { width: 42%; }
                        .items-table .col-ref { width: 15%; text-align: right; }
                        .items-table .col-prov, .items-table .col-desc-val { width: 17.5%; text-align: right; }
                        .footer-table { margin-top: 4px; }
                        .footer-table td { border: 1px solid #000; }
                        .totals-box { text-align: right; font-size: 7pt; } /* Reduced font size */
                        .totals-box span { display: block; }
                        .signature-section { display: flex; justify-content: space-between; margin-top: 4px; }
                        .declaration { font-size: 7pt; width: 80%; } /* Reduced font size */
                        .signature-line { border-top: 1px solid #000; margin-top: 25px; text-align: center; font-size: 7pt; }
                        .label { font-size: 6pt; color: #555; } /* Reduced font size */
                        .value { font-weight: bold; }
                        .log-table { page-break-inside: avoid; border: 1px solid #000; margin-top: 15px; font-size: 8pt; } /* Reduced font size and margin */
                        .log-table th, .log-table td { border: 1px solid #ccc; text-align: center; padding: 3px; }
                        .log-table th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <div class="holerite">
                        <table class="header-table">
                            <tr>
                                <td class="company-info" style="width: 70%;">
                                    <span class="label">Empregador</span><br>
                                    <span class="value">PÃO D'QUEIJO & CIA</span><br>
                                    <span class="label">Endereço</span><br>
                                    <span class="value">Rua Inajá, 18, Jd Mirante - Várzea Paulista - SP</span><br>
                                    <span class="label">CNPJ</span><br>
                                    <span class="value">34.669.787/0001-09</span>
                                </td>
                                <td class="receipt-title">
                                    <span class="value" style="font-size: 11pt;">Recibo de Pagamento de Salário</span><br>
                                    <span class="label">Referente ao Mês/Ano</span><br>
                                    <span class="value">${String(mesFiltro).padStart(2, '0')}/${anoFiltro}</span>
                                </td>
                            </tr>
                        </table>
                        <table class="employee-table" style="margin-top: 5px;">
                            <tr>
                                <td style="width: 70%;">
                                    <span class="label">Nome do Funcionário(a)</span><br>
                                    <span class="value">${func.id.slice(-5).toUpperCase()} &nbsp;&nbsp; ${func.operador_nome}</span>
                                </td>
                                <td>
                                    <span class="label">Função</span><br>
                                    <span class="value">${func.cargo || 'Não informado'}</span>
                                </td>
                            </tr>
                        </table>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th class="col-cod">Cód.</th>
                                    <th class="col-desc">Descrição</th>
                                    <th class="col-ref">Referência</th>
                                    <th class="col-prov">Proventos</th>
                                    <th class="col-desc-val">Descontos</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="col-cod">001</td>
                                    <td class="col-desc">Salário Horas Normais</td>
                                    <td class="col-ref">${(func.horasNormais || 0).toFixed(2)}</td>
                                    <td class="col-prov">${(func.salarioHorasNormais || 0).toFixed(2)}</td>
                                    <td class="col-desc-val"></td>
                                </tr>
                                <tr>
                                    <td class="col-cod">002</td>
                                    <td class="col-desc">D.S.R sobre Horas</td>
                                    <td class="col-ref">${func.valor_hora > 0 ? ((func.dsr || 0) / func.valor_hora).toFixed(2) : '0.00'}</td>
                                    <td class="col-prov">${(func.dsr || 0).toFixed(2)}</td>
                                    <td class="col-desc-val"></td>
                                </tr>
                                ${func.totalBonus > 0 ? `
                                <tr>
                                    <td class="col-cod">003</td>
                                    <td class="col-desc">Bônus</td>
                                    <td class="col-ref"></td>
                                    <td class="col-prov">${(func.totalBonus || 0).toFixed(2)}</td>
                                    <td class="col-desc-val"></td>
                                </tr>` : ''}
                                
                                ${func.totalAdiantamentos > 0 ? `
                                <tr>
                                    <td class="col-cod">101</td>
                                    <td class="col-desc">Adiantamento Salarial</td>
                                    <td class="col-ref"></td>
                                    <td class="col-prov"></td>
                                    <td class="col-desc-val">${(func.totalAdiantamentos || 0).toFixed(2)}</td>
                                </tr>` : ''}

                                ${func.totalDescontos > 0 ? `
                                <tr>
                                    <td class="col-cod">102</td>
                                    <td class="col-desc">Outros Descontos</td>
                                    <td class="col-ref"></td>
                                    <td class="col-prov"></td>
                                    <td class="col-desc-val">${(func.totalDescontos || 0).toFixed(2)}</td>
                                </tr>` : ''}
                                
                                <!-- Empty rows for layout -->
                                ${Array(5).fill('<tr><td colspan="5" style="border:none; height:15px;"></td></tr>').join('')}
                            </tbody>
                        </table>

                        <table class="footer-table">
                            <tr>
                                <td style="width: 70%;">
                                    <div class="signature-section">
                                        <div class="declaration">
                                            DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO, CORRESPONDENTE AOS SERVIÇOS PRESTADOS.
                                            <div class="signature-line">
                                                Assinatura do Funcionário(a)
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="totals-box">
                                        <span><span class="label">Total Vencimentos:</span> <span class="value">${totalVencimentos.toFixed(2)}</span></span>
                                        <span><span class="label">Total Descontos:</span> <span class="value">${totalDescontosValor.toFixed(2)}</span></span>
                                        <hr>
                                        <span><span class="label">Líquido a Receber:</span> <span class="value">R$ ${(func.salarioLiquido || 0).toFixed(2)}</span></span>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <table class="log-table">
                        <thead>
                            <tr><th colspan="2" style="font-size: 11pt;">ESPELHO DE PONTO - ${func.operador_nome}</th></tr>
                            <tr><th style="width: 20%;">Data</th><th>Registros do Dia</th></tr>
                        </thead>
                        <tbody>
                            ${logDiarioHtml}
                        </tbody>
                    </table>

                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                        <Briefcase className="w-6 h-6" />
                        Gestão de RH e Folha de Pagamento
                    </h1>
                    <Link to={createPageUrl("Gerencia")}>
                        <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md::grid-cols-3 gap-6 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                        </CardHeader>
                        <CardContent className="flex gap-4">
                            <div>
                                <label className="text-sm font-medium">Mês</label>
                                <Input type="number" value={mesFiltro} onChange={e => setMesFiltro(parseInt(e.target.value))} min="1" max="12" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Ano</label>
                                <Input type="number" value={anoFiltro} onChange={e => setAnoFiltro(parseInt(e.target.value))} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Resumo do Mês
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Total Funcionários:</span>
                                    <span className="font-semibold">{folha.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Folha Bruta:</span>
                                    <span className="font-semibold text-green-600">
                                        R$ {folha.reduce((acc, f) => acc + (f.salarioComDsr || 0), 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Horas Extras:</span>
                                    <span className="font-semibold text-orange-600">
                                        {folha.reduce((acc, f) => acc + (f.horasExtras || 0), 0).toFixed(1)}h
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Feriados ({mesFiltro}/{anoFiltro})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                                {feriados
                                    .filter(f => {
                                        const dataFeriado = new Date(f.data + 'T00:00:00');
                                        return dataFeriado.getFullYear() === anoFiltro && 
                                               dataFeriado.getMonth() === (mesFiltro - 1) && 
                                               f.ativo;
                                    })
                                    .map(feriado => (
                                        <div key={feriado.id} className="flex justify-between">
                                            <span>{new Date(feriado.data + 'T00:00:00').getDate().toString().padStart(2, '0')}</span>
                                            <span className="text-gray-600 text-xs">{feriado.nome}</span>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Folha de Pagamento - {String(mesFiltro).padStart(2,'0')}/{anoFiltro}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>R$/Hora</TableHead>
                                        <TableHead>H. Normais</TableHead>
                                        <TableHead>H. Extras</TableHead>
                                        <TableHead>H. Feriados</TableHead>
                                        <TableHead>Sal. Normal</TableHead>
                                        <TableHead>Sal. Extras</TableHead>
                                        <TableHead>Sal. Feriados</TableHead>
                                        <TableHead>DSR</TableHead>
                                        <TableHead>Total c/ DSR</TableHead>
                                        <TableHead>Bônus</TableHead>
                                        <TableHead>Adiant.</TableHead>
                                        <TableHead>Desc.</TableHead>
                                        <TableHead>Líquido</TableHead>
                                        <TableHead>Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan="16" className="text-center text-gray-500 py-4">Carregando...</TableCell></TableRow>
                                    ) : (
                                        folha.length === 0 ? (
                                            <TableRow><TableCell colSpan="16" className="text-center text-gray-500 py-4">Nenhum dado de folha de pagamento encontrado para o mês/ano selecionado.</TableCell></TableRow>
                                        ) : (
                                            folha.map(func => (
                                                <TableRow key={func.id}>
                                                    <TableCell className="font-medium">{func.operador_nome}</TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            value={editando[func.id]?.cargo ?? func.cargo ?? ''}
                                                            onChange={e => handleEditChange(func.id, 'cargo', e.target.value)}
                                                            className="w-28 h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number"
                                                            step="0.01"
                                                            value={editando[func.id]?.valor_hora ?? func.valor_hora ?? ''}
                                                            onChange={e => handleEditChange(func.id, 'valor_hora', e.target.value)}
                                                            className="w-20 h-8"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{(func.horasNormais || 0).toFixed(1)}h</TableCell>
                                                    <TableCell className="text-orange-600 font-semibold">{(func.horasExtras || 0).toFixed(1)}h</TableCell>
                                                    <TableCell className="text-purple-600 font-semibold">{(func.horasEmFeriados || 0).toFixed(1)}h</TableCell>
                                                    <TableCell>R$ {(func.salarioHorasNormais || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-orange-600">R$ {(func.salarioHorasExtras || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-purple-600">R$ {(func.salarioHorasFeriados || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-blue-600">R$ {(func.dsr || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="font-semibold">R$ {(func.salarioComDsr || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-green-600">R$ ${(func.totalBonus || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-orange-600">R$ ${(func.totalAdiantamentos || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-red-600">R$ ${(func.totalDescontos || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="font-bold text-blue-600">R$ ${(func.salarioLiquido || 0).toFixed(2)}</TableCell>
                                                    <TableCell className="flex gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleSave(func.id)} title="Salvar alterações">
                                                            <Save className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleOpenModal(func)} title="Lançar adiantamento/bônus">
                                                            <PlusCircle className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => handleImprimirHolerite(func)} title="Imprimir Holerite">
                                                            <Printer className="w-4 h-4 text-gray-600" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {modalAberto && (
                <ModalAdiantamento 
                    isOpen={modalAberto}
                    onClose={() => setModalAberto(false)}
                    onSave={handleSaveAdiantamento}
                    funcionario={funcionarioSelecionado}
                />
            )}
        </div>
    );
}
