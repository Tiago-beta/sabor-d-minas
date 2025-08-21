
import React, { useState, useEffect, useMemo, useCallback } from "react";
// Imports via barrel '@/api/entities' para compatibilidade produção
import { Produto, Venda, User, PedidoOnline } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Truck, Home } from "lucide-react"; // Adicionado Home, ShoppingCart e Truck
import CachedImage from "../components/common/CachedImage";

import ListaItens from "../components/pdv/ListaItens";
import ModalPagamento from "../components/pdv/ModalPagamento";
import PainelControle from "../components/pdv/PainelControle";
import ModalControleCatalogo from "../components/pdv/ModalControleCatalogo";
import ModalPedidosOnline from "../components/pdv/ModalPedidosOnline"; // Importar o novo modal
import ModalControleFrete from '../components/pdv/ModalControleFrete'; // Importar o novo modal de frete
// Segunda senha desativada: ModalSegundaSenha removido
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function PDV() {
  const [vendaAtual, setVendaAtual] = useState({ 
    itens: [], 
    total: 0, 
    desconto: 0,
    cliente_nome: '',
    cliente_telefone: '',
    endereco_entrega: '',
    taxa_entrega: 0,
    vendedor_consignacao: '', // Adicionado para consignação
  });
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]); // New state for sales data
  const [produtosOrdenados, setProdutosOrdenados] = useState([]); // New state for sorted products
  
  const [modalPagamento, setModalPagamento] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemSelecionadoId, setItemSelecionadoId] = useState(null);
  const [produtoAtivo, setProdutoAtivo] = useState(null);
  const [operadorNome, setOperadorNome] = useState("");
  const [isGerente, setIsGerente] = useState(false);
  const [alertaVencidos, setAlertaVencidos] = useState(false);
  const [showControleCatalogo, setShowControleCatalogo] = useState(false);
  const [showControleFrete, setShowControleFrete] = useState(false); // Novo estado para modal de frete
  const [novoPedidoAlerta, setNovoPedidoAlerta] = useState(false); // Novo estado para alerta de novo pedido
  const [ultimoPedidoId, setUltimoPedidoId] = useState(null); // Novo estado para controlar o último pedido
  const [showPedidosOnlineModal, setShowPedidosOnlineModal] = useState(false); // Estado para o novo modal
  const [autenticado, setAutenticado] = useState(true); // sempre autenticado
  const [buscaPdv, setBuscaPdv] = useState(''); // Estado para busca no painel de controle

  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tipoPdv = urlParams.get('tipo') || 'varejo';
  const storageKey = `carrinhoPdv_${tipoPdv}`; // Chave única para cada tipo de PDV

  useEffect(() => {
    // Segunda senha desativada
    setAutenticado(true);

    // Efeito para CARREGAR o carrinho ao iniciar a página
    const carrinhoSalvo = sessionStorage.getItem(storageKey);
    // Lógica principal de carregamento e reset
    if (carrinhoSalvo) {
      try {
        const parsedCart = JSON.parse(carrinhoSalvo);
        const newTotal = calculateTotal(parsedCart.itens, parsedCart.desconto, parsedCart.taxa_entrega || 0);
        setVendaAtual(prev => ({
          ...prev, // Mantém o estado anterior para não perder nada
          ...parsedCart,
          total: newTotal
        }));
      } catch (e) {
        console.error("Erro ao carregar carrinho salvo:", e);
        sessionStorage.removeItem(storageKey);
      }
    } else {
      // Se não houver carrinho salvo, aplique a lógica de reset baseada no tipo de PDV
      setVendaAtual(prev => ({
        ...prev,
        cliente_nome: tipoPdv === 'delivery' ? prev.cliente_nome : '',
        cliente_telefone: tipoPdv === 'delivery' ? prev.cliente_telefone : '',
        endereco_entrega: tipoPdv === 'delivery' ? prev.endereco_entrega : '',
        taxa_entrega: tipoPdv === 'delivery' ? prev.taxa_entrega : 0,
        total: calculateTotal(prev.itens, prev.desconto, tipoPdv === 'delivery' ? prev.taxa_entrega : 0)
      }));
    }
  
    const runInitialLoad = async () => {
      await carregarDadosIniciais();
      await carregarUsuario();
      // A verificação de consignação deve ser feita após o carregamento inicial.
      // Ela pode sobrescrever o carrinho, o que é o comportamento esperado para consignados.
      verificarCarrinhoConsignacao(); 
    };

    runInitialLoad();

    const gerente = sessionStorage.getItem('isGerente') === 'true';
    setIsGerente(gerente);
  }, [tipoPdv]);

  // Efeito para SALVAR o carrinho sempre que ele mudar
  useEffect(() => {
    // Only save if there are items, otherwise remove the stored cart to keep it clean
    if (vendaAtual.itens.length > 0) {
      sessionStorage.setItem(storageKey, JSON.stringify(vendaAtual));
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [vendaAtual, storageKey]);

  // Adicionar verificação de novos pedidos (MODIFICADO)
  useEffect(() => {
    if (tipoPdv === 'varejo') { // Só mostrar alerta no PDV principal
      const verificarNovosPedidos = async () => {
        try {
          // Pega o pedido mais recente
          const pedidos = await PedidoOnline.list("-created_date", 1); 
          
          if (pedidos.length > 0) {
            const pedidoMaisRecente = pedidos[0];
            const ultimoIdVisto = sessionStorage.getItem('ultimoPedidoVisto');
            
            // Se o ID do pedido mais recente for diferente do último visto, e estiver pendente, mostrar alerta
            if (ultimoIdVisto !== pedidoMaisRecente.id && pedidoMaisRecente.status === 'pendente') {
              setNovoPedidoAlerta(true);
              setUltimoPedidoId(pedidoMaisRecente.id);
            }
          }
        } catch (error) {
          console.error('Erro ao verificar novos pedidos:', error);
          // Em caso de erro de conectividade, não quebrar o PDV
          // Apenas registrar o erro silenciosamente
        }
      };

      // Verificar a cada 30 segundos (aumentado de 10s) para reduzir carga
      const interval = setInterval(verificarNovosPedidos, 30000);
      
      // Fazer uma verificação inicial, mas com delay para não sobrecarregar na inicialização
      setTimeout(verificarNovosPedidos, 5000);

      return () => clearInterval(interval);
    }
  }, [tipoPdv]);


  // Efeito para ordenar produtos
  useEffect(() => {
    if (produtos.length > 0) {
      // Calcula a contagem de vendas para cada produto
      const salesCount = vendas.reduce((acc, venda) => {
        if (venda.itens && Array.isArray(venda.itens)) {
          venda.itens.forEach(item => {
            const productId = item.item_id || item.id;
            if (productId) {
              acc[productId] = (acc[productId] || 0) + (item.quantidade || 0);
            }
          });
        }
        return acc;
      }, {});

      // Ordena os produtos
      const sorted = [...produtos].sort((a, b) => {
        const countA = salesCount[a.id] || 0;
        const countB = salesCount[b.id] || 0;

        // Ordenação primária: mais vendidos primeiro
        if (countB > countA) return 1;
        if (countA > countB) return -1;

        // Ordenação secundária: por descrição
        return (a.descricao || '').localeCompare(b.descricao || '');
      });
      setProdutosOrdenados(sorted);
    } else {
      setProdutosOrdenados([]);
    }
  }, [produtos, vendas]);

  // Efeito para resetar erro de imagem ao trocar de produto
  // (removed imageError state, CachedImage handles it internally)
  useEffect(() => {
    // setImageError(false); // This state no longer exists
  }, [produtoAtivo]);

  const normalizeText = (text = '') => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const produtosParaPainel = useMemo(() => {
    if (!buscaPdv) return produtosOrdenados;
    const buscaNormalizada = normalizeText(buscaPdv);
    return produtosOrdenados.filter(p => {
      const descricaoNormalizada = normalizeText(p.descricao || '');
      const codigoNormalizado = normalizeText(p.codigo || '');
      
      return descricaoNormalizada.includes(buscaNormalizada) || 
             codigoNormalizado.includes(buscaNormalizada);
    });
  }, [produtosOrdenados, buscaPdv]);


  const carregarDadosIniciais = async () => {
    const [produtosList, vendasList] = await Promise.all([
      Produto.list(),
      Venda.list("-created_date", 500) // Pega as últimas 500 vendas para o ranking
    ]);
    setProdutos(produtosList);
    setVendas(vendasList);
  };

  const carregarUsuario = async () => {
    try {
      const user = await User.me();
      setOperadorNome(user.operador_nome || user.full_name || "OPERADOR");
      const isUserGerente = user.is_gerente;
      sessionStorage.setItem('isGerente', isUserGerente ? 'true' : 'false');
      setIsGerente(isUserGerente);
      setAlertaVencidos(false); 
    } catch (error) {
      setOperadorNome("OPERADOR");
      sessionStorage.setItem('isGerente', 'false');
      setIsGerente(false);
      setAlertaVencidos(false);
    }
  };

  // Função para verificar e carregar carrinho de consignação
  const verificarCarrinhoConsignacao = () => {
    const carrinhoConsignacao = sessionStorage.getItem('carrinhoConsignacao');
    if (carrinhoConsignacao && tipoPdv === 'atacado') {
      try {
        const dados = JSON.parse(carrinhoConsignacao);
        setVendaAtual(prev => ({
          ...prev,
          itens: dados.itens,
          total: dados.total,
          vendedor_consignacao: dados.vendedor // Armazena o vendedor
        }));
        
        // Limpar do sessionStorage
        sessionStorage.removeItem('carrinhoConsignacao');
        
        // Mostrar modal de pagamento automaticamente
        setModalPagamento(true);
        
      } catch (error) {
        console.error('Erro ao carregar carrinho de consignação:', error);
      }
    }
  };

  const editarItem = useCallback((itemId, novoPreco) => {
    const novosItens = vendaAtual.itens.map(item => {
      if (item.id === itemId) {
        const novoSubtotal = item.quantidade * novoPreco;
        return { ...item, preco_unitario: novoPreco, subtotal: novoSubtotal };
      }
      return item;
    });
    
    const newTotal = calculateTotal(novosItens, vendaAtual.desconto, vendaAtual.taxa_entrega);
    setVendaAtual(prev => ({ ...prev, itens: novosItens, total: newTotal }));
  }, [vendaAtual.itens, vendaAtual.desconto, vendaAtual.taxa_entrega]);

  const editarQuantidade = useCallback((itemId, novaQuantidade) => {
    const novosItens = vendaAtual.itens.map(item => {
      if (item.id === itemId) {
        const novoSubtotal = novaQuantidade * item.preco_unitario;
        return { ...item, quantidade: novaQuantidade, subtotal: novoSubtotal };
      }
      return item;
    });
    
    const newTotal = calculateTotal(novosItens, vendaAtual.desconto, vendaAtual.taxa_entrega);
    setVendaAtual(prev => ({ ...prev, itens: novosItens, total: newTotal }));
  }, [vendaAtual.itens, vendaAtual.desconto, vendaAtual.taxa_entrega]);

  const calcularEstoqueProduto = (produto) => {
    if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
      let estoquesPossiveis = [];
      for (const componente of produto.componentes_kit) {
        const produtoComponente = produtos.find(p => p.id === componente.produto_id);
        if (!produtoComponente || !produtoComponente.estoque || componente.quantidade_utilizada <= 0) {
          return 0;
        }
        estoquesPossiveis.push(produtoComponente.estoque / componente.quantidade_utilizada);
      }
      return Math.floor(Math.min(...estoquesPossiveis));
    }
    return produto.estoque || 0;
  };

  const calculateTotal = (itens, desconto, taxaEntrega) => {
    const itensSubtotal = itens.reduce((acc, item) => acc + item.subtotal, 0);
    // Inclui a taxa de entrega se ela existir, independentemente do tipo de PDV
    return itensSubtotal + (taxaEntrega || 0) - desconto;
  };

  const adicionarItemVenda = (codigo, quantidade) => {
    if (!codigo || !quantidade) return false;
    
    const produto = produtos.find(p => p.codigo === codigo); // FIX: Changed from products to produtos
    if (!produto) {
      alert("Produto não encontrado!");
      setProdutoAtivo(null);
      return false;
    }

    const precoUnitario = tipoPdv === 'atacado' ? (produto.preco_atacado || produto.preco_varejo || 0) : (produto.preco_varejo || 0);
    
    if (precoUnitario === 0) {
      alert(`Produto "${produto.descricao}" não possui preço de ${tipoPdv} definido.`);
      return false;
    }

    const estoqueDisponivel = calcularEstoqueProduto(produto);
    if (estoqueDisponivel < quantidade) {
      alert(`Estoque insuficiente! Disponível: ${estoqueDisponivel}`);
      return false;
    }

    setProdutoAtivo(produto);
    
    const itemExistenteIndex = vendaAtual.itens.findIndex(item => item.codigo === codigo);
    let novosItens;

    if (itemExistenteIndex > -1) {
      novosItens = [...vendaAtual.itens];
      const itemExistente = novosItens[itemExistenteIndex];
      itemExistente.quantidade += quantidade;
      itemExistente.subtotal = itemExistente.quantidade * itemExistente.preco_unitario;
    } else {
      const novoItem = {
        id: Date.now(),
        item_id: produto.id,
        tipo: produto.tipo_produto || 'individual',
        codigo: produto.codigo,
        descricao: produto.descricao,
        quantidade: quantidade,
        preco_unitario: precoUnitario,
        subtotal: precoUnitario * quantidade
      };
      novosItens = [...vendaAtual.itens, novoItem];
    }
    
    const newTotal = calculateTotal(novosItens, vendaAtual.desconto, vendaAtual.taxa_entrega);
    setVendaAtual(prev => ({ ...prev, itens: novosItens, total: newTotal }));
    return true;
  };
  
  const removerItem = useCallback((id) => {
    const idParaRemover = id || itemSelecionadoId;
    if (!idParaRemover) return;

    const novosItens = vendaAtual.itens.filter(item => item.id !== idParaRemover);
    const newTotal = calculateTotal(novosItens, vendaAtual.desconto, vendaAtual.taxa_entrega);
    setVendaAtual(prev => ({ ...prev, itens: novosItens, total: newTotal }));
    setItemSelecionadoId(null);
  }, [itemSelecionadoId, vendaAtual.itens, vendaAtual.desconto, vendaAtual.taxa_entrega]);

  const handleUpdateDeliveryInfo = (field, value) => {
    setVendaAtual(prev => {
      let updatedValue = value;
      if (field === 'taxa_entrega') {
        updatedValue = parseFloat(value) || 0;
      }
      const newVenda = { ...prev, [field]: updatedValue };
      const newTotal = calculateTotal(newVenda.itens, newVenda.desconto, newVenda.taxa_entrega);
      return { ...newVenda, total: newTotal };
    });
  };

  const limparVenda = () => {
    sessionStorage.removeItem(storageKey); // Remove o carrinho salvo
    setVendaAtual({ 
      itens: [], 
      total: 0, 
      desconto: 0,
      cliente_nome: '',
      cliente_telefone: '',
      endereco_entrega: '',
      taxa_entrega: 0,
      vendedor_consignacao: '',
    });
    setItemSelecionadoId(null);
    setProdutoAtivo(null);
  };

  // Wrapper para consistência com o outline
  const limparCarrinho = () => limparVenda();

  const finalizarVenda = async (dadosPagamento) => {
    if (vendaAtual.itens.length === 0) {
      alert("Adicione produtos à venda!");
      return;
    }
    
    const isDeliveryByModal = dadosPagamento.tipo_venda === 'delivery';

    if ((isDeliveryByModal || tipoPdv === 'delivery') && dadosPagamento.metodo !== 'interno' && dadosPagamento.metodo !== 'aprazo') {
      const nomeCliente = isDeliveryByModal ? dadosPagamento.cliente_nome : vendaAtual.cliente_nome;
      const enderecoCliente = isDeliveryByModal ? dadosPagamento.endereco_entrega : vendaAtual.endereco_entrega;
      
      if (!nomeCliente || !enderecoCliente) { // MODIFIED: removed telefoneCliente from validation
        alert("Por favor, preencha o nome e o endereço de entrega para pedidos de delivery.");
        return;
      }
    }

    setLoading(true);
    try {
      const numeroVenda = `V${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      
      const vendaData = {
        numero_venda: numeroVenda,
        itens: vendaAtual.itens.map(item => {
          const produto = produtos.find(p => p.id === (item.item_id || item.id)); // FIX: Changed from products to produtos
          return {
            item_id: item.item_id || item.id,
            tipo: item.tipo || (produto?.tipo_produto || 'individual'),
            codigo: item.codigo || produto?.codigo || '',
            descricao: item.descricao || produto?.descricao || '',
            quantidade: Number(item.quantidade) || 1,
            preco_unitario: Number(item.preco_unitario) || 0,
            subtotal: Number(item.subtotal) || 0,
          };
        }),
        total: dadosPagamento.metodo === 'interno' ? 0 : Number(vendaAtual.total) || 0,
        desconto: Number(vendaAtual.desconto) || 0,
        metodo_pagamento: dadosPagamento.metodo || 'dinheiro',
        valor_pago: Number(dadosPagamento.valorPago) || 0,
        troco: Number(dadosPagamento.troco) || 0,
        status: "finalizada",
        tipo_venda: isDeliveryByModal ? 'delivery' : (tipoPdv || 'varejo'),
        operador_nome: operadorNome || 'SISTEMA',
        cliente_nome: dadosPagamento.cliente_nome || vendaAtual.cliente_nome || '', // Moved outside delivery conditional
        ...( (isDeliveryByModal || tipoPdv === 'delivery') && {
          cliente_telefone: dadosPagamento.cliente_telefone || vendaAtual.cliente_telefone || '',
          endereco_entrega: dadosPagamento.endereco_entrega || vendaAtual.endereco_entrega || '',
          taxa_entrega: Number(vendaAtual.taxa_entrega) || 0,
          bairro: dadosPagamento.bairro || '',
        }),
        ...(dadosPagamento.metodo === 'aprazo' && {
          cliente_id: dadosPagamento.cliente_id || '',
          data_pagamento: dadosPagamento.data_pagamento || '',
        }),
        ...(vendaAtual.vendedor_consignacao && {
          vendedor_consignacao: vendaAtual.vendedor_consignacao,
        }),
        status_pagamento: dadosPagamento.metodo === 'aprazo' ? 'pendente' : 'pago',
        // Novos campos para custo de entrega externa
        ...(dadosPagamento.custo_entrega_externa && {
          custo_entrega_externa: Number(dadosPagamento.custo_entrega_externa),
          tipo_entrega_externa: dadosPagamento.tipo_entrega_externa,
        }),
      };
      
      const vendaSalva = await Venda.create(vendaData);

      // Criar despesa automática para custo de entrega externa
      if (dadosPagamento.custo_entrega_externa && dadosPagamento.tipo_entrega_externa) {
        try {
          const { Despesa } = await import('@/api/entities');
          const hoje = new Date();
          const descricaoDespesa = dadosPagamento.tipo_entrega_externa === 'ifood' 
            ? `iFood Frete - Venda ${numeroVenda}`
            : `Motoboy Agregado - Venda ${numeroVenda}`;
            
          await Despesa.create({
            nome: descricaoDespesa,
            tipo: 'variavel',
            mes: hoje.getMonth() + 1,
            ano: hoje.getFullYear(),
            valor: Number(dadosPagamento.custo_entrega_externa),
            ativa: true
          });
        } catch (error) {
          console.error('Erro ao criar despesa automática:', error);
          // Não bloquear a venda se der erro na despesa
        }
      }

      // Apenas atualiza o estoque se a venda NÃO for de consignação
      if (!vendaData.vendedor_consignacao) {
          const estoqueUpdates = [];
      for (const itemVendido of vendaAtual.itens) {
        // IMPORTANTE: Pedidos vindos do "Gerenciamento de Pedidos Online" estavam
        // gravando item_id como CÓDIGO do produto (ex: 'POLPA-MORANGO') e não o ID real.
        // Isso fazia com que o find pelo ID não encontrasse o produto e o estoque não fosse baixado.
        // Fallback: tentar localizar pelo código se não achar pelo id.
        let produto = produtos.find(p => p.id === (itemVendido.item_id || itemVendido.id));
        if (!produto && itemVendido.codigo) {
          produto = produtos.find(p => p.codigo === itemVendido.codigo);
        }
              
              if (produto) {
                  if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
                      for (const componente of produto.componentes_kit) {
                          const produtoComponente = produtos.find(p => p.id === componente.produto_id);
                          if (produtoComponente) {
                              const estoqueADeduzir = Number(itemVendido.quantidade) * Number(componente.quantidade_utilizada);
                              const estoqueAtual = Number(produtoComponente.estoque) || 0;
                              const novoEstoque = Math.max(0, estoqueAtual - estoqueADeduzir);
                              
                              // Preparar dados para atualização
                              const dadosAtualizacao = { estoque: novoEstoque };
                              
                              // Se o estoque zerou, ocultar do catálogo automaticamente
                              if (novoEstoque === 0) {
                                dadosAtualizacao.aparece_catalogo = false;
                              }
                              
                              estoqueUpdates.push(
                                Produto.update(produtoComponente.id, dadosAtualizacao)
                              );
                          }
                      }
                      
                      // NOVO: Verificar se o kit ainda pode ser montado após a venda
                      const estoqueKitAposVenda = produto.componentes_kit.map(componente => {
                          const produtoComponente = produtos.find(p => p.id === componente.produto_id);
                          if (!produtoComponente) return 0;
                          const estoqueComponenteAtual = Number(produtoComponente.estoque) || 0;
                          const estoqueADeduzir = Number(itemVendido.quantidade) * Number(componente.quantidade_utilizada);
                          const novoEstoqueComponente = Math.max(0, estoqueComponenteAtual - estoqueADeduzir);
                          return Math.floor(novoEstoqueComponente / componente.quantidade_utilizada);
                      });
                      
                      const menorEstoqueKit = Math.min(...estoqueKitAposVenda);
                      
                      // Se o kit não pode mais ser montado, ocultar do catálogo
                      if (menorEstoqueKit === 0) {
                          estoqueUpdates.push(
                              Produto.update(produto.id, { aparece_catalogo: false })
                          );
                      }
                      
                  } else {
                      const estoqueAtual = Number(produto.estoque) || 0;
                      const quantidadeVendida = Number(itemVendido.quantidade) || 0;
                      const novoEstoque = Math.max(0, estoqueAtual - quantidadeVendida);
                      
                      // Preparar dados para atualização
                      const dadosAtualizacao = { estoque: novoEstoque };
                      
                      // Se o estoque zerou, ocultar do catálogo automaticamente
                      if (novoEstoque === 0) {
                        dadosAtualizacao.aparece_catalogo = false;
                      }
                      
                      estoqueUpdates.push(
                        Produto.update(produto.id, dadosAtualizacao)
                      );
                  }
              }
          }
          
          if (estoqueUpdates.length > 0) {
            await Promise.all(estoqueUpdates);
          }
      }
      
      sessionStorage.removeItem(storageKey); // Limpa o carrinho salvo após sucesso
      limparVenda(); // This also calls removeItem(storageKey)
      setModalPagamento(false);
      await carregarDadosIniciais();
      carregarUsuario();
      
    } catch (error) {
      console.error("Erro detalhado ao finalizar venda:", error);
      alert(`Erro ao finalizar venda: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleMenuAcaoClick = (acao) => {
    switch (acao) {
      case 'limpar':
        limparCarrinho();
        break;
      case 'online':
        setShowPedidosOnlineModal(true);
        break;
      case 'vendas':
        navigate(createPageUrl('RegistroVendas')); // Alterado para navegar na mesma guia
        break;
      case 'externo':
        navigate(createPageUrl('Consignacao')); // Alterado para navegar na mesma guia
        break;
      case 'recebimentos':
        navigate(createPageUrl('Recebimentos')); // Alterado para navegar na mesma guia
        break;
      case 'aprazo': // NOVO: Botão A Prazo
        navigate(createPageUrl('APrazo'));
        break;
      case 'atacado':
        navigate(createPageUrl('PDV?tipo=atacado')); // Alterado para navegar na mesma guia
        break;
      case 'varejo':
        navigate(createPageUrl('PDV'));
        break;
      case 'catalogo':
        setShowControleCatalogo(true);
        break;
      case 'frete':
        setShowControleFrete(true);
        break;
      default:
          console.warn(`Ação desconhecida: ${acao}`);
    }
  };

  // Função para lidar com o clique no alerta de novo pedido
  const handleNovosPedidosClick = () => {
    // Marcar como visto
    if (ultimoPedidoId) {
      sessionStorage.setItem('ultimoPedidoVisto', ultimoPedidoId);
    }
    setNovoPedidoAlerta(false);
    
    // Abrir página de pedidos online
    setShowPedidosOnlineModal(true); // Abre o modal em vez de nova janela
  };

  // Gating removido

  return (
    <div className="h-full bg-gray-200 text-gray-800 flex flex-col font-sans overflow-hidden">
      {/* Alerta de Novo Pedido (MODIFICADO) */}
      {novoPedidoAlerta && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-bounce cursor-pointer"
          onClick={handleNovosPedidosClick}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-bold">NOVO PEDIDO ONLINE RECEBIDO!</span>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 p-3 flex gap-4 overflow-hidden">
        {/* Layout Responsivo - Mobile usa layout em coluna única */}
        <div className="hidden md:flex w-full gap-4">
          {/* Coluna Esquerda - Cupom (33.33%) */}
          <div className="w-1/3 flex flex-col overflow-hidden">
            <ListaItens
              itens={vendaAtual.itens}
              itemSelecionadoId={itemSelecionadoId}
              onItemSelecionado={setItemSelecionadoId}
              operadorNome={operadorNome}
              onRemoverItem={removerItem}
              onEditarItem={editarItem}
              onEditarQuantidade={editarQuantidade}
              subtotal={vendaAtual.total}
              clienteNome={vendaAtual.cliente_nome}
            />
          </div>

          {/* Coluna Central - Controles (33.33%) */}
          <div className="w-1/3 overflow-hidden">
            <PainelControle
               onAdicionarProduto={adicionarItemVenda}
               produtos={produtosParaPainel}
               produtoAtivo={produtoAtivo}
               subtotal={vendaAtual.total}
               tipoPdv={tipoPdv}
               onFinalizar={() => setModalPagamento(true)}
               vendaAtual={vendaAtual}
               handleUpdateDeliveryInfo={handleUpdateDeliveryInfo}
               busca={buscaPdv}
               setBusca={setBuscaPdv}
            />
          </div>

          {/* Coluna Direita - Imagem e Botões (33.33%) */}
          <div className="w-1/3 flex flex-col overflow-hidden">
              <div className="h-96 bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-300 flex items-center justify-center mb-3 flex-shrink-0">
                  <div className="w-full h-full bg-white rounded-lg border border-gray-300 flex items-center justify-center overflow-hidden">
                      {produtoAtivo && produtoAtivo.imagem_url ? (
                          <CachedImage 
                            src={produtoAtivo.imagem_url} 
                            alt={produtoAtivo.descricao} 
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                          />
                      ) : (
                          <Package className="w-32 h-32 text-gray-300"/>
                      )}
                  </div>
              </div>
              
              <div className="flex-shrink-0 bg-gray-100 p-3 rounded-lg shadow-inner border border-gray-300">
                  <div className="grid grid-cols-3 gap-2 action-buttons-grid">
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('limpar')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Limpar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('online')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" /></svg>
                          Online
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('vendas')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Vendas
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('externo')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          Externo
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('recebimentos')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          Recebimentos
                      </Button>
                      {tipoPdv === 'atacado' ? (
                          <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('varejo')} className="text-xs flex flex-col items-center gap-1 h-16">
                              <Home className="w-5 h-5"/>
                              Varejo
                          </Button>
                      ) : (
                          <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('atacado')} className="text-xs flex flex-col items-center gap-1 h-16">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                              Atacado
                          </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('aprazo')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          A Prazo
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('catalogo')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                          Catálogo
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('frete')} className="text-xs flex flex-col items-center gap-1 h-16">
                          <Truck className="w-5 h-5" />
                          Frete
                      </Button>
                  </div>
              </div>
          </div>
        </div>

        {/* Layout Mobile - Uma coluna com abas/seções empilhadas */}
        <div className="md:hidden w-full flex flex-col gap-4 overflow-hidden">
          {/* Seção do Cupom - Agora ocupa a maior parte do espaço e rola internamente */}
          <div className="flex-grow overflow-y-auto">
            <ListaItens
              itens={vendaAtual.itens}
              itemSelecionadoId={itemSelecionadoId}
              onItemSelecionado={setItemSelecionadoId}
              operadorNome={operadorNome}
              onRemoverItem={removerItem}
              onEditarItem={editarItem}
              onEditarQuantidade={editarQuantidade}
              subtotal={vendaAtual.total}
              clienteNome={vendaAtual.cliente_nome}
            />
          </div>

          {/* Seção de Controles - Fica abaixo do carrinho */}
          <div className="flex-shrink-0">
            <PainelControle
               onAdicionarProduto={adicionarItemVenda}
               produtos={produtosParaPainel}
               produtoAtivo={produtoAtivo}
               subtotal={vendaAtual.total}
               tipoPdv={tipoPdv}
               onFinalizar={() => setModalPagamento(true)}
               vendaAtual={vendaAtual}
               handleUpdateDeliveryInfo={handleUpdateDeliveryInfo}
               busca={buscaPdv}
               setBusca={setBuscaPdv}
            />
          </div>

          {/* Botões de Ação - Apenas Limpar, Online e Externo + Finalizar */}
          <div className="flex-shrink-0 bg-gray-100 p-2 rounded-lg">
            <div className="flex gap-2">
              {/* Apenas 3 botões principais */}
              <div className="grid grid-cols-3 gap-1 flex-1">
                {tipoPdv === 'atacado' ? (
                    <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('varejo')} className="text-xs flex flex-col items-center gap-1 h-12">
                        <Home className="w-4 h-4"/>
                        <span className="text-xs">Varejo</span>
                    </Button>
                ) : (
                    <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('atacado')} className="text-xs flex flex-col items-center gap-1 h-12">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        <span className="text-xs">Atacado</span>
                    </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('online')} className="text-xs flex flex-col items-center gap-1 h-12">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" /></svg>
                  <span className="text-xs">Online</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleMenuAcaoClick('externo')} className="text-xs flex flex-col items-center gap-1 h-12">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857m0 0a5.002 5 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  <span className="text-xs">Externo</span>
                </Button>
              </div>
              
              {/* Botão Finalizar destacado à direita */}
              <div className="w-20">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setModalPagamento(true)} 
                  className="w-full h-[50px] text-xs flex flex-col items-center justify-center gap-1 bg-green-600 text-white hover:bg-green-700 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs font-bold">FINALIZAR</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalPagamento && (
        <ModalPagamento
          total={vendaAtual.total}
          vendaAtual={vendaAtual}
          onFinalizar={finalizarVenda}
          onFechar={() => setModalPagamento(false)}
          loading={loading}
        />
      )}

      {showControleCatalogo && (
        <ModalControleCatalogo onClose={() => setShowControleCatalogo(false)} />
      )}

      {showPedidosOnlineModal && (
        <ModalPedidosOnline 
          isOpen={showPedidosOnlineModal}
          onClose={() => setShowPedidosOnlineModal(false)}
          onNavigate={navigate}
        />
      )}

      {showControleFrete && (
        <ModalControleFrete
          isOpen={showControleFrete}
          onClose={() => setShowControleFrete(false)}
        />
      )}

      <AlertDialog open={alertaVencidos} onOpenChange={setAlertaVencidos}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Alerta de Vencimentos!</AlertDialogTitle>
            <AlertDialogDescription>
              Existem vendas a prazo que estão vencidas e não foram pagas. Por favor, verifique a tela de Recebimentos para mais detalhes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate(createPageUrl('Recebimentos'))}>
              Ir para Recebimentos
            </AlertDialogAction>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
