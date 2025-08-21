
import React, { useState, useEffect } from "react";
import { Venda } from "@/api/entities";
import { Despesa } from "@/api/entities";
import { AjusteFinanceiro } from "@/api/entities";
import { Consignacao } from "@/api/entities";
import { ConsignacaoItem } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Calculator, TrendingUp, TrendingDown, ArrowLeft, Plus, Edit, Trash2, Copy, Save } from "lucide-react";
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

// Modal para adicionar/editar despesa
function ModalDespesa({ despesa, onSubmit, onFechar, mesAtual, anoAtual }) {
  const [nome, setNome] = useState(despesa?.nome || '');
  const [tipo, setTipo] = useState(despesa?.tipo || 'fixa');
  const [valor, setValor] = useState(despesa?.valor?.toString() || '');

  const handleSubmit = () => {
    if (!nome || !valor) {
      alert('Preencha todos os campos!');
      return;
    }

    onSubmit({
      id: despesa?.id,
      nome,
      tipo,
      valor: parseFloat(valor) || 0,
      mes: mesAtual,
      ano: anoAtual,
      ativa: true // Ensure new/edited expenses are active
    });
  };

  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{despesa ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Nome da Despesa</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Aluguel, Energia..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixa">Despesa Fixa</SelectItem>
                <SelectItem value="variavel">Despesa Variável</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Valor</label>
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Relatorios() {
  const [vendas, setVendas] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [ajustes, setAjustes] = useState([]); // State for manual adjustments
  const [consignacoes, setConsignacoes] = useState([]); // New state for consignacoes
  const [itensConsignacao, setItensConsignacao] = useState([]); // New state for itensConsignacao
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [showModalDespesa, setShowModalDespesa] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState(null);
  const [despesaParaExcluir, setDespesaParaExcluir] = useState(null);
  const [modoEdicaoRapida, setModoEdicaoRapida] = useState(false);
  const [valoresRapidos, setValoresRapidos] = useState({});
  const [editandoCelula, setEditandoCelula] = useState(null); // { indicador, mes, nomeDespesa? }
  const [valorEditando, setValorEditando] = useState('');

  const mesAtual = new Date().getMonth() + 1; // Actual current month

  useEffect(() => {
    carregarDados();
    // Only initialize default expenses for the actual current month and selected year
    if (anoSelecionado === new Date().getFullYear()) {
        inicializarDespesasMesAtual();
    }
    // If in quick edit mode and year changes, reset quick edit
    if (modoEdicaoRapida) {
      setModoEdicaoRapida(false);
      setValoresRapidos({});
    }
  }, [anoSelecionado]); // Run when year changes

  const carregarDados = async () => {
    try {
      const [vendasList, despesasList, ajustesList, consignacoesList, itensConsignacaoList] = await Promise.all([
        Venda.list("-created_date"),
        Despesa.list("-created_date"),
        AjusteFinanceiro.filter({ ano: anoSelecionado }),
        Consignacao.list("-created_date"),
        ConsignacaoItem.list("-created_date")
      ]);
      setVendas(vendasList);
      setDespesas(despesasList);
      setAjustes(ajustesList);
      setConsignacoes(consignacoesList);
      setItensConsignacao(itensConsignacaoList);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const inicializarDespesasMesAtual = async () => {
    const despesasExistentes = await Despesa.filter({
      mes: mesAtual,
      ano: anoSelecionado,
      ativa: true
    });

    const despesasPadrao = [
      { nome: "Água", tipo: "fixa" },
      { nome: "Energia", tipo: "fixa" },
      { nome: "Internet", tipo: "fixa" },
      { nome: "Seguro + IPVA + Licenciamento", tipo: "fixa" },
      { nome: "Impostos", tipo: "fixa" },
      { nome: "Funcionários", tipo: "fixa" },
      { nome: "Combustível do Triciclo", tipo: "variavel" },
      { nome: "Embalagens", tipo: "variavel" },
      { nome: "Combustível da Biz", tipo: "variavel" },
      { nome: "Propaganda Facebook", tipo: "variavel" },
      { nome: "Manutenção Triciclo", tipo: "variavel" },
      { nome: "Manutenção Biz", tipo: "variavel" },
      { nome: "Manutenção Loja", tipo: "variavel" },
      { nome: "Motoboy Agregado", tipo: "variavel" }
    ];

    const despesasParaCriar = [];
    for (const despesaPadrao of despesasPadrao) {
      const existe = despesasExistentes.find(d => d.nome === despesaPadrao.nome && d.tipo === despesaPadrao.tipo);
      if (!existe) {
        despesasParaCriar.push({
          nome: despesaPadrao.nome,
          tipo: despesaPadrao.tipo,
          mes: mesAtual,
          ano: anoSelecionado,
          valor: 0,
          ativa: true
        });
      }
    }

    if (despesasParaCriar.length > 0) {
      try {
        await Despesa.bulkCreate(despesasParaCriar);
        carregarDados();
      } catch (error) {
        console.error("Erro ao criar despesas padrão:", error);
      }
    }
  };

  const copiarDespesasMesAnterior = async () => {
    const mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;
    const anoAnterior = mesAtual === 1 ? anoSelecionado - 1 : anoSelecionado;

    try {
      const despesasMesAnterior = await Despesa.filter({
        mes: mesAnterior,
        ano: anoAnterior,
        ativa: true
      });

      if (despesasMesAnterior.length === 0) {
        alert('Não há despesas ativas no mês anterior para copiar.');
        return;
      }

      // Filter out expenses that already exist for the current month
      const despesasExistentesNoMesAtual = await Despesa.filter({
        mes: mesAtual,
        ano: anoSelecionado,
        ativa: true
      });

      const despesasParaCriar = despesasMesAnterior
        .filter(dAnterior => !despesasExistentesNoMesAtual.some(dAtual => dAtual.nome === dAnterior.nome && dAtual.tipo === dAnterior.tipo))
        .map(d => ({
          nome: d.nome,
          tipo: d.tipo,
          mes: mesAtual,
          ano: anoSelecionado,
          valor: d.valor,
          ativa: true
        }));

      if (despesasParaCriar.length === 0) {
        alert('Todas as despesas do mês anterior já existem no mês atual.');
        return;
      }

      await Despesa.bulkCreate(despesasParaCriar);
      carregarDados();
      alert(`${despesasParaCriar.length} despesas copiadas do mês anterior!`);
    } catch (error) {
      alert('Erro ao copiar despesas do mês anterior.');
      console.error(error);
    }
  };

  const getValorAjustado = (indicador, mes) => {
    const ajuste = ajustes.find(a => a.mes === mes && a.ano === anoSelecionado && a.indicador === indicador);
    return ajuste ? ajuste.valor : null;
  };

  const calcularFaturamentoPorMes = (mes) => {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado('faturamento', mes);
      if (valorAjustado !== null) return valorAjustado;
    }

    // Calcular TODAS as vendas finalizadas do mês, incluindo consignação e todos os tipos
    return vendas
      .filter(v => {
        const dataVenda = new Date(v.created_date);
        return dataVenda.getFullYear() === anoSelecionado &&
               dataVenda.getMonth() + 1 === mes &&
               v.status === 'finalizada'; // Apenas vendas finalizadas, sem outros filtros
      })
      .reduce((acc, v) => acc + (v.total || 0), 0);
  };

  const calcularCustoProdutosPorMes = (mes) => {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado('custo_produtos', mes);
      if (valorAjustado !== null) return valorAjustado;
    }
    // Simplificado - assume 70% do faturamento como custo dos produtos
    // For general report, this is a placeholder. Detailed cost will be in the new table.
    return calcularFaturamentoPorMes(mes) * 0.7;
  };

  const calcularDespesasPorMes = (mes, tipo, filtroNome = null) => {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    const indicador = tipo === 'fixa' ? 'despesas_fixas' : 'despesas_variaveis';

    // Only apply manual adjustment for the overall category if no specific expense name is filtered
    if (!isMesCorrente && !filtroNome) {
        const valorAjustado = getValorAjustado(indicador, mes);
        if (valorAjustado !== null) return valorAjustado;
    }

    return despesas
      .filter(d => {
        const matchMesAno = d.ano === anoSelecionado &&
                            d.mes === mes &&
                            d.tipo === tipo &&
                            d.ativa;
        if (!filtroNome) return matchMesAno;
        return matchMesAno && d.nome.toLowerCase().includes(filtroNome.toLowerCase());
      })
      .reduce((acc, d) => acc + (d.valor || 0), 0);
  };

  const handleSalvarDespesa = async (dadosDespesa) => {
    try {
      if (dadosDespesa.id) {
        await Despesa.update(dadosDespesa.id, {
          nome: dadosDespesa.nome,
          tipo: dadosDespesa.tipo,
          valor: dadosDespesa.valor,
          ativa: dadosDespesa.ativa // Ensure active status is preserved
        });
      } else {
        await Despesa.create(dadosDespesa);
      }
      setShowModalDespesa(false);
      setDespesaEditando(null);
      carregarDados();
    } catch (error) {
      alert('Erro ao salvar despesa!');
      console.error(error);
    }
  };

  const handleExcluirDespesa = async () => {
    if (!despesaParaExcluir) return;
    try {
      await Despesa.update(despesaParaExcluir.id, { ativa: false }); // Set as inactive instead of deleting
      setDespesaParaExcluir(null);
      carregarDados();
    } catch (error) {
      alert('Erro ao excluir despesa!');
      console.error(error);
    }
  };

  const iniciarEdicaoCelula = (indicador, mes, valorAtual) => {
    setEditandoCelula({ indicador, mes });
    // Usuário sempre edita um número positivo
    setValorEditando(Math.abs(valorAtual).toString());
  };

  const salvarEdicaoCelula = async () => {
    if (!editandoCelula) return;
    const { indicador, mes } = editandoCelula;
    // O valor do input é sempre positivo
    const valor = parseFloat(valorEditando) || 0;

    const ajusteExistente = ajustes.find(a => a.mes === mes && a.ano === anoSelecionado && a.indicador === indicador);

    try {
        if (ajusteExistente) {
            // Salva sempre um valor positivo
            await AjusteFinanceiro.update(ajusteExistente.id, { valor });
        } else {
            await AjusteFinanceiro.create({ ano: anoSelecionado, mes, indicador, valor });
        }
        await carregarDados(); // Recarrega para mostrar o valor novo
    } catch (error) {
        console.error("Erro ao salvar ajuste:", error);
        alert("Falha ao salvar o ajuste.");
    } finally {
        setEditandoCelula(null);
        setValorEditando('');
    }
  };

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Adjusted for integer currency display if needed for table summary, based on prior code
  const formatarMoedaZeroDecimals = (valor) => {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getDespesasDoMesAtual = (tipo) => {
    return despesas.filter(d =>
      d.ano === anoSelecionado &&
      d.mes === mesAtual &&
      d.tipo === tipo &&
      d.ativa
    ).sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar por nome
  };

  const ativarEdicaoRapida = () => {
    setModoEdicaoRapida(true);
    // Inicializa os valores atuais para edição rápida
    const valores = {};
    const despesasDoMes = despesas.filter(d =>
      d.ano === anoSelecionado &&
      d.mes === mesAtual &&
      d.ativa
    );

    despesasDoMes.forEach(despesa => {
      valores[despesa.id] = despesa.valor?.toString() || '0';
    });

    setValoresRapidos(valores);
  };

  const cancelarEdicaoRapida = () => {
    setModoEdicaoRapida(false);
    setValoresRapidos({});
  };

  const salvarValoresRapidos = async () => {
    try {
      const updates = [];

      for (const [despesaId, valor] of Object.entries(valoresRapidos)) {
        updates.push(
          Despesa.update(despesaId, {
            valor: parseFloat(valor) || 0
          })
        );
      }

      await Promise.all(updates);
      setModoEdicaoRapida(false);
      setValoresRapidos({});
      carregarDados(); // Recarregar dados para atualizar a tela
    } catch (error) {
      alert('Erro ao salvar valores!');
      console.error(error);
    }
  };

  const handleValorRapidoChange = (despesaId, valor) => {
    setValoresRapidos(prev => ({
      ...prev,
      [despesaId]: valor
    }));
  };

  const renderCell = (indicador, mes, valor) => {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    const isEditing = editandoCelula?.indicador === indicador && editandoCelula?.mes === mes;

    // O valor passado pode ser negativo para custos/despesas
    const displayValue = valor;

    if (isEditing) {
      return (
        <Input
          type="number"
          step="0.01"
          value={valorEditando} // valorEditando é sempre positivo
          onChange={(e) => setValorEditando(e.target.value)}
          onBlur={salvarEdicaoCelula}
          onKeyPress={(e) => { if (e.key === 'Enter') salvarEdicaoCelula(); }}
          autoFocus
          className="w-20 h-8 text-center"
        />
      );
    }

    // Se é o mês corrente e o ano selecionado é o ano atual, não permite edição
    if (isMesCorrente) {
      return (
        <span className="p-1 rounded bg-yellow-50 border border-yellow-200">
          {formatarMoedaZeroDecimals(displayValue)}
        </span>
      );
    }

    // Para meses anteriores, permite edição
    return (
      <span
        className="cursor-pointer hover:bg-yellow-100 p-1 rounded"
        onClick={() => iniciarEdicaoCelula(indicador, mes, displayValue)}
        title="Clique para editar manualmente"
      >
        {formatarMoedaZeroDecimals(displayValue)}
      </span>
    );
  };

  // Funções auxiliares para a nova tabela de despesas
  function getDespesasUnicasPorTipo(tipo) {
    const nomesDespesas = despesas
      .filter(d => d.tipo === tipo && d.ativa && d.ano === anoSelecionado)
      .map(d => d.nome);
    return [...new Set(nomesDespesas)].sort((a,b) => a.localeCompare(b));
  }

  function calcularDespesaEspecificaPorMes(mes, tipo, nomeDespesa) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    // Para o mês corrente, sempre pega dos dados reais
    if (isMesCorrente) {
      return despesas
        .filter(d =>
          d.ano === anoSelecionado &&
          d.mes === mes &&
          d.tipo === tipo &&
          d.nome === nomeDespesa &&
          d.ativa
        )
        .reduce((acc, d) => acc + (d.valor || 0), 0);
    }

    // Para meses anteriores, verifica se há ajuste manual primeiro
    const indicador = `${tipo}_${nomeDespesa.toLowerCase().replace(/\s+/g, '_')}`;
    const valorAjustado = getValorAjustado(indicador, mes);
    if (valorAjustado !== null) {
      return valorAjustado;
    }

    // Se não há ajuste manual, pega dos dados reais
    return despesas
      .filter(d =>
        d.ano === anoSelecionado &&
        d.mes === mes &&
        d.tipo === tipo &&
        d.nome === nomeDespesa &&
        d.ativa
      )
      .reduce((acc, d) => acc + (d.valor || 0), 0);
  }

  function renderCellDespesa(indicadorBase, mes, nomeDespesa, valor) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    const indicador = `${indicadorBase}_${nomeDespesa.toLowerCase().replace(/\s+/g, '_')}`;
    const isEditing = editandoCelula?.indicador === indicador && editandoCelula?.mes === mes;

    const displayValue = valor;

    if (isEditing) {
      return (
        <Input
          type="number"
          step="0.01"
          value={valorEditando}
          onChange={(e) => setValorEditando(e.target.value)}
          onBlur={salvarEdicaoCelula}
          onKeyPress={(e) => { if (e.key === 'Enter') salvarEdicaoCelula(); }}
          autoFocus
          className="w-20 h-8 text-center"
        />
      );
    }

    if (isMesCorrente) {
      return (
        <span className="p-1 rounded bg-yellow-50 border border-yellow-200">
          {formatarMoedaZeroDecimals(displayValue)}
        </span>
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-yellow-100 p-1 rounded"
        onClick={() => iniciarEdicaoCelula(indicador, mes, displayValue)}
        title="Clique para editar manualmente"
      >
        {formatarMoedaZeroDecimals(displayValue)}
      </span>
    );
  }

  // Funções auxiliares para a tabela de vendas por origem
  function calcularVendaConsignacaoPorMes(mes) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado('venda_consignacao', mes);
      if (valorAjustado !== null) return valorAjustado;
    }

    // Calcular diretamente das vendas finalizadas que têm um vendedor de consignação
    return vendas
      .filter(v => {
        const dataVenda = new Date(v.created_date);
        return dataVenda.getFullYear() === anoSelecionado &&
               dataVenda.getMonth() + 1 === mes &&
               v.status === 'finalizada' &&
               v.vendedor_consignacao; // Verifica se o campo existe e não é nulo/vazio
      })
      .reduce((acc, v) => acc + (v.total || 0), 0);
  }

  function calcularCustoConsignacaoPorMes(mes) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado('custo_consignacao', mes);
      if (valorAjustado !== null) return valorAjustado;
    }

    // Simplificado: assume 80% do valor de venda como custo para consignação
    return calcularVendaConsignacaoPorMes(mes) * 0.8;
  }

  function calcularVendaLojaFisicaPorMes(mes, tipo) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    const indicador = tipo === 'varejo' ? 'venda_varejo' : 'venda_atacado';

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado(indicador, mes);
      if (valorAjustado !== null) return valorAjustado;
    }

    return vendas
      .filter(v => {
        const dataVenda = new Date(v.created_date);
        const tipoMatch = tipo === 'varejo' ?
          (v.tipo_venda === 'varejo' || v.tipo_venda === 'delivery') :
          v.tipo_venda === 'atacado';

        return dataVenda.getFullYear() === anoSelecionado &&
               dataVenda.getMonth() + 1 === mes &&
               v.status === 'finalizada' &&
               tipoMatch &&
               !v.vendedor_consignacao; // Exclui vendas de consignação
      })
      .reduce((acc, v) => acc + (v.total || 0), 0);
  }

  function calcularCustoLojaFisicaPorMes(mes) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    if (!isMesCorrente) {
      const valorAjustado = getValorAjustado('custo_loja', mes);
      if (valorAjustado !== null) return valorAjustado;
    }

    // Simplificado: 70% do total das vendas da loja física como custo
    const vendaVarejo = calcularVendaLojaFisicaPorMes(mes, 'varejo');
    const vendaAtacado = calcularVendaLojaFisicaPorMes(mes, 'atacado');
    return (vendaVarejo + vendaAtacado) * 0.7;
  }

  function renderCellVenda(indicador, mes, valor) {
    const currentRealYear = new Date().getFullYear();
    const isMesCorrente = mes === mesAtual && anoSelecionado === currentRealYear;

    const isEditing = editandoCelula?.indicador === indicador && editandoCelula?.mes === mes;

    if (isEditing) {
      return (
        <Input
          type="number"
          step="0.01"
          value={valorEditando}
          onChange={(e) => setValorEditando(e.target.value)}
          onBlur={salvarEdicaoCelula}
          onKeyPress={(e) => { if (e.key === 'Enter') salvarEdicaoCelula(); }}
          autoFocus
          className="w-20 h-8 text-center"
        />
      );
    }

    if (isMesCorrente) {
      return (
        <span className="p-1 rounded bg-yellow-50 border border-yellow-200">
          {formatarMoedaZeroDecimals(valor)}
        </span>
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-yellow-100 p-1 rounded"
        onClick={() => iniciarEdicaoCelula(indicador, mes, valor)}
        title="Clique para editar manualmente"
      >
        {formatarMoedaZeroDecimals(valor)}
      </span>
    );
  }


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Resultado Financeiro - {anoSelecionado}
          </h1>
          <div className="flex gap-2 items-center">
            {modoEdicaoRapida ? (
              <>
                <Button
                  onClick={salvarValoresRapidos}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Valores
                </Button>
                <Button
                  onClick={cancelarEdicaoRapida}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                onClick={ativarEdicaoRapida}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edição Rápida
              </Button>
            )}
            <Button
              onClick={copiarDespesasMesAnterior}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Mês Anterior
            </Button>
            <Input
              type="number"
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
              className="w-24"
            />
            <Link to={createPageUrl("Gerencia")}>
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
            </Link>
          </div>
        </div>

        {/* Gestão de Despesas do Mês Atual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Despesas Fixas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Despesas Fixas - {meses[mesAtual - 1]}</CardTitle>
              {!modoEdicaoRapida && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDespesaEditando({ tipo: 'fixa' });
                    setShowModalDespesa(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {getDespesasDoMesAtual('fixa').map(despesa => (
                  <div key={despesa.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-grow">
                      <span className="font-medium text-sm block">{despesa.nome}</span>
                      {modoEdicaoRapida ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={valoresRapidos[despesa.id] || '0'}
                          onChange={(e) => handleValorRapidoChange(despesa.id, e.target.value)}
                          className="w-24 h-8 text-sm mt-1"
                          placeholder="0,00"
                        />
                      ) : (
                        <span className="text-red-600 font-bold">{formatarMoeda(despesa.valor)}</span>
                      )}
                    </div>
                    {!modoEdicaoRapida && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setDespesaEditando(despesa);
                          setShowModalDespesa(true);
                        }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDespesaParaExcluir(despesa)}>
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {getDespesasDoMesAtual('fixa').length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhuma despesa fixa cadastrada</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Despesas Variáveis */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Despesas Variáveis - {meses[mesAtual - 1]}</CardTitle>
              {!modoEdicaoRapida && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDespesaEditando({ tipo: 'variavel' });
                    setShowModalDespesa(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {getDespesasDoMesAtual('variavel').map(despesa => (
                  <div key={despesa.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-grow">
                      <span className="font-medium text-sm block">{despesa.nome}</span>
                      {modoEdicaoRapida ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={valoresRapidos[despesa.id] || '0'}
                          onChange={(e) => handleValorRapidoChange(despesa.id, e.target.value)}
                          className="w-24 h-8 text-sm mt-1"
                          placeholder="0,00"
                        />
                      ) : (
                        <span className="text-red-600 font-bold">{formatarMoeda(despesa.valor)}</span>
                      )}
                    </div>
                    {!modoEdicaoRapida && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setDespesaEditando(despesa);
                          setShowModalDespesa(true);
                        }}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDespesaParaExcluir(despesa)}>
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {getDespesasDoMesAtual('variavel').length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhuma despesa variável cadastrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela Detalhada de Despesas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">DETALHAMENTO DE DESPESAS POR MÊS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium w-48">Despesa</th>
                    {meses.map((mes, index) => (
                      <th key={mes} className="text-center py-2 font-medium w-20">{mes.substring(0,3)}</th>
                    ))}
                    <th className="text-center py-2 font-medium w-20">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* DESPESAS FIXAS */}
                  <tr className="bg-red-100">
                    <td colSpan={14} className="py-2 font-bold text-center text-red-800">
                      DESPESAS FIXAS
                    </td>
                  </tr>
                  {getDespesasUnicasPorTipo('fixa').map(nomeDespesa => (
                    <tr key={`fixa-${nomeDespesa}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium text-red-700 pl-4">{nomeDespesa}</td>
                      {meses.map((_, index) => {
                        const mesNum = index + 1;
                        const valor = calcularDespesaEspecificaPorMes(mesNum, 'fixa', nomeDespesa);
                        return (
                          <td key={index} className="text-center py-2 text-red-600">
                            <div className="flex items-center justify-center">
                              {renderCellDespesa('despesa_fixa', mesNum, nomeDespesa, -valor)}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center py-2 font-bold text-red-600">
                        {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) =>
                          total + calcularDespesaEspecificaPorMes(index + 1, 'fixa', nomeDespesa), 0))}
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL FIXAS */}
                  <tr className="bg-red-200 font-bold">
                    <td className="py-2 pl-4 font-bold">TOTAL FIXAS</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const totalFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      return (
                        <td key={index} className="text-center py-2 font-bold text-red-700">
                          {formatarMoedaZeroDecimals(-totalFixas)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-700">
                      {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) =>
                        total + calcularDespesasPorMes(index + 1, 'fixa'), 0))}
                    </td>
                  </tr>

                  {/* DESPESAS VARIÁVEIS */}
                  <tr className="bg-orange-100">
                    <td colSpan={14} className="py-2 font-bold text-center text-orange-800">
                      DESPESAS VARIÁVEIS
                    </td>
                  </tr>
                  {getDespesasUnicasPorTipo('variavel').map(nomeDespesa => (
                    <tr key={`variavel-${nomeDespesa}`} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium text-orange-700 pl-4">{nomeDespesa}</td>
                      {meses.map((_, index) => {
                        const mesNum = index + 1;
                        const valor = calcularDespesaEspecificaPorMes(mesNum, 'variavel', nomeDespesa);
                        return (
                          <td key={index} className="text-center py-2 text-orange-600">
                            <div className="flex items-center justify-center">
                              {renderCellDespesa('despesa_variavel', mesNum, nomeDespesa, -valor)}
                            </div>
                          </td>
                        );
                      })}
                      <td className="text-center py-2 font-bold text-orange-600">
                        {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) =>
                          total + calcularDespesaEspecificaPorMes(index + 1, 'variavel', nomeDespesa), 0))}
                      </td>
                    </tr>
                  ))}

                  {/* TOTAL VARIÁVEIS */}
                  <tr className="bg-orange-200 font-bold">
                    <td className="py-2 pl-4 font-bold">TOTAL VARIÁVEIS</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const totalVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      return (
                        <td key={index} className="text-center py-2 font-bold text-orange-700">
                          {formatarMoedaZeroDecimals(-totalVariaveis)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-orange-700">
                      {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) =>
                        total + calcularDespesasPorMes(index + 1, 'variavel'), 0))}
                    </td>
                  </tr>

                  {/* TOTAL GERAL DAS DESPESAS */}
                  <tr className="bg-red-300 font-bold border-t-2 border-red-500">
                    <td className="py-3 pl-4 font-bold text-lg">TOTAL GERAL</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const totalFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      const totalVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      const totalGeral = totalFixas + totalVariaveis;
                      return (
                        <td key={index} className="text-center py-3 font-bold text-red-800 text-lg">
                          {formatarMoedaZeroDecimals(-totalGeral)}
                        </td>
                      );
                    })}
                    <td className="text-center py-3 font-bold text-red-800 text-lg">
                      {(() => {
                        const totalFixasAno = meses.reduce((total, _, index) =>
                          total + calcularDespesasPorMes(index + 1, 'fixa'), 0);
                        const totalVariaveisAno = meses.reduce((total, _, index) =>
                          total + calcularDespesasPorMes(index + 1, 'variavel'), 0);
                        return formatarMoedaZeroDecimals(-(totalFixasAno + totalVariaveisAno));
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Análise de Vendas por Origem */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">ANÁLISE DE VENDAS POR ORIGEM</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium w-48">Origem / Indicador</th>
                    {meses.map((mes, index) => (
                      <th key={mes} className="text-center py-2 font-medium w-20">{mes.substring(0,3)}</th>
                    ))}
                    <th className="text-center py-2 font-medium w-20">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* VENDEDOR EXTERNO (CONSIGNAÇÃO) */}
                  <tr className="bg-blue-100">
                    <td colSpan={14} className="py-2 font-bold text-center text-blue-800">
                      VENDEDOR EXTERNO
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-blue-700 pl-4">VENDA CONSIGNADO TOTAL</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularVendaConsignacaoPorMes(mesNum);
                      return (
                        <td key={index} className="text-center py-2 text-blue-600">
                          <div className="flex items-center justify-center">
                            {renderCellVenda('venda_consignacao', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-blue-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) =>
                        total + calcularVendaConsignacaoPorMes(index + 1), 0))}
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-red-700 pl-4">CUSTOS DE PRODUTOS</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularCustoConsignacaoPorMes(mesNum);
                      return (
                        <td key={index} className="text-center py-2 text-red-600">
                          <div className="flex items-center justify-center">
                            {renderCellVenda('custo_consignacao', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) =>
                        total + calcularCustoConsignacaoPorMes(index + 1), 0))}
                    </td>
                  </tr>

                  <tr className="border-b bg-green-50">
                    <td className="py-2 font-bold text-green-700 pl-4">LÍQUIDO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const venda = calcularVendaConsignacaoPorMes(mesNum);
                      const custo = calcularCustoConsignacaoPorMes(mesNum);
                      const liquido = venda - custo;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-green-600">
                          {formatarMoedaZeroDecimals(liquido)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-green-600">
                      {(() => {
                        const totalVenda = meses.reduce((total, _, index) =>
                          total + calcularVendaConsignacaoPorMes(index + 1), 0);
                        const totalCusto = meses.reduce((total, _, index) =>
                          total + calcularCustoConsignacaoPorMes(index + 1), 0);
                        return formatarMoedaZeroDecimals(totalVenda - totalCusto);
                      })()}
                    </td>
                  </tr>

                  {/* LOJA FÍSICA */}
                  <tr className="bg-purple-100">
                    <td colSpan={14} className="py-2 font-bold text-center text-purple-800">
                      LOJA FÍSICA
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-purple-700 pl-4">VAREJO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularVendaLojaFisicaPorMes(mesNum, 'varejo');
                      return (
                        <td key={index} className="text-center py-2 text-purple-600">
                          <div className="flex items-center justify-center">
                            {renderCellVenda('venda_varejo', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-purple-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) =>
                        total + calcularVendaLojaFisicaPorMes(index + 1, 'varejo'), 0))}
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-purple-700 pl-4">ATACADO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      return (
                        <td key={index} className="text-center py-2 text-purple-600">
                          <div className="flex items-center justify-center">
                            {renderCellVenda('venda_atacado', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-purple-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) =>
                        total + calcularVendaLojaFisicaPorMes(index + 1, 'atacado'), 0))}
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-purple-700 pl-4">VENDA TOTAL</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const varejo = calcularVendaLojaFisicaPorMes(mesNum, 'varejo');
                      const atacado = calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      const total = varejo + atacado;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-purple-600">
                          {formatarMoedaZeroDecimals(total)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-purple-600">
                      {(() => {
                        const totalVarejo = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'varejo'), 0);
                        const totalAtacado = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'atacado'), 0);
                        return formatarMoedaZeroDecimals(totalVarejo + totalAtacado);
                      })()}
                    </td>
                  </tr>

                  <tr className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium text-red-700 pl-4">CUSTO TOTAL</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularCustoLojaFisicaPorMes(mesNum);
                      return (
                        <td key={index} className="text-center py-2 text-red-600">
                          <div className="flex items-center justify-center">
                            {renderCellVenda('custo_loja', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) =>
                        total + calcularCustoLojaFisicaPorMes(index + 1), 0))}
                    </td>
                  </tr>

                  <tr className="border-b bg-green-50">
                    <td className="py-2 font-bold text-green-700 pl-4">LÍQUIDO VAREJO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const vendaVarejo = calcularVendaLojaFisicaPorMes(mesNum, 'varejo');
                      const custoLojaTotal = calcularCustoLojaFisicaPorMes(mesNum);
                      // Estimate cost proportion for retail
                      const vendaTotalLoja = calcularVendaLojaFisicaPorMes(mesNum, 'varejo') + calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      const custoVarejo = (vendaTotalLoja > 0 ? (vendaVarejo / vendaTotalLoja) : 0) * custoLojaTotal;
                      const liquido = vendaVarejo - custoVarejo;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-green-600">
                          {formatarMoedaZeroDecimals(liquido)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-green-600">
                      {(() => {
                        const totalVendaVarejo = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'varejo'), 0);
                        const totalCustoLoja = meses.reduce((total, _, index) =>
                          total + calcularCustoLojaFisicaPorMes(index + 1), 0);
                        const totalVendaTotalLoja = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'varejo') + calcularVendaLojaFisicaPorMes(index + 1, 'atacado'), 0);
                        const totalCustoVarejo = (totalVendaTotalLoja > 0 ? (totalVendaVarejo / totalVendaTotalLoja) : 0) * totalCustoLoja;
                        return formatarMoedaZeroDecimals(totalVendaVarejo - totalCustoVarejo);
                      })()}
                    </td>
                  </tr>

                  <tr className="border-b bg-green-50">
                    <td className="py-2 font-bold text-green-700 pl-4">LÍQUIDO ATACADO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const vendaAtacado = calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      const custoLojaTotal = calcularCustoLojaFisicaPorMes(mesNum);
                      // Estimate cost proportion for wholesale
                      const vendaTotalLoja = calcularVendaLojaFisicaPorMes(mesNum, 'varejo') + calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      const custoAtacado = (vendaTotalLoja > 0 ? (vendaAtacado / vendaTotalLoja) : 0) * custoLojaTotal;
                      const liquido = vendaAtacado - custoAtacado;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-green-600">
                          {formatarMoedaZeroDecimals(liquido)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-green-600">
                      {(() => {
                        const totalVendaAtacado = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'atacado'), 0);
                        const totalCustoLoja = meses.reduce((total, _, index) =>
                          total + calcularCustoLojaFisicaPorMes(index + 1), 0);
                        const totalVendaTotalLoja = meses.reduce((total, _, index) =>
                          total + calcularVendaLojaFisicaPorMes(index + 1, 'varejo') + calcularVendaLojaFisicaPorMes(index + 1, 'atacado'), 0);
                        const totalCustoAtacado = (totalVendaTotalLoja > 0 ? (totalVendaAtacado / totalVendaTotalLoja) : 0) * totalCustoLoja;
                        return formatarMoedaZeroDecimals(totalVendaAtacado - totalCustoAtacado);
                      })()}
                    </td>
                  </tr>

                  {/* TOTAL GERAL LÍQUIDO */}
                  <tr className="bg-green-200 font-bold border-t-2 border-green-500">
                    <td className="py-3 pl-4 font-bold text-lg">LÍQUIDO TOTAL</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const liquidoConsignacao = calcularVendaConsignacaoPorMes(mesNum) - calcularCustoConsignacaoPorMes(mesNum);
                      const vendaVarejo = calcularVendaLojaFisicaPorMes(mesNum, 'varejo');
                      const vendaAtacado = calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                      const custoLoja = calcularCustoLojaFisicaPorMes(mesNum);
                      const liquidoLoja = (vendaVarejo + vendaAtacado) - custoLoja;
                      const liquidoTotal = liquidoConsignacao + liquidoLoja;
                      return (
                        <td key={index} className="text-center py-3 font-bold text-green-800 text-lg">
                          {formatarMoedaZeroDecimals(liquidoTotal)}
                        </td>
                      );
                    })}
                    <td className="text-center py-3 font-bold text-green-800 text-lg">
                      {(() => {
                        const totalLiquidoConsignacao = meses.reduce((total, _, index) => {
                          const mesNum = index + 1;
                          return total + (calcularVendaConsignacaoPorMes(mesNum) - calcularCustoConsignacaoPorMes(mesNum));
                        }, 0);
                        const totalVendaLoja = meses.reduce((total, _, index) => {
                          const mesNum = index + 1;
                          return total + calcularVendaLojaFisicaPorMes(mesNum, 'varejo') + calcularVendaLojaFisicaPorMes(mesNum, 'atacado');
                        }, 0);
                        const totalCustoLoja = meses.reduce((total, _, index) =>
                          total + calcularCustoLojaFisicaPorMes(index + 1), 0);
                        return formatarMoedaZeroDecimals(totalLiquidoConsignacao + (totalVendaLoja - totalCustoLoja));
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        
        {/* Resumo Financeiro Anual */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">RESUMO FINANCEIRO ANUAL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium w-48">Indicador</th>
                    {meses.map((mes, index) => (
                      <th key={mes} className="text-center py-2 font-medium w-20">{mes.substring(0,3)}</th>
                    ))}
                    <th className="text-center py-2 font-medium w-20">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-blue-50">
                    <td className="py-2 font-medium flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      FATURAMENTO
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularFaturamentoPorMes(mesNum);
                      return (
                        <td key={index} className="text-center py-2 font-semibold text-blue-600">
                          <div className="flex items-center justify-center">
                            {renderCell('faturamento', mesNum, valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-blue-600">
                      {formatarMoedaZeroDecimals(meses.reduce((total, _, index) => total + calcularFaturamentoPorMes(index + 1), 0))}
                    </td>
                  </tr>

                  <tr className="border-b bg-red-50">
                    <td className="py-2 font-medium flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      CUSTO DE PRODUTOS
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularCustoProdutosPorMes(mesNum);
                      return (
                        <td key={index} className="text-center py-2 text-red-600">
                          <div className="flex items-center justify-center">
                            {renderCell('custo_produtos', mesNum, -valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) => total + calcularCustoProdutosPorMes(index + 1), 0))}
                    </td>
                  </tr>

                  {/* --- LUCRO BRUTO --- */}
                  <tr className="border-b bg-green-50">
                    <td className="py-2 font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      LUCRO BRUTO
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const faturamento = calcularFaturamentoPorMes(mesNum);
                      const custo = calcularCustoProdutosPorMes(mesNum);
                      const lucroBruto = faturamento - custo;
                      return (
                        <td key={index} className={`text-center py-2 font-bold ${lucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatarMoedaZeroDecimals(lucroBruto)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold">
                      {(() => {
                        const totalFaturamento = meses.reduce((total, _, index) => total + calcularFaturamentoPorMes(index + 1), 0);
                        const totalCusto = meses.reduce((total, _, index) => total + calcularCustoProdutosPorMes(index + 1), 0);
                        const totalLucroBruto = totalFaturamento - totalCusto;
                        return (
                            <span className={`${totalLucroBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatarMoedaZeroDecimals(totalLucroBruto)}
                            </span>
                        );
                      })()}
                    </td>
                  </tr>

                  <tr className="border-b bg-red-50">
                    <td className="py-2 font-medium flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      DESPESAS FIXAS
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularDespesasPorMes(mesNum, 'fixa');
                      return (
                        <td key={index} className="text-center py-2 text-red-600">
                          <div className="flex items-center justify-center">
                            {renderCell('despesas_fixas', mesNum, -valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'fixa'), 0))}
                    </td>
                  </tr>

                  <tr className="border-b bg-red-50">
                    <td className="py-2 font-medium flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      DESPESAS VARIÁVEIS
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const valor = calcularDespesasPorMes(mesNum, 'variavel');
                      return (
                        <td key={index} className="text-center py-2 text-red-600">
                          <div className="flex items-center justify-center">
                            {renderCell('despesas_variaveis', mesNum, -valor)}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {formatarMoedaZeroDecimals(-meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'variavel'), 0))}
                    </td>
                  </tr>

                  {/* --- TOTAL DESPESAS GERAIS --- */}
                  <tr className="border-b bg-red-100">
                    <td className="py-2 font-bold flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      TOTAL DESPESAS GERAIS
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const despesasFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      const despesasVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      const totalDespesas = despesasFixas + despesasVariaveis;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-red-600">
                          {formatarMoedaZeroDecimals(-totalDespesas)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {(() => {
                        const totalFixas = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'fixa'), 0);
                        const totalVariaveis = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'variavel'), 0);
                        return formatarMoedaZeroDecimals(-(totalFixas + totalVariaveis));
                      })()}
                    </td>
                  </tr>

                  {/* --- TOTAL CUSTO + DESPESAS --- */}
                  <tr className="border-b bg-red-100">
                    <td className="py-2 font-bold flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      TOTAL CUSTO + DESPESAS
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const custo = calcularCustoProdutosPorMes(mesNum);
                      const despesasFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      const despesasVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      const totalCustoEDespesas = custo + despesasFixas + despesasVariaveis;
                      return (
                        <td key={index} className="text-center py-2 font-bold text-red-600">
                          {formatarMoedaZeroDecimals(-totalCustoEDespesas)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-red-600">
                      {(() => {
                        const totalCusto = meses.reduce((total, _, index) => total + calcularCustoProdutosPorMes(index + 1), 0);
                        const totalFixas = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'fixa'), 0);
                        const totalVariaveis = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'variavel'), 0);
                        return formatarMoedaZeroDecimals(-(totalCusto + totalFixas + totalVariaveis));
                      })()}
                    </td>
                  </tr>

                  <tr className="border-t-2 border-gray-800 bg-green-50">
                    <td className="py-2 font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      LUCRO FINAL
                    </td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const faturamento = calcularFaturamentoPorMes(mesNum);
                      const custo = calcularCustoProdutosPorMes(mesNum);
                      const despesasFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      const despesasVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      const lucro = faturamento - custo - despesasFixas - despesasVariaveis;
                      return (
                        <td key={index} className={`text-center py-2 font-bold ${lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatarMoedaZeroDecimals(lucro)}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold">
                      {(() => {
                        const totalFaturamento = meses.reduce((total, _, index) => total + calcularFaturamentoPorMes(index + 1), 0);
                        const totalCusto = meses.reduce((total, _, index) => total + calcularCustoProdutosPorMes(index + 1), 0);
                        const totalFixas = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'fixa'), 0);
                        const totalVariaveis = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'variavel'), 0);
                        const totalLucro = totalFaturamento - totalCusto - totalFixas - totalVariaveis;
                        return (
                            <span className={`${totalLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatarMoedaZeroDecimals(totalLucro)}
                            </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* --- % LUCRO --- */}
                  <tr className="bg-green-50">
                    <td className="py-2 font-bold">% LUCRO</td>
                    {meses.map((_, index) => {
                      const mesNum = index + 1;
                      const faturamento = calcularFaturamentoPorMes(mesNum);
                      const custo = calcularCustoProdutosPorMes(mesNum);
                      const despesasFixas = calcularDespesasPorMes(mesNum, 'fixa');
                      const despesasVariaveis = calcularDespesasPorMes(mesNum, 'variavel');
                      const lucro = faturamento - custo - despesasFixas - despesasVariaveis;
                      const percentual = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
                      return (
                        <td key={index} className={`text-center py-2 font-bold ${percentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {percentual.toFixed(1)}%
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold">
                      {(() => {
                        const totalFaturamento = meses.reduce((total, _, index) => total + calcularFaturamentoPorMes(index + 1), 0);
                        const totalCusto = meses.reduce((total, _, index) => total + calcularCustoProdutosPorMes(index + 1), 0);
                        const totalFixas = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'fixa'), 0);
                        const totalVariaveis = meses.reduce((total, _, index) => total + calcularDespesasPorMes(index + 1, 'variavel'), 0);
                        const totalLucro = totalFaturamento - totalCusto - totalFixas - totalVariaveis;
                        const totalPercentual = totalFaturamento > 0 ? (totalLucro / totalFaturamento) * 100 : 0;
                        return (
                            <span className={`${totalPercentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalPercentual.toFixed(1)}%
                            </span>
                        );
                      })()}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal para Despesas */}
        {showModalDespesa && (
          <ModalDespesa
            despesa={despesaEditando}
            onSubmit={handleSalvarDespesa}
            onFechar={() => {
              setShowModalDespesa(false);
              setDespesaEditando(null);
            }}
            mesAtual={mesAtual}
            anoAtual={anoSelecionado}
          />
        )}

        {/* Dialog de Confirmação de Exclusão */}
        <AlertDialog open={!!despesaParaExcluir} onOpenChange={setDespesaParaExcluir}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a despesa "{despesaParaExcluir?.nome}"? Isso a tornará inativa para este mês/ano, mas manterá seu histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleExcluirDespesa} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Legenda explicativa */}
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-semibold mb-2">Legenda:</h4>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Mês corrente - valores calculados automaticamente (não editável)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded cursor-pointer"></div>
              <span>Meses anteriores - clique para editar manualmente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
