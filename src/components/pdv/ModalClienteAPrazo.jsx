import React, { useState, useEffect } from 'react';
import { Cliente } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

export default function ModalClienteAPrazo({ total, vendaAtual, onSubmit, onFechar }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [dataPagamento, setDataPagamento] = useState(null);

  useEffect(() => {
    const carregarClientes = async () => {
      const lista = await Cliente.list('', 0); // carregar todos
      // Map local de dias fixos (fallback se backend não persiste ainda)
      let diasMap = {};
      try { diasMap = JSON.parse(localStorage.getItem('clientes_aprazo_diafixo') || '{}'); } catch {}

      // Detecta se algum cliente já veio com compra_aprazo true do backend
      const backendHasCompraPrazo = lista.some(c => c.compra_aprazo === true);
      // Detecta se backend já envia algum dia_fixo_pagamento
      const backendHasDiaFixo = lista.some(c => c.dia_fixo_pagamento != null);

      let apenasPrazo;
      if (backendHasCompraPrazo) {
        // Usa flag do backend; ainda assim aplica fallback de dia fixo se backend não enviou para aquele cliente
        apenasPrazo = lista
          .filter(c => c.compra_aprazo)
          .map(c => ({
            ...c,
            dia_fixo_pagamento: c.dia_fixo_pagamento != null ? c.dia_fixo_pagamento : diasMap[c.id]
          }));
      } else {
        // Fallback local da flag + dia
        let localSet = new Set();
        try { localSet = new Set(JSON.parse(localStorage.getItem('clientes_aprazo_ids') || '[]')); } catch {}
        apenasPrazo = lista
          .filter(c => c.compra_aprazo || localSet.has(c.id))
          .map(c => ({
            ...c,
            dia_fixo_pagamento: c.dia_fixo_pagamento != null ? c.dia_fixo_pagamento : diasMap[c.id]
          }));
      }

      // Se o backend já fornece todos os dias fixos para os clientes a prazo, podemos limpar o storage local de dias
      if (backendHasDiaFixo) {
        // Verifica se ainda existe algum cliente sem dia vindo do backend mas com local
        const algumDependenteLocal = apenasPrazo.some(c => c.dia_fixo_pagamento == null && diasMap[c.id] != null);
        if (!algumDependenteLocal) {
          localStorage.removeItem('clientes_aprazo_diafixo');
        }
      }

      setClientes(apenasPrazo);
    };
    carregarClientes();
  }, []);
  
  const handleSubmit = () => {
    if (!clienteSelecionado) {
      alert("Selecione um cliente.");
      return;
    }
    if (!dataPagamento) {
      alert("Selecione a data de pagamento.");
      return;
    }

    onSubmit({
      cliente_id: clienteSelecionado.id,
      data_pagamento: dataPagamento.toISOString().split('T')[0],
      cliente_dados: clienteSelecionado
    });
  };
  
  const formatarEndereco = (cliente) => {
    const parts = [
        cliente.rua,
        cliente.numero,
        cliente.complemento,
        cliente.bairro,
        cliente.cidade
    ];
    return parts.filter(Boolean).join(', ');
  }

  const clientesFiltrados = clientes.filter(c => 
    (c.nome?.toLowerCase().includes(busca.toLowerCase())) ||
    (formatarEndereco(c).toLowerCase().includes(busca.toLowerCase()))
  );

  const proximaDataDia = (dia) => {
    if (!dia) return null;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesBase = hoje.getMonth();
    const tentar = (anoRef, mesRef) => {
      const ultimoDiaMes = new Date(anoRef, mesRef + 1, 0).getDate();
      const diaAjustado = Math.min(dia, ultimoDiaMes);
      return new Date(anoRef, mesRef, diaAjustado);
    };
    let data = tentar(ano, mesBase);
    if (data < hoje) {
      data = tentar(ano, mesBase + 1);
    }
    return data;
  };

  const handleSelectCliente = (cliente) => {
    setClienteSelecionado(cliente);
    if (cliente.dia_fixo_pagamento && !dataPagamento) {
      const prox = proximaDataDia(parseInt(cliente.dia_fixo_pagamento, 10));
      if (prox) setDataPagamento(prox);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Venda a Prazo - Selecionar Cliente</DialogTitle>
        </DialogHeader>
        <div className="flex-grow flex flex-col min-h-0 py-4 space-y-4">
          <Input 
            placeholder="Digite parte do nome ou endereço para buscar..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <div className="flex-grow border rounded-md overflow-y-auto p-2 space-y-2">
            {clientesFiltrados.length === 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">
                {busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente habilitado para comprar a prazo.'}
              </div>
            )}
    {clientesFiltrados.map(cliente => (
                <div 
                  key={cliente.id}
                  onClick={() => handleSelectCliente(cliente)}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    clienteSelecionado?.id === cliente.id 
                      ? 'bg-blue-200 border-blue-400 text-black' 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
      <p className="font-bold">[{cliente.codigo}] {cliente.nome}{cliente.dia_fixo_pagamento ? ` • Dia ${String(cliente.dia_fixo_pagamento).padStart(2,'0')}` : ''}</p>
                  <p className="text-sm">{formatarEndereco(cliente)}</p>
                </div>
            ))}
          </div>
          <div className="flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPagamento ? format(dataPagamento, 'PPP') : <span>Selecione a data de pagamento</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dataPagamento}
                  onSelect={setDataPagamento}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleSubmit}>Confirmar Venda a Prazo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}