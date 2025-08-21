import React, { useState, useEffect, useCallback } from 'react';
import { Cliente } from '@/api/entities';
import { Bairro } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, ArrowLeft, UserPlus, ShieldCheck, CalendarDays } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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

const STORAGE_KEY = 'novoClienteFormData';

const initialFormState = {
  codigo: '',
  nome: '',
  telefone: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  compra_aprazo: false
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [busca, setBusca] = useState('');
  const [novoCliente, setNovoCliente] = useState(initialFormState);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [clientesComBairroInvalido, setClientesComBairroInvalido] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isPrefixFixing, setIsPrefixFixing] = useState(false);
  const [isFixingSufixoI, setIsFixingSufixoI] = useState(false);
  const [isDeletingInvalidBairros, setIsDeletingInvalidBairros] = useState(false);
  // Persistência local: ids de clientes com permissão a prazo (fallback se backend não salva campo custom)
  const PRAZO_STORAGE_KEY = 'clientes_aprazo_ids';
  const PRAZO_DIA_STORAGE_KEY = 'clientes_aprazo_diafixo';
  const loadLocalPrazoSet = () => {
    try { return new Set(JSON.parse(localStorage.getItem(PRAZO_STORAGE_KEY) || '[]')); } catch { return new Set(); }
  };
  const saveLocalPrazoSet = (setIds) => { try { localStorage.setItem(PRAZO_STORAGE_KEY, JSON.stringify(Array.from(setIds))); } catch {} };
  const loadLocalDiasMap = () => { try { return JSON.parse(localStorage.getItem(PRAZO_DIA_STORAGE_KEY) || '{}'); } catch { return {}; } };
  const saveLocalDiasMap = (obj) => { try { localStorage.setItem(PRAZO_DIA_STORAGE_KEY, JSON.stringify(obj)); } catch {} };
  const aplicarFlagsLocais = (lista) => {
    const setIds = loadLocalPrazoSet();
    const diasMap = loadLocalDiasMap();
    return lista.map(c => ({ ...c, compra_aprazo: !!c.compra_aprazo || setIds.has(c.id), dia_fixo_pagamento: c.dia_fixo_pagamento || diasMap[c.id] }));
  };

  const carregarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const lista = await Cliente.list('-created_date');
      // Detecta se o backend já está persistindo nativamente (algum registro voltou com true)
      const backendHasAny = lista.some(c => c.compra_aprazo === true);
      if (backendHasAny) {
        // Se havia flags locais, tenta migrar rapidamente para backend (para ids que ainda não vieram true)
        const localSet = loadLocalPrazoSet();
        if (localSet.size > 0) {
          const mapa = Object.fromEntries(lista.map(c => [c.id, c]));
          const pendentes = Array.from(localSet).filter(id => !(mapa[id]?.compra_aprazo));
          if (pendentes.length) {
            // Best-effort (ignora falhas individuais)
            await Promise.all(pendentes.map(id => Cliente.update(id, { compra_aprazo: true }).catch(() => {})));
            // Recarrega lista após migração
            const lista2 = await Cliente.list('-created_date');
            const diasMap = loadLocalDiasMap();
            setClientes(lista2.map(c => ({ ...c, compra_aprazo: !!c.compra_aprazo, dia_fixo_pagamento: c.dia_fixo_pagamento || diasMap[c.id] })));
          } else {
            const diasMap = loadLocalDiasMap();
            setClientes(lista.map(c => ({ ...c, compra_aprazo: !!c.compra_aprazo, dia_fixo_pagamento: c.dia_fixo_pagamento || diasMap[c.id] })));
          }
          // Limpa storage pois suporte backend confirmado
          localStorage.removeItem(PRAZO_STORAGE_KEY);
        } else {
          const diasMap = loadLocalDiasMap();
          setClientes(lista.map(c => ({ ...c, compra_aprazo: !!c.compra_aprazo, dia_fixo_pagamento: c.dia_fixo_pagamento || diasMap[c.id] })));
        }
      } else {
        // Backend ainda não persiste — aplica fallback local
        setClientes(aplicarFlagsLocais(lista));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarClientes();
    const savedData = sessionStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setNovoCliente(JSON.parse(savedData));
    }
  }, [carregarClientes]);

  useEffect(() => {
    if (showModal && !clienteEditando) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(novoCliente));
    }
  }, [novoCliente, showModal, clienteEditando]);

  const normalizeString = (str) => {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9\s]/g, '')   // Remove tudo que não for letra, número ou espaço
      .replace(/\s+/g, ' ')           // Colapsa múltiplos espaços em um só
      .trim();
  };

  const handleVerifyBairros = async () => {
    setVerifying(true);
    try {
  const todosClientes = await Cliente.list('', 0);
  // Agora a verificação é local: clientes sem bairro preenchido
  const invalidos = todosClientes.filter(c => !c.bairro || typeof c.bairro !== 'string' || c.bairro.trim() === '');

      setClientesComBairroInvalido(invalidos);
      setShowVerifyModal(true);

    } catch (error) {
      console.error("Erro ao verificar bairros:", error);
      alert("Ocorreu um erro ao verificar os bairros dos clientes.");
    } finally {
      setVerifying(false);
    }
  };

  const fixBairroString = (bairro) => {
    if (typeof bairro !== 'string') return '';

    let cleanedBairro = bairro;

    // 1. Remove a sigla "SP" e tudo que vier depois dela.
    cleanedBairro = cleanedBairro.replace(/\s*SP.*$/i, '');

    // 2. Remove numerais romanos (I, II, III, IV) no final da string.
  // Somente quando forem um token separado no final (evita remover o "i" de palavras como "Guarani" ou "Nambi").
  cleanedBairro = cleanedBairro.replace(/\s+(?:IV|III|II|I)\s*$/i, '');

    // 3. Remove todos os números arábicos.
    cleanedBairro = cleanedBairro.replace(/[0-9]/g, '');

    // 4. Remove vírgulas e traços.
    cleanedBairro = cleanedBairro.replace(/[,-]/g, '');

    // 5. Colapsa múltiplos espaços em um só.
    cleanedBairro = cleanedBairro.replace(/\s+/g, ' ');

    // 6. Limpa espaços em branco no início/fim.
    return cleanedBairro.trim();
  };

  const handleFixBairro = async (cliente) => {
    try {
      const bairroCorrigido = fixBairroString(cliente.bairro);
      await Cliente.update(cliente.id, { bairro: bairroCorrigido });
      setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));
      // Opcional: recarregar a lista principal de clientes se a exibição principal precisar ser atualizada imediatamente.
      // await carregarClientes(); 
    } catch (error) {
      console.error("Erro ao corrigir bairro do cliente:", error);
      alert("Erro ao corrigir o bairro do cliente.");
    }
  };

  // Marca somente um cliente com a mensagem de atenção quando o bairro está vazio
  const handleMarkAttentionOne = async (cliente) => {
    try {
      await Cliente.update(cliente.id, { bairro: 'ATENÇÃO CADASTRAR BAIRRO' });
      setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));
    } catch (error) {
      console.error('Erro ao marcar atenção para o cliente:', error);
      alert('Erro ao marcar atenção para o cliente.');
    }
  };

  // Exclui (limpa) todos os bairros que não batem com a tabela oficial, 1 por segundo
  const handleDeleteInvalidBairrosAuto = async () => {
    setIsDeletingInvalidBairros(true);
    setClientesComBairroInvalido(currentInvalidos => {
      const runDelete = async () => {
        const clientesParaExcluirBairro = [...currentInvalidos];
        for (const cliente of clientesParaExcluirBairro) {
          try {
      await Cliente.update(cliente.id, { bairro: 'ATENÇÃO CADASTRAR BAIRRO' });
            setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
      console.error(`Erro ao atualizar bairro do cliente ${cliente.nome}:`, error);
          }
        }
        setIsDeletingInvalidBairros(false);
        await carregarClientes();
    alert('Atualização concluída: clientes sem bairro foram marcados com "ATENÇÃO CADASTRAR BAIRRO".');
        setShowVerifyModal(false);
      };
      runDelete();
      return currentInvalidos;
    });
  };

  const handleFixAllBairrosAuto = async () => {
    setIsAutoFixing(true);

    // Usamos uma função de callback com setState para garantir que estamos usando o estado mais recente.
    setClientesComBairroInvalido(currentInvalidos => {
      const runFix = async () => {
        const clientesParaCorrigir = [...currentInvalidos]; // Copia da lista no momento do início

        for (const cliente of clientesParaCorrigir) {
          try {
            const bairroCorrigido = fixBairroString(cliente.bairro);
            await Cliente.update(cliente.id, { bairro: bairroCorrigido });

            // Atualiza o estado para remover o cliente corrigido da lista na UI
            setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));

            // Espera 1 segundo antes de ir para o próximo
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Erro ao corrigir bairro do cliente ${cliente.nome}:`, error);
            // Continua para o próximo cliente mesmo se um falhar
          }
        }

        // Após o loop, finaliza o processo
        setIsAutoFixing(false);
        await carregarClientes();
        alert(`Processo de correção automática finalizado!`);
        setShowVerifyModal(false); // Fecha o modal ao concluir
      };

      runFix(); // Inicia o processo de correção
      return currentInvalidos; // Retorno para o setState, não altera o estado inicial ainda
    });
  };

  const handleFixBairrosComPrefixoAuto = async () => {
    setIsPrefixFixing(true);
    setClientesComBairroInvalido(currentInvalidos => {
      const runFix = async () => {
        const clientesParaCorrigir = [...currentInvalidos];

        for (const cliente of clientesParaCorrigir) {
          try {
            const bairroNormalizado = normalizeString(cliente.bairro);
            if (bairrosComPrefixoMap[bairroNormalizado]) {
              const bairroCorrigido = bairrosComPrefixoMap[bairroNormalizado];
              await Cliente.update(cliente.id, { bairro: bairroCorrigido });

              setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));

              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Erro ao corrigir prefixo do bairro para o cliente ${cliente.nome}:`, error);
          }
        }

        setIsPrefixFixing(false);
        await carregarClientes();
        alert('Processo de correção de prefixos finalizado!');
        // Não fecha o modal para o usuário poder rodar a outra verificação se quiser
      };

      runFix();
      return currentInvalidos;
    });
  };

  // Corrige nomes que perderam o sufixo "i" (ex.: Vila Namb -> Vila Nambi)
  const handleFixSufixoIAuto = async () => {
    setIsFixingSufixoI(true);
    setClientesComBairroInvalido(currentInvalidos => {
      const runFix = async () => {
        const clientesParaCorrigir = [...currentInvalidos];
        // Carrega todos os bairros oficiais para validar se adicionar um "i" resolve
        let nomesBairrosOficiais = new Set();
        try {
          const bairrosOficiais = await Bairro.list('', 0);
          nomesBairrosOficiais = new Set(bairrosOficiais.map(b => normalizeString(b.nome)));
        } catch (e) {
          console.error('Falha ao obter bairros oficiais para correção de sufixo i:', e);
        }

        for (const cliente of clientesParaCorrigir) {
          try {
            const original = (cliente.bairro || '').trim();
            if (!original) continue;
            if (/i$/i.test(original)) continue; // já termina com i

            const bairroNormalizado = normalizeString(original);

            let bairroCorrigido = null;

            // 1) Tentativa dinâmica: acrescentar 'i' ao final e validar contra a lista oficial
            const candidato = original + 'i';
            const candidatoNormalizado = normalizeString(candidato);
            if (nomesBairrosOficiais.has(candidatoNormalizado)) {
              bairroCorrigido = candidato;
            }

            // 2) Fallback: mapa estático de correções conhecidas
            if (!bairroCorrigido && bairrosSufixoIMap[bairroNormalizado]) {
              bairroCorrigido = bairrosSufixoIMap[bairroNormalizado];
            }

            if (bairroCorrigido) {
              await Cliente.update(cliente.id, { bairro: bairroCorrigido });
              setClientesComBairroInvalido(prev => prev.filter(c => c.id !== cliente.id));
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Erro ao corrigir sufixo 'i' para o cliente ${cliente.nome}:`, error);
          }
        }

        setIsFixingSufixoI(false);
        await carregarClientes();
        alert('Processo de correção de sufixo "i" finalizado!');
      };

      runFix();
      return currentInvalidos;
    });
  };

  const handleOpenModal = async (cliente = null) => {
    if (cliente) {
      setClienteEditando(cliente);
      setNovoCliente({ ...cliente, compra_aprazo: !!cliente.compra_aprazo });
    } else {
      setClienteEditando(null);
      const savedData = sessionStorage.getItem(STORAGE_KEY);
      if (savedData) {
        setNovoCliente(JSON.parse(savedData));
      } else {
        const ultimoCliente = await Cliente.list('-codigo', 1);
        const novoCodigo = ultimoCliente.length > 0 ? (parseInt(ultimoCliente[0].codigo, 10) || 0) + 1 : 3000;
        setNovoCliente({ ...initialFormState, codigo: novoCodigo.toString() });
      }
    }
    setShowModal(true);
  };

  const handleCancelModal = () => {
    setShowModal(false);
    setClienteEditando(null);
    setNovoCliente(initialFormState);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const handleSubmit = async () => {
    if (!novoCliente.nome || !novoCliente.rua) {
      alert('Nome e Rua são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      if (clienteEditando) {
        await Cliente.update(clienteEditando.id, novoCliente);
      } else {
        await Cliente.create({ ...novoCliente });
      }
      // Atualiza a persistência local imediatamente após salvar
      if (!clienteEditando) {
        const setIds = loadLocalPrazoSet();
        if (novoCliente.compra_aprazo) {
          setIds.add(novoCliente.id);
        } else {
          setIds.delete(novoCliente.id);
        }
        saveLocalPrazoSet(setIds);
      }
      sessionStorage.removeItem(STORAGE_KEY);
      setShowModal(false);
      setNovoCliente(initialFormState);
      await carregarClientes();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!clienteParaExcluir) return;
    try {
      await Cliente.delete(clienteParaExcluir.id);
      setClienteParaExcluir(null);
      await carregarClientes();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Erro ao excluir cliente.");
    }
  };

  const clientesFiltrados = clientes.filter(c =>
    (c.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (c.codigo || '').toString().includes(busca)
  );

  const toggleCompraAPrazoRapido = async (cliente) => {
  // Quando o backend já suportar o campo, o carregarClientes detectará e limpará o fallback local.
  // Este toggle continua funcional: se backend persistir, ótimo; se não, mantemos localStorage.
    try {
      const novoValor = !cliente.compra_aprazo;
      await Cliente.update(cliente.id, { compra_aprazo: novoValor });

      // Atualiza a persistência local imediatamente
      const setIds = loadLocalPrazoSet();
      if (novoValor) {
        setIds.add(cliente.id);
      } else {
        setIds.delete(cliente.id);
      }
      saveLocalPrazoSet(setIds);

      setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, compra_aprazo: novoValor } : c));
    } catch (e) {
      console.error('Falha ao atualizar flag compra_aprazo:', e);
      alert('Erro ao atualizar flag A Prazo.');
    }
  };

  const definirDiaFixo = async (cliente) => {
    const atual = cliente.dia_fixo_pagamento ? String(cliente.dia_fixo_pagamento) : '';
    const entrada = prompt('Dia fixo de pagamento (1-31):', atual);
    if (entrada === null) return;
    const dia = parseInt(entrada, 10);
    if (isNaN(dia) || dia < 1 || dia > 31) { alert('Dia inválido.'); return; }
    const map = loadLocalDiasMap();
    map[cliente.id] = dia;
    saveLocalDiasMap(map);
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, dia_fixo_pagamento: dia } : c));
    try { await Cliente.update(cliente.id, { dia_fixo_pagamento: dia }); } catch {}
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Cadastro de Clientes</h1>
          <div className="flex gap-2 flex-wrap">
            <Link to={createPageUrl("Gerencia")}>
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </Link>
            <Button onClick={handleVerifyBairros} disabled={verifying} variant="secondary">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {verifying ? 'Verificando...' : 'Verificar Bairros'}
            </Button>
            <Button onClick={() => handleOpenModal()}><UserPlus className="w-4 h-4 mr-2" />Novo Cliente</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nome ou código..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-center">A Prazo?</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell></TableRow>
                  ) : clientesFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum cliente encontrado.</TableCell></TableRow>
                  ) : (
                    clientesFiltrados.map(cliente => (
                      <TableRow key={cliente.id}>
                        <TableCell>{cliente.codigo}</TableCell>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell>{cliente.telefone}</TableCell>
                        <TableCell>{`${cliente.rua}, ${cliente.numero} - ${cliente.bairro}`}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={!!cliente.compra_aprazo} onCheckedChange={() => toggleCompraAPrazoRapido(cliente)} />
                        </TableCell>
                        <TableCell className="text-right flex gap-1 justify-end">
                          {cliente.compra_aprazo && (
                            <Button variant="ghost" size="icon" onClick={() => definirDiaFixo(cliente)} title={cliente.dia_fixo_pagamento ? `Dia fixo: ${String(cliente.dia_fixo_pagamento).padStart(2,'0')}` : 'Definir dia fixo'}>
                              <CalendarDays className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cliente)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setClienteParaExcluir(cliente)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{clienteEditando ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="md:col-span-2">
                <label>Código</label>
                <Input value={novoCliente.codigo} onChange={e => setNovoCliente(p => ({ ...p, codigo: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label>Nome *</label>
                <Input value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div>
                <label>Telefone</label>
                <Input value={novoCliente.telefone} onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))} />
              </div>
              <div>
                <label>CEP</label>
                <Input value={novoCliente.cep} onChange={e => setNovoCliente(p => ({ ...p, cep: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label>Rua *</label>
                <Input value={novoCliente.rua} onChange={e => setNovoCliente(p => ({ ...p, rua: e.target.value }))} />
              </div>
              <div>
                <label>Número</label>
                <Input value={novoCliente.numero} onChange={e => setNovoCliente(p => ({ ...p, numero: e.target.value }))} />
              </div>
              <div>
                <label>Complemento</label>
                <Input value={novoCliente.complemento} onChange={e => setNovoCliente(p => ({ ...p, complemento: e.target.value }))} />
              </div>
              <div>
                <label>Bairro</label>
                <Input value={novoCliente.bairro} onChange={e => setNovoCliente(p => ({ ...p, bairro: e.target.value }))} />
              </div>
              <div>
                <label>Cidade</label>
                <Input value={novoCliente.cidade} onChange={e => setNovoCliente(p => ({ ...p, cidade: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Switch id="compra_aprazo" checked={!!novoCliente.compra_aprazo} onCheckedChange={(v) => setNovoCliente(p => ({ ...p, compra_aprazo: v }))} />
                <label htmlFor="compra_aprazo" className="cursor-pointer">Cliente pode comprar A Prazo</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelModal}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Cliente'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!clienteParaExcluir} onOpenChange={() => setClienteParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o cliente "{clienteParaExcluir?.nome}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Verificação de Bairros</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {clientesComBairroInvalido.length > 0 ? (
                <>
                  <p className="mb-4">
                    Foram encontrados <span className="font-bold">{clientesComBairroInvalido.length}</span> clientes sem bairro cadastrado.
                  </p>
                  <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Bairro</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientesComBairroInvalido.map(cliente => (
                          <TableRow key={cliente.id}>
                            <TableCell>{cliente.nome}</TableCell>
                            <TableCell className="font-mono text-red-500">{(cliente.bairro || '').trim() === '' ? '—' : cliente.bairro}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="secondary" size="sm" onClick={() => handleMarkAttentionOne(cliente)} disabled={isAutoFixing || isPrefixFixing || isFixingSufixoI || isDeletingInvalidBairros}>
                                Marcar Atenção
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Tudo Certo!</h3>
                  <p className="text-muted-foreground">Nenhum cliente sem bairro foi encontrado.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVerifyModal(false)} disabled={isAutoFixing || isPrefixFixing || isFixingSufixoI || isDeletingInvalidBairros}>Fechar</Button>
              {clientesComBairroInvalido.length > 0 && (
                <>
                  <Button variant="destructive" onClick={handleDeleteInvalidBairrosAuto} disabled={isDeletingInvalidBairros || isAutoFixing || isPrefixFixing || isFixingSufixoI}>
                    {isDeletingInvalidBairros ? `Marcando Atenção... (${clientesComBairroInvalido.length})` : `Marcar Atenção em Todos`}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}