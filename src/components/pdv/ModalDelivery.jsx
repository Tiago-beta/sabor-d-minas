
import React, { useState, useEffect } from 'react';
import { Cliente } from '@/api/entities';
import { Bairro } from '@/api/entities';
// Integrações removidas - stubs
const UploadFile = async ({ file }) => ({ file_url: URL.createObjectURL(file) });
const ExtractDataFromUploadedFile = async () => ({ rows: [] });
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Search, Edit, Trash2, FileSpreadsheet, Truck, X, Users, MapPin } from 'lucide-react';
import { uniqWith, isEqual } from 'lodash';

// New ModalCadastroCliente component
const ModalCadastroCliente = ({ isOpen, onClose, onClienteAdicionado }) => {
  const [novoCliente, setNovoCliente] = useState({
    codigo: '',
    nome: '',
    telefone: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    cep: ''
  });
  const [bairrosCadastrados, setBairrosCadastrados] = useState([]);
  const [bairrosFiltrados, setBairrosFiltrados] = useState([]); // Added for autocomplete
  const [showSugestoes, setShowSugestoes] = useState(false); // Added for autocomplete
  const [loading, setLoading] = useState(false);
  const [showBuscarEnderecos, setShowBuscarEnderecos] = useState(false); // Kept existing
  const [buscaEndereco, setBuscaEndereco] = useState(''); // Kept existing
  const [todosClientes, setTodosClientes] = useState([]); // Kept existing

  useEffect(() => {
    if (isOpen) {
      carregarBairros();
      carregarTodosClientesParaBusca(); // Kept existing
      gerarProximoCodigo();
    }
  }, [isOpen]);

  const carregarBairros = async () => {
    try {
      const lista = await Bairro.list();
      setBairrosCadastrados(lista);
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
    }
  };

  const carregarTodosClientesParaBusca = async () => {
    try {
      const lista = await Cliente.list("-created_date");
      setTodosClientes(lista);
    } catch (error) {
      console.error('Erro ao carregar clientes para busca de endereço:', error);
    }
  };

  const gerarProximoCodigo = async () => {
    try {
      const allClients = await Cliente.list();
      const maxCode = Math.max(2999, ...allClients.map(c => parseInt(c.codigo)).filter(c => !isNaN(c)));
      setNovoCliente(prev => ({
        ...prev,
        codigo: (maxCode + 1).toString()
      }));
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error);
      setNovoCliente(prev => ({
        ...prev,
        codigo: '3000'
      }));
    }
  };

  const parseEnderecoSimples = (fullAddress) => {
    try {
      if (!fullAddress || typeof fullAddress !== 'string') return null;

      let endereco = fullAddress.trim();
      let rua = '', numero = '', bairro = '', cidade = '', complemento = '', cep = '';

      // 1. Extrai CEP primeiro
      const cepMatch = endereco.match(/(\d{5}-\d{3})/);
      if (cepMatch) {
        cep = cepMatch[1];
        endereco = endereco.replace(cep, '').replace(/,?\s*cep\s*/i, '').trim();
      }

      // 2. Remove SP e outros identificadores
      endereco = endereco.replace(/,?\s*-\s*SP\b/i, '').trim();
      endereco = endereco.replace(/\s*\*\([A-Z]\)\*/g, '').trim();

      // 3. Extrai cidade
      const cidades = ["Campo Limpo Paulista", "Várzea Paulista", "Jundiaí"];
      for (const c of cidades) {
        const regex = new RegExp(`[,\\s-]*${c}[,.]*`, 'i');
        if (regex.test(endereco)) {
          cidade = c;
          endereco = endereco.replace(regex, '').trim().replace(/,$/, '').trim();
          break;
        }
      }

      // 4. Extrai número
      const numeroMatch = endereco.match(/,?\s+(\d+[A-Za-z]?)(?=\s|,|$)/);
      if (numeroMatch) {
        numero = numeroMatch[1];
        const numeroIndex = endereco.lastIndexOf(numeroMatch[0]);
        rua = endereco.substring(0, numeroIndex).trim().replace(/,$/, '');
        bairro = endereco.substring(numeroIndex + numeroMatch[0].length).trim().replace(/^,/, '').trim();
      } else {
        rua = endereco; // Sem número encontrado
      }

      // 5. Separa complemento (Ap, Bloco) do Bairro
      const compMatch = bairro.match(/(Ap|Apto|Apartamento|Bloco|Bl|Casa|Cd)\s*[\w\d]+/i);
      if (compMatch) {
        complemento = (complemento ? complemento + ' ' : '') + compMatch[0];
        bairro = bairro.replace(compMatch[0], '').trim().replace(/^,/, '').trim();
      }

      // 6. Limpeza final
      rua = rua.replace(/^R\.\s/i, 'Rua ').trim();
      bairro = bairro.replace(/,$/, '').trim().replace(/^[-\s]*/, '').replace(/[()]/g, '').trim();

      return { rua, numero, bairro, cidade, complemento, cep };
    } catch (error) {
      console.error('Erro ao processar endereço:', fullAddress, error);
      return null;
    }
  };

  const organizarEnderecoNovoCliente = () => {
    if (!novoCliente.rua) {
      alert('Digite o endereço completo no campo "Rua" para organizar.');
      return;
    }

    const parsed = parseEnderecoSimples(novoCliente.rua);
    if (parsed) {
      setNovoCliente(prev => ({
        ...prev,
        rua: parsed.rua || prev.rua,
        numero: parsed.numero || prev.numero,
        complemento: parsed.complemento || prev.complemento,
        bairro: parsed.bairro || prev.bairro,
        cidade: parsed.cidade || prev.cidade,
        cep: parsed.cep || prev.cep
      }));
    } else {
      alert('Não foi possível organizar o endereço. Verifique o formato.');
    }
  };

  const normalizeText = (text = '') => {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const handleBairroChange = (value) => {
    setNovoCliente(prev => ({ ...prev, bairro: value }));
    
    if (value.length >= 2) {
      const valorNormalizado = normalizeText(value);
      const sugestoes = bairrosCadastrados.filter(b => 
        normalizeText(b.nome).includes(valorNormalizado)
      ).slice(0, 5);
      
      setBairrosFiltrados(sugestoes);
      setShowSugestoes(true);
    } else {
      setShowSugestoes(false);
    }
  };

  const selecionarBairro = (bairro) => {
    setNovoCliente(prev => ({ 
      ...prev, 
      bairro: bairro.nome,
      cidade: bairro.cidade || prev.cidade 
    }));
    setShowSugestoes(false);
  };

  const validarBairro = (bairroDigitado) => {
  if (!bairroDigitado || !bairrosCadastrados.length) return true; // Permite vazio
  const typed = String(bairroDigitado).trim();
  return bairrosCadastrados.some(b => (b?.nome || '').trim() === typed);
  };

  const handleSubmit = async () => {
    if (!novoCliente.nome || !novoCliente.rua) {
      alert('Preencha pelo menos nome e rua!');
      return;
    }

    // Validar bairro se foi preenchido
    if (novoCliente.bairro && !validarBairro(novoCliente.bairro)) {
      alert(`O bairro "${novoCliente.bairro}" não está cadastrado na tabela de fretes. Por favor, cadastre o bairro primeiro no Gerenciamento de Fretes.`);
      return;
    }

    setLoading(true);
    try {
      const clienteCriado = await Cliente.create(novoCliente);
      onClienteAdicionado(clienteCriado);
      setNovoCliente({
        codigo: '', nome: '', telefone: '', rua: '', numero: '',
        complemento: '', bairro: '', cidade: '', cep: ''
      });
      onClose();
    } catch (error) {
      console.error('Erro ao cadastrar cliente:', error);
      alert('Erro ao cadastrar cliente.');
    } finally {
      setLoading(false);
    }
  };

  // Logic for the new "Buscar Endereços Cadastrados" dialog (moved from ModalDelivery)
  const enderecosFiltrados = todosClientes.filter(cliente => {
    if (!cliente.rua || cliente.rua.trim() === '') {
      return false;
    }
    
    if (!buscaEndereco || buscaEndereco.trim() === '') {
      return true;
    }
    
    const termo = buscaEndereco.toLowerCase().trim();
    return (
      (cliente.rua && cliente.rua.toLowerCase().includes(termo)) ||
      (cliente.bairro && cliente.bairro.toLowerCase().includes(termo)) ||
      (cliente.cidade && cliente.cidade.toLowerCase().includes(termo))
    );
  });

  const selecionarEndereco = (cliente) => {
    setNovoCliente(prev => ({
      ...prev,
      rua: cliente.rua || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      cep: cliente.cep || ''
    }));
    setShowBuscarEnderecos(false);
    setBuscaEndereco('');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Código</label>
              <Input
                placeholder="Código"
                value={novoCliente.codigo}
                onChange={(e) => setNovoCliente(prev => ({...prev, codigo: e.target.value}))}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
              <Input
                placeholder="Nome do cliente"
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente(prev => ({...prev, nome: e.target.value}))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
              <Input
                placeholder="Telefone (opcional)"
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente(prev => ({...prev, telefone: e.target.value}))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rua *</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da rua"
                  value={novoCliente.rua}
                  onChange={(e) => setNovoCliente(prev => ({...prev, rua: e.target.value}))}
                  className="flex-1"
                  required
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowBuscarEnderecos(true)}
                  className="px-3"
                  title="Buscar endereços cadastrados"
                >
                  <Search className="w-4 h-4" />
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={organizarEnderecoNovoCliente}
                  className="px-3"
                  title="Organizar Endereço"
                >
                  <Users className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                <Input
                  placeholder="123"
                  value={novoCliente.numero}
                  onChange={(e) => setNovoCliente(prev => ({...prev, numero: e.target.value}))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Complemento</label>
                <Input
                  placeholder="Apto 1"
                  value={novoCliente.complemento}
                  onChange={(e) => setNovoCliente(prev => ({...prev, complemento: e.target.value}))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="text-sm font-medium text-gray-400">Bairro</label>
                <Input
                  value={novoCliente.bairro}
                  onChange={(e) => handleBairroChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                  onFocus={() => {
                    if (novoCliente.bairro.length >= 2) {
                      handleBairroChange(novoCliente.bairro);
                    }
                  }}
                  placeholder="Nome do bairro"
                  className="mt-1"
                  style={{ 
                    color: 'white !important', 
                    backgroundColor: '#374151 !important',
                    borderColor: '#4b5563 !important',
                    borderWidth: '1px',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem'
                  }}
                />
                
                {/* Dropdown de sugestões */}
                {showSugestoes && bairrosFiltrados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-md mt-1 z-50 max-h-40 overflow-y-auto">
                    {bairrosFiltrados.map((bairro) => (
                      <div
                        key={bairro.id}
                        onClick={() => selecionarBairro(bairro)}
                        className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium">{bairro.nome}</div>
                        {bairro.cidade && (
                          <div className="text-xs text-gray-400">{bairro.cidade}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {novoCliente.bairro && !validarBairro(novoCliente.bairro) && (
                  <p className="text-red-500 text-xs mt-1">
                    Bairro não cadastrado ou diferente da grafia oficial.
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-400">Cidade</label>
                <Input
                  value={novoCliente.cidade}
                  onChange={(e) => setNovoCliente(prev => ({ ...prev, cidade: e.target.value }))}
                  placeholder="Nome da cidade"
                  className="mt-1"
                  style={{ 
                    color: 'white !important', 
                    backgroundColor: '#374151 !important',
                    borderColor: '#4b5563 !important',
                    borderWidth: '1px',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem'
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">CEP</label>
              <Input
                placeholder="CEP (opcional)"
                value={novoCliente.cep}
                onChange={(e) => setNovoCliente(prev => ({...prev, cep: e.target.value}))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para buscar endereços - moved from ModalDelivery */}
      <Dialog open={showBuscarEnderecos} onOpenChange={setShowBuscarEnderecos}>
        <DialogContent className="max-w-2xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>Buscar Endereços Cadastrados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por rua, bairro ou cidade..."
                value={buscaEndereco}
                onChange={(e) => setBuscaEndereco(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {enderecosFiltrados.length > 0 ? (
                <div className="space-y-2">
                  {uniqWith(enderecosFiltrados, (a, b) => isEqual(a.rua, b.rua) && isEqual(a.bairro, b.bairro) && isEqual(a.cidade, b.cidade) )
                  .map((cliente, index) => (
                    <div 
                      key={cliente.id || `temp-${index}`}
                      className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => selecionarEndereco(cliente)}
                    >
                      <div className="font-medium">{cliente.rua || 'Rua não informada'}</div>
                      <div className="text-sm text-gray-600">
                        {[cliente.bairro, cliente.cidade].filter(Boolean).join(', ') || 'Bairro/Cidade não informados'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {buscaEndereco ? 'Nenhum endereço encontrado para esta busca' : 'Nenhum endereço cadastrado encontrado'}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuscarEnderecos(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function ModalDelivery({ vendaAtual, dadosPagamento, onFinalizar, onFechar }) {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [observacoes, setObservacoes] = useState('');
  const [pixPago, setPixPago] = useState(false);
  const [clienteParaEditar, setClienteParaEditar] = useState(null);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  // Bairros oficiais para validar no modal Editar Cliente
  const [bairrosOficiais, setBairrosOficiais] = useState([]);
  // Autocomplete Editar Cliente
  const [bairrosFiltradosEditar, setBairrosFiltradosEditar] = useState([]);
  const [showSugestoesEditar, setShowSugestoesEditar] = useState(false);

  // New states for the refactored modals
  const [modalCadastroCliente, setModalCadastroCliente] = useState(false);
  const [todosClientes, setTodosClientes] = useState([]); // All clients for address search

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const lista = await Cliente.list("-created_date");
        setClientes(lista);
        setTodosClientes(lista); // Also load for address search
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };
    carregarClientes();
  }, []);

  // Carrega todos os bairros oficiais para validação no modal de edição
  useEffect(() => {
    const carregarBairrosOficiais = async () => {
      try {
        const lista = await Bairro.list('', 0); // busca todos
        setBairrosOficiais(lista || []);
      } catch (e) {
        console.error('Erro ao carregar bairros oficiais:', e);
      }
    };
    carregarBairrosOficiais();
  }, []);

  // Normalização e validação do bairro digitado no modal de edição
  const validarBairroEditar = (bairroDigitado) => {
    if (!bairroDigitado || !bairrosOficiais.length) return true; // permite vazio
    const typed = String(bairroDigitado).trim();
    return bairrosOficiais.some(b => (b?.nome || '').trim() === typed);
  };

  // Helpers para autocomplete no modal de edição
  const normalizeTextEdit = (text = '') => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const handleBairroEditarChange = (value) => {
    setClienteParaEditar(prev => ({ ...prev, bairro: value }));
    if ((value || '').length >= 2) {
      const valNorm = normalizeTextEdit(value);
      const sugestoes = (bairrosOficiais || [])
        .filter(b => normalizeTextEdit(b?.nome || '').includes(valNorm))
        .slice(0, 5);
      setBairrosFiltradosEditar(sugestoes);
      setShowSugestoesEditar(true);
    } else {
      setShowSugestoesEditar(false);
    }
  };
  const selecionarBairroEditar = (bairro) => {
    setClienteParaEditar(prev => ({
      ...prev,
      bairro: bairro.nome,
      cidade: bairro.cidade || prev.cidade,
    }));
    setShowSugestoesEditar(false);
  };

  const formatarEndereco = (cliente) => {
    if (!cliente) return '';
    const parts = [
        cliente.rua,
        cliente.numero,
        cliente.complemento,
        cliente.bairro,
        cliente.cidade,
        cliente.cep
    ];
    return parts.filter(Boolean).join(', ');
  };

  const calcularQuantidadeSacolas = () => {
    if (!vendaAtual.itens || vendaAtual.itens.length === 0) return 1;
    
    let totalSacolas = 0;
    
    vendaAtual.itens.forEach(item => {
      const descricao = (item.descricao || '').toUpperCase();
      
      if (descricao.includes('ENTREGA')) {
        totalSacolas += 0;
      } else if (descricao.includes('ASSADO')) {
        totalSacolas += 1;
      } else {
        totalSacolas += item.quantidade || 0;
      }
    });
    
    return Math.max(1, totalSacolas);
  };

  const gerarReciboTexto = () => {
    const clienteNome = clienteSelecionado?.nome || vendaAtual.cliente_nome || 'NÃO INFORMADO';
    const endereco = formatarEndereco(clienteSelecionado || {});
    const quantidadeSacolas = calcularQuantidadeSacolas();
    
    const trocoDisplay = `R$ ${(dadosPagamento.troco || 0).toFixed(2)}`;
    const pagamentoDisplay = dadosPagamento.metodo === 'aprazo' ? 'A Prazo' : (pixPago ? 'Pix (Pago)' : dadosPagamento.metodo);

    const textoArray = [
      `${endereco || 'NÃO INFORMADO'}`,
      '', 
      `*NOME:*     ${clienteNome}`,
      `*VALOR:*    R$ ${(vendaAtual.total || 0).toFixed(2)}`,
      `*PAGTO:*    ${pagamentoDisplay}`,
      `*TROCO:*    ${trocoDisplay}`,
      '', 
      `*SACOLAS:*  ${quantidadeSacolas}`,
      `*OBS:*      ${observacoes || ''}`,
      `--------------------------`
    ];
    return textoArray.join('\n');
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(gerarReciboTexto())
      .then(() => {}) 
      .catch((err) => {
        console.error('Erro ao copiar recibo: ', err);
        alert('Falha ao copiar o recibo.');
      });
  };

  const handleFinalizar = async () => {
    if (!clienteSelecionado) {
      alert('Selecione um cliente para a entrega!');
      return;
    }

    const dadosCompletos = {
      ...dadosPagamento,
      tipo_venda: 'delivery', 
      cliente_nome: clienteSelecionado.nome,
      cliente_telefone: clienteSelecionado.telefone, 
      endereco_entrega: formatarEndereco(clienteSelecionado),
      bairro: clienteSelecionado.bairro, 
      cep: clienteSelecionado.cep, 
      observacoes: observacoes,
      status_pagamento: pixPago ? 'pago' : dadosPagamento.status_pagamento,
    };

    onFinalizar(dadosCompletos);
  };

  const clientesFiltrados = clientes.filter(c => {
    const buscaLower = busca.toLowerCase().trim();
    if (!buscaLower) return true; 

    const isNumericSearch = /^\d+$/.test(buscaLower);

    if (isNumericSearch) {
      return c.codigo?.startsWith(buscaLower);
    } else {
      return (
        c.nome?.toLowerCase().includes(buscaLower) ||
        c.rua?.toLowerCase().includes(buscaLower) ||
        c.bairro?.toLowerCase().includes(buscaLower)
      );
    }
  });

  const handleSelectCliente = (cliente) => {
    setClienteSelecionado(cliente);
  };

  const handleNovoCliente = () => {
    setClienteSelecionado(null); 
    setModalCadastroCliente(true); 
  };

  const handleClienteAdicionado = (clienteCriado) => {
    setClientes(prev => [clienteCriado, ...prev]);
    setTodosClientes(prev => [clienteCriado, ...prev]); // Update all clients list for address search
    setClienteSelecionado(clienteCriado); // Select the newly created client
    setModalCadastroCliente(false);
  };

  const importarExcel = async () => {
    if (!excelFile) {
      alert('Selecione um arquivo primeiro!');
      return;
    }
    
    setIsImporting(true);
    try {
      const { file_url } = await UploadFile({ file: excelFile });
      
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            "0": { type: ["string", "number"] },
            "1": { type: "string" },             
            "2": { type: "string" },             
            "codigo": { type: ["string", "number"] },
            "nome": { type: "string" },
            "endereco": { type: "string" },
            "COD": { type: ["string", "number"] },
            "NOME": { type: "string" },
            "ENDERECO": { type: "string" },
            "CLIENTE": { type: "string" },
            "ID": { type: ["string", "number"] },
            "ADDRESS": { type: "string" }
          },
          additionalProperties: true
        }
      };
      
      const result = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema
      });

      if (result.status === "success" && result.output) {
        let dadosExcel = Array.isArray(result.output) ? result.output : [result.output];
        
        console.log('Dados extraídos:', dadosExcel.slice(0, 3));
        
        const clientsBeforeImport = await Cliente.list();
        const existingCodes = new Set(clientsBeforeImport.map(c => String(c.codigo)));

        const clientsToAdd = [];
        let tempClientCounter = 0; // To ensure unique temp codes if actual codes are missing

        for (const item of dadosExcel) {
          if (!item || typeof item !== 'object') {
            console.log('Linha ignorada - item inválido:', item);
            continue;
          }

          let codigo, nome, endereco;

          if (item["0"] !== undefined) {
            codigo = item["0"];
            nome = item["1"];
            endereco = item["2"];
          } else {
            const possiveisCodigos = [
              item.COD, item.CODIGO, item.codigo, item.Codigo, item.Cod,
              item.ID, item.id, item.Id, item["COD"], item["CODIGO"], item["ID"]
            ];
            const possiveisNomes = [
              item.NOME, item.nome, item.Nome, item.NAME, item.name, item.Name,
              item.CLIENTE, item.cliente, item.Cliente, item["NOME"], item["NAME"], item["CLIENTE"]
            ];
            const possiveisEnderecos = [
              item.ENDERECO, item.endereco, item.Endereco, item.ENDEREÇO, 
              item.endereço, item.Endereço, item.ADDRESS, item.address, item.Address,
              item["ENDERECO"], item["ENDEREÇO"], item["ADDRESS"]
            ];
            
            codigo = possiveisCodigos.find(val => val !== undefined && val !== null && val !== '') || '';
            nome = possiveisNomes.find(val => val !== undefined && val !== null && val !== '') || '';
            endereco = possiveisEnderecos.find(val => val !== undefined && val !== null && val !== '') || '';
          }
          
          if (codigo) codigo = String(codigo).replace(/['"]/g, '').trim();
          if (nome) nome = String(nome).replace(/['"]/g, '').trim();
          if (endereco) endereco = String(endereco).replace(/['"]/g, '').trim();
          
          if (!nome || nome === 'undefined' || nome === 'null') {
            console.log('Linha ignorada - sem nome:', item);
            continue;
          }
          
          // Generate a unique code if missing or duplicate
          if (!codigo || codigo === 'undefined' || codigo === 'null' || existingCodes.has(codigo)) {
            let newCode;
            do {
              newCode = (300000 + tempClientCounter++).toString(); // Start from a higher range
            } while (existingCodes.has(newCode));
            codigo = newCode;
          }
          existingCodes.add(codigo); // Add to set to prevent future duplicates in the same batch

          clientsToAdd.push({
            codigo: codigo,
            nome: nome,
            telefone: '',
            rua: endereco || '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            cep: ''
          });
        }
        
        console.log('Clientes preparados:', clientsToAdd.slice(0, 3));

        if (clientsToAdd.length === 0) {
          alert('Nenhum cliente válido encontrado!\n\n📋 Formato esperado do CSV:\n\ncodigo,nome,endereco\n2755,"Evinha","Cajobi 339"\n2754,"Naira","Cajobi 339"\n\n💡 Verifique se:\n• Arquivo tem dados\n• Nomes não estão vazios\n• Formato está correto');
          return;
        }

        const LOTE_SIZE = 20;
        let clientesCriados = 0;
        let erros = 0;
        
        alert(`Iniciando importação de ${clientsToAdd.length} clientes...\nIsso pode levar alguns minutos.`);
        
        for (let i = 0; i < clientsToAdd.length; i += LOTE_SIZE) {
          const lote = clientsToAdd.slice(i, i + LOTE_SIZE);
          
          try {
            await Cliente.bulkCreate(lote);
            clientesCriados += lote.length;
            
            if (clientesCriados % 100 === 0) {
              const progresso = Math.round((clientesCriados / clientsToAdd.length) * 100);
              console.log(`Progresso: ${progresso}% - ${clientesCriados}/${clientsToAdd.length}`);
            }
            
          } catch (loteError) {
            console.error(`Erro no lote ${i}-${i + LOTE_SIZE}:`, loteError);
            
            for (const cliente of lote) {
              try {
                await Cliente.create(cliente);
                clientesCriados++;
              } catch (itemError) {
                console.error(`Erro ao criar cliente ${cliente.codigo} - ${cliente.nome}:`, itemError);
                erros++;
              }
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const listaAtualizada = await Cliente.list("-created_date");
        setClientes(listaAtualizada);
        setTodosClientes(listaAtualizada);
        
        alert(`🎉 Importação concluída!\n\n✅ ${clientesCriados} clientes importados com sucesso!${erros > 0 ? `\n❌ ${erros} clientes com erro (provavelmente códigos duplicados)` : ''}\n\n📝 Os endereços foram salvos no campo "Rua" - você pode editá-los depois para separar rua, número, bairro, etc.`);
        setExcelFile(null);
        
      } else {
        alert(`❌ Erro ao processar arquivo: ${result.details || 'Formato não reconhecido'}\n\n📋 Formato esperado do CSV:\n\ncodigo,nome,endereco\n2755,"Evinha","Cajobi 339"\n2754,"Naira","Cajobi 339"\n\n💡 Certifique-se que o arquivo tem pelo menos essas 3 colunas!`);
      }
      
    } catch (error) {
      console.error('Erro na importação:', error);
      
      let mensagemErro = '❌ Erro na importação!\n\n';
      
      if (error.message.includes('400')) {
        mensagemErro += '📁 Problema com o arquivo.\n\n';
        mensagemErro += '✅ Tente:\n';
        mensagemErro += '• Dividir em arquivos menores (100 linhas cada)\n';
        mensagemErro += '• Verificar se não há caracteres especiais\n';
        mensagemErro += '• Salvar como CSV UTF-8\n';
        mensagemErro += '• Remover linhas vazias\n\n';
        mensagemErro += '📋 Formato: codigo,nome,endereco';
      } else {
        mensagemErro += `Detalhes técnicos: ${error.message}`;
      }
      
      alert(mensagemErro);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!clienteParaEditar) return;
    // Trava: impede salvar com bairro que não seja idêntico ao da tabela oficial (case/acentos)
    if (clienteParaEditar.bairro && !validarBairroEditar(clienteParaEditar.bairro)) {
      alert(`O bairro "${clienteParaEditar.bairro}" não está cadastrado ou não corresponde exatamente à grafia oficial na tabela de fretes. Selecione um bairro válido.`);
      return;
    }
    try {
      await Cliente.update(clienteParaEditar.id, clienteParaEditar);
      setClientes(clientes.map(c => c.id === clienteParaEditar.id ? clienteParaEditar : c));
      setTodosClientes(todosClientes.map(c => c.id === clienteParaEditar.id ? clienteParaEditar : c)); // Update all clients list
      setClienteParaEditar(null);
    } catch(e) {
      console.error('Erro ao salvar edição:', e);
      alert('Erro ao salvar edição!');
    }
  };

  const handleConfirmarExclusao = async () => {
    if(!clienteParaExcluir) return;
    try {
      await Cliente.delete(clienteParaExcluir.id);
      setClientes(clientes.filter(c => c.id !== clienteParaExcluir.id));
      setTodosClientes(todosClientes.filter(c => c.id !== clienteParaExcluir.id)); // Update all clients list
      if (clienteSelecionado?.id === clienteParaExcluir.id) {
        setClienteSelecionado(null);
      }
      setClienteParaExcluir(null);
    } catch(e) {
      console.error('Erro ao excluir cliente:', e);
      alert('Erro ao excluir cliente!');
    }
  };

  return (
    <Dialog open={true} onOpenChange={onFechar}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciador de Entregas</DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow flex gap-4 min-h-0 py-4">
          {/* Coluna Esquerda - Recibo e Controles */}
          <div className="w-1/2 flex flex-col space-y-4">
              <div 
                className="recibo-area p-4 rounded font-mono text-sm whitespace-pre-wrap flex-grow overflow-y-auto"
                style={{ backgroundColor: '#fef3c7', color: '#000000' }}
              >
                {gerarReciboTexto()}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Observações..." 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="flex-grow"
                />
                <Button 
                  onClick={() => setPixPago(!pixPago)}
                  variant={pixPago ? 'default' : 'outline'}
                  className={pixPago ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-orange-500 text-orange-600 hover:bg-orange-50'}
                >
                  Pix Pago
                </Button>
              </div>
              <Button onClick={handleCopy} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Copy className="w-4 h-4 mr-2"/>
                Copiar Recibo para Entregador
              </Button>
          </div>

          {/* Coluna Direita - Busca de Cliente */}
          <div className="w-1/2 flex flex-col space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Digite código, nome ou endereço para buscar..." 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleNovoCliente} variant="outline" size="sm" className="text-green-600 border-green-600 hover:bg-green-50">
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
              <div className="flex items-center gap-1">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  className="hidden"
                  id="excel-input"
                />
                <Button
                  onClick={() => document.getElementById('excel-input').click()}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  title="Importar Excel/CSV (recomendado: CSV com máximo 150 linhas)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
                {excelFile && (
                  <Button
                    onClick={importarExcel}
                    disabled={isImporting}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isImporting ? "Importando..." : "Importar"}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Client list */}
            <div className="flex-grow border rounded-md p-2 overflow-y-auto bg-gray-100 dark:bg-gray-800">
              {clientesFiltrados.map(cliente => (
                <div key={cliente.id} className="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer rounded">
                  <div className="flex-grow" onClick={() => handleSelectCliente(cliente)}>
                    <div className="font-medium text-gray-800 dark:text-gray-200">{cliente.nome}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {cliente.codigo} - {formatarEndereco(cliente)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => setClienteParaEditar(cliente)}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => setClienteParaExcluir(cliente)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {clientesFiltrados.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={handleFinalizar} className="bg-green-600 hover:bg-green-700 text-white">
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal Cadastrar Cliente (new component) */}
      <ModalCadastroCliente
        isOpen={modalCadastroCliente}
        onClose={() => setModalCadastroCliente(false)}
        onClienteAdicionado={handleClienteAdicionado}
      />

      {/* Modal para editar cliente */}
      {clienteParaEditar && (
        <Dialog open={true} onOpenChange={() => setClienteParaEditar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Código</label>
                <Input
                  value={clienteParaEditar.codigo}
                  onChange={(e) => setClienteParaEditar(prev => ({ ...prev, codigo: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={clienteParaEditar.nome}
                  onChange={(e) => setClienteParaEditar(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={clienteParaEditar.telefone}
                  onChange={(e) => setClienteParaEditar(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rua</label>
                <Input
                  value={clienteParaEditar.rua}
                  onChange={(e) => setClienteParaEditar(prev => ({ ...prev, rua: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Número</label>
                  <Input
                    value={clienteParaEditar.numero}
                    onChange={(e) => setClienteParaEditar(prev => ({ ...prev, numero: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Complemento</label>
                  <Input
                    value={clienteParaEditar.complemento}
                    onChange={(e) => setClienteParaEditar(prev => ({ ...prev, complemento: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-sm font-medium">Bairro</label>
                  <Input
                    value={clienteParaEditar.bairro}
                    onChange={(e) => handleBairroEditarChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSugestoesEditar(false), 200)}
                    onFocus={() => {
                      if ((clienteParaEditar?.bairro || '').length >= 2) {
                        handleBairroEditarChange(clienteParaEditar.bairro);
                      }
                    }}
                  />
                  {/* Dropdown de sugestões (Editar) */}
                  {showSugestoesEditar && bairrosFiltradosEditar.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-md mt-1 z-50 max-h-40 overflow-y-auto">
                      {bairrosFiltradosEditar.map((bairro) => (
                        <div
                          key={bairro.id}
                          onClick={() => selecionarBairroEditar(bairro)}
                          className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white text-sm border-b border-gray-700 last:border-b-0"
                        >
                          <div className="font-medium">{bairro.nome}</div>
                          {bairro.cidade && (
                            <div className="text-xs text-gray-400">{bairro.cidade}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {clienteParaEditar.bairro && !validarBairroEditar(clienteParaEditar.bairro) && (
                    <p className="text-red-500 text-xs mt-1">Bairro não cadastrado ou diferente da grafia oficial.</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Cidade</label>
                  <Input
                    value={clienteParaEditar.cidade}
                    onChange={(e) => setClienteParaEditar(prev => ({ ...prev, cidade: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">CEP</label>
                <Input
                  value={clienteParaEditar.cep}
                  onChange={(e) => setClienteParaEditar(prev => ({ ...prev, cep: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClienteParaEditar(null)}>Cancelar</Button>
              <Button onClick={handleSalvarEdicao}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal para confirmar exclusão */}
      {clienteParaExcluir && (
        <AlertDialog open={true} onOpenChange={() => setClienteParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o cliente "{clienteParaExcluir.nome}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmarExclusao} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  );
}
