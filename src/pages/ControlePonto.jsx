
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { PontoFuncionario } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, LogOut, ArrowLeft, Calendar, Hourglass, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ModalAjustePonto from '@/components/ponto/ModalAjustePonto';
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


export default function ControlePonto() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [pontos, setPontos] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [operadorLogado, setOperadorLogado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [horasMensais, setHorasMensais] = useState(null);
  const [isModalAjusteOpen, setIsModalAjusteOpen] = useState(false);
  const [pontoEmAjuste, setPontoEmAjuste] = useState(null);
  const [pontoParaExcluir, setPontoParaExcluir] = useState(null);


  // Carrega o operador logado ao montar o componente
  useEffect(() => {
    const fetchOperador = async () => {
      try {
        const user = await User.me();
        setOperadorLogado(user);
      } catch (error) {
        console.error('Erro ao carregar operador:', error);
      }
    };
    fetchOperador();
  }, []);

  // Carrega os dados do dia sempre que a data ou o operador mudar
  useEffect(() => {
    if (operadorLogado) {
      carregarDados();
    }
  }, [dataFiltro, operadorLogado]);

  // Calcula as horas mensais quando o operador é carregado
  useEffect(() => {
    if (operadorLogado && !operadorLogado.is_gerente) {
      calcularHorasMensais(operadorLogado.id);
    }
  }, [operadorLogado]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const pontosList = await PontoFuncionario.filter({ data: dataFiltro });
      setPontos(pontosList);

      if (operadorLogado.is_gerente) {
        const usersList = await User.list();
        setFuncionarios(usersList);
      } else {
        setFuncionarios([operadorLogado]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarPonto = async (tipo) => {
    if (!operadorLogado) {
      alert('Operador não identificado');
      return;
    }

    try {
      const agora = new Date();
      const dataAtual = agora.toISOString().split('T')[0];
      const horaAtual = agora.toTimeString().split(' ')[0];

      await PontoFuncionario.create({
        funcionario_id: operadorLogado.id,
        funcionario_nome: operadorLogado.operador_nome || operadorLogado.full_name,
        data: dataAtual,
        hora: horaAtual,
        tipo: tipo, // 'entrada' ou 'saida'
        observacoes: ''
      });

      alert(`${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
      // Recarrega os dados para refletir o novo ponto
      if (dataAtual === dataFiltro) {
        carregarDados();
      }
      // Se o novo ponto for no mês atual, recalcula as horas mensais
      calcularHorasMensais(operadorLogado.id);

    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      alert('Erro ao registrar ponto!');
    }
  };

  const calcularHoras = (pontosFuncionario) => {
    let totalMinutos = 0;
    let entrada = null;

    pontosFuncionario.sort((a, b) => a.hora.localeCompare(b.hora));

    pontosFuncionario.forEach(ponto => {
      if (ponto.tipo === 'entrada') {
        // Pega a primeira entrada de um par
        if (!entrada) {
            entrada = ponto.hora;
        }
      } else if (ponto.tipo === 'saida' && entrada) {
        const [hE, mE] = entrada.split(':').map(Number);
        const [hS, mS] = ponto.hora.split(':').map(Number);
        
        const minutosEntrada = hE * 60 + mE;
        const minutosSaida = hS * 60 + mS;
        
        totalMinutos += (minutosSaida - minutosEntrada);
        entrada = null; // Reseta para o próximo par entrada/saída
      }
    });

    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas}h${minutos.toString().padStart(2, '0')}m`;
  };

  const calcularHorasMensais = async (funcionarioId) => {
    try {
        setHorasMensais('Calculando...');
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = (hoje.getMonth() + 1).toString().padStart(2, '0');
        const prefixoData = `${ano}-${mes}`;

        const todosOsPontos = await PontoFuncionario.filter({ funcionario_id: funcionarioId });
        const pontosDoMes = todosOsPontos.filter(p => p.data.startsWith(prefixoData));

        const pontosPorDia = pontosDoMes.reduce((acc, ponto) => {
            (acc[ponto.data] = acc[ponto.data] || []).push(ponto);
            return acc;
        }, {});

        let totalMinutosMes = 0;

        for (const dia in pontosPorDia) {
            const horasDia = calcularHoras(pontosPorDia[dia]);
            const [h, m] = horasDia.replace('h', ' ').replace('m', '').split(' ').map(Number);
            totalMinutosMes += (h * 60) + m;
        }

        const horas = Math.floor(totalMinutosMes / 60);
        const minutos = totalMinutosMes % 60;
        setHorasMensais(`${horas}h${minutos.toString().padStart(2, '0')}m`);

    } catch (error) {
        console.error("Erro ao calcular horas mensais:", error);
        setHorasMensais("Erro");
    }
  };

  const handleAbreModalAjuste = (ponto = null) => {
    setPontoEmAjuste(ponto);
    setIsModalAjusteOpen(true);
  };
  
  const handleSalvarAjustePonto = async (pontoData) => {
    try {
        if (pontoData.id) {
            // Editar ponto existente
            await PontoFuncionario.update(pontoData.id, {
                data: pontoData.data,
                hora: pontoData.hora,
                tipo: pontoData.tipo,
                funcionario_id: pontoData.funcionario_id,
                funcionario_nome: pontoData.funcionario_nome
            });
            alert('Ponto atualizado com sucesso!');
        } else {
            // Criar novo ponto
            await PontoFuncionario.create({
                data: pontoData.data,
                hora: pontoData.hora,
                tipo: pontoData.tipo,
                funcionario_id: pontoData.funcionario_id,
                funcionario_nome: pontoData.funcionario_nome,
                observacoes: 'Ajuste manual'
            });
            alert('Ponto adicionado com sucesso!');
        }
        setIsModalAjusteOpen(false);
        carregarDados();
        if(operadorLogado && !operadorLogado.is_gerente) {
            calcularHorasMensais(operadorLogado.id);
        }
    } catch (error) {
        console.error('Erro ao salvar ajuste de ponto:', error);
        alert('Erro ao salvar o ponto.');
    }
  };

  const handleExcluirPonto = (ponto) => {
    setPontoParaExcluir(ponto);
  };

  const confirmarExclusao = async () => {
    if (!pontoParaExcluir) return;
    try {
        await PontoFuncionario.delete(pontoParaExcluir.id);
        alert('Registro de ponto excluído com sucesso.');
        setPontoParaExcluir(null);
        carregarDados();
        if(operadorLogado && !operadorLogado.is_gerente) {
            calcularHorasMensais(operadorLogado.id);
        }
    } catch (error) {
        console.error('Erro ao excluir ponto:', error);
        alert('Erro ao excluir o registro.');
    }
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Controle de Ponto</h1>
          <Link to={createPageUrl("PDV")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao PDV
            </Button>
          </Link>
        </div>

        {/* Cards de Ação Rápida */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">Registrar Ponto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center mb-3">
                <div className="text-2xl font-bold text-blue-600">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => registrarPonto('entrada')} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrada
                </Button>
                <Button 
                  onClick={() => registrarPonto('saida')} 
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Saída
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">Funcionário Logado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="font-semibold text-gray-800">
                  {operadorLogado?.operador_nome || operadorLogado?.full_name || '...'}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {operadorLogado?.email || ''}
                </div>
              </div>
            </CardContent>
          </Card>

          {!operadorLogado?.is_gerente && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                    <Hourglass className="w-4 h-4"/>
                    Horas no Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                          {horasMensais || '0h00m'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                          Mês de {new Date().toLocaleString('pt-BR', { month: 'long' })}
                      </div>
                  </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">Filtrar Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>
        </div>

        {/* Botão de Ajuste Manual para Gerente */}
        {operadorLogado?.is_gerente && (
            <div className="flex justify-end mb-4">
                <Button onClick={() => handleAbreModalAjuste()}>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Ajustar Ponto Manual
                </Button>
            </div>
        )}

        {/* Tabela de Pontos do Dia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Pontos do Dia: {new Date(dataFiltro + 'T00:00:00').toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {operadorLogado?.is_gerente && <TableHead>Funcionário</TableHead>}
                    <TableHead>Primeira Entrada</TableHead>
                    <TableHead>Última Saída</TableHead>
                    <TableHead>Total de Horas</TableHead>
                    <TableHead>Registros</TableHead>
                    {operadorLogado?.is_gerente && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={operadorLogado?.is_gerente ? 6 : 5} className="text-center">Carregando...</TableCell></TableRow>
                  ) : (
                    funcionarios.map(funcionario => {
                      const pontosFuncionario = pontos.filter(p => p.funcionario_id === funcionario.id);
                      
                      if (pontosFuncionario.length === 0) return null;

                      const entradas = pontosFuncionario.filter(p => p.tipo === 'entrada');
                      const saidas = pontosFuncionario.filter(p => p.tipo === 'saida');
                      
                      const primeiraEntrada = entradas.length > 0 ? 
                        entradas.sort((a, b) => a.hora.localeCompare(b.hora))[0].hora : '-';
                      
                      const ultimaSaida = saidas.length > 0 ? 
                        saidas.sort((a, b) => b.hora.localeCompare(a.hora))[0].hora : '-';

                      return (
                        <TableRow key={funcionario.id}>
                          {operadorLogado?.is_gerente && (
                            <TableCell className="font-medium">
                              {funcionario.operador_nome || funcionario.full_name}
                            </TableCell>
                          )}
                          <TableCell>{primeiraEntrada}</TableCell>
                          <TableCell>{ultimaSaida}</TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            {calcularHoras(pontosFuncionario)}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              {pontosFuncionario
                                .sort((a, b) => a.hora.localeCompare(b.hora))
                                .map((ponto, index) => (
                                  <div key={index} className={`px-2 py-1 rounded w-fit ${
                                    ponto.tipo === 'entrada' 
                                      ? 'bg-green-100 text-green-800 force-dark-text' 
                                      : 'bg-red-100 text-red-800 force-dark-text'
                                  }`}>
                                    {ponto.hora} - {ponto.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                  </div>
                                ))}
                            </div>
                          </TableCell>
                          {operadorLogado?.is_gerente && (
                              <TableCell>
                                  <div className="flex flex-col gap-1 items-start">
                                      {pontosFuncionario
                                          .sort((a, b) => a.hora.localeCompare(b.hora))
                                          .map((ponto, index) => (
                                              <div key={index} className="flex items-center">
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAbreModalAjuste(ponto)}>
                                                      <Edit className="w-4 h-4 text-blue-600" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExcluirPonto(ponto)}>
                                                      <Trash2 className="w-4 h-4 text-red-600" />
                                                  </Button>
                                              </div>
                                          ))
                                      }
                                  </div>
                              </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                  {!loading && funcionarios.filter(f => pontos.some(p => p.funcionario_id === f.id)).length === 0 && (
                      <TableRow><TableCell colSpan={operadorLogado?.is_gerente ? 6 : 5} className="text-center h-24">Nenhum registro de ponto para a data selecionada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalAjusteOpen && (
          <ModalAjustePonto
              isOpen={isModalAjusteOpen}
              onClose={() => setIsModalAjusteOpen(false)}
              onSave={handleSalvarAjustePonto}
              pontoInicial={pontoEmAjuste}
              funcionarios={funcionarios}
              selectedDate={dataFiltro} // Pass the currently filtered date
          />
      )}

      <AlertDialog open={!!pontoParaExcluir} onOpenChange={() => setPontoParaExcluir(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tem certeza que deseja excluir este registro de ponto? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmarExclusao} className="bg-red-600 hover:bg-red-700">
                      Sim, Excluir
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
