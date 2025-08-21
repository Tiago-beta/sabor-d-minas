
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Consignacao, ConsignacaoItem, Produto, CadastroVendedor } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Package, Plus, ArrowLeft, Save, Search, Loader2, Trash2, TrendingDown, TrendingUp, ShoppingCart, FileText, BadgeInfo, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
import ModalRelatorioConsignacao from '../components/consignacao/ModalRelatorioConsignacao'; // Importar o novo modal
import CachedImage from '../components/common/CachedImage';

// Helper function to calculate stock for individual products and kits
// This function needs the full list of products (todosOsProdutos) to resolve kit components
const calcularEstoqueProduto = (produto, todosOsProdutos) => {
  if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
    let estoquesPossiveis = [];
    for (const componente of produto.componentes_kit) {
      const produtoComponente = todosOsProdutos.find(p => p.id === componente.produto_id);
      if (!produtoComponente || typeof produtoComponente.estoque === 'undefined' || componente.quantidade_utilizada <= 0) {
        return 0; // Component missing, estoque undefined, or invalid quantity
      }
      estoquesPossiveis.push(Math.floor(produtoComponente.estoque / componente.quantidade_utilizada));
    }
    // The stock of the kit is limited by the component with the least availability
    return estoquesPossiveis.length > 0 ? Math.min(...estoquesPossiveis) : 0;
  }
  // For individual products, return their direct stock
  return produto.estoque || 0;
};

// Helper function for accent-insensitive search
const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");


export default function ConsignacaoPage() {
    const [produtos, setProdutos] = useState([]); // This will now hold ALL products
    const [produtosFiltrados, setProdutosFiltrados] = useState([]); // This will hold products filtered for display/consign
    const [vendedores, setVendedores] = useState([]);
    const [vendedorNome, setVendedorNome] = useState('');
    const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
    const [movimentacoes, setMovimentacoes] = useState({}); // Stores quantities entered by user on screen
    const [movimentacoesProcessadas, setMovimentacoesProcessadas] = useState({}); // Stores quantities already processed by system
    const [buscaProduto, setBuscaProduto] = useState('');
    const [loading, setLoading] = useState(true);
    const [alertDialog, setAlertDialog] = useState({ open: false, title: '', description: '', action: null });
    const [filtroEstoque, setFiltroEstoque] = useState('todos'); // todos, zerado, positivo
    const [filtroVendedor, setFiltroVendedor] = useState('todos'); // todos, saiu_vendedor
    const [itensEmConsignacao, setItensEmConsignacao] = useState({}); // { productId: quantity, ... }
    const [colunaVisivel, setColunaVisivel] = useState('saiu'); // 'saiu' ou 'voltou'
    const [showResumoModal, setShowResumoModal] = useState(false);
    const [resumoData, setResumoData] = useState([]);
    
    const navigate = useNavigate();
    const storageKey = 'consignacaoEmAndamento';

    useEffect(() => {
        carregarVendedores();
        carregarDadosSalvos();
    }, []);

    useEffect(() => {
        // Recalcular produtos filtrados quando buscaProduto, filtroEstoque, filtroVendedor, vendedorNome ou produtos (base de todos os produtos) mudam
        filtrarProdutos();
    }, [buscaProduto, filtroEstoque, filtroVendedor, vendedorNome, produtos]);

    useEffect(() => {
        // Salvar no sessionStorage sempre que houver alteração
        if (!loading) {
            const hasData = vendedorNome || Object.values(movimentacoes).some(m => m.saiu > 0 || m.voltou > 0);
            if (hasData) {
                sessionStorage.setItem(storageKey, JSON.stringify({ vendedorNome, dataSaida, movimentacoes, movimentacoesProcessadas }));
            } else {
                sessionStorage.removeItem(storageKey);
            }
        }
    }, [vendedorNome, dataSaida, movimentacoes, movimentacoesProcessadas, loading]);

    const carregarDadosSalvos = async () => {
        // First, load products to ensure `produtos` state is populated
        const produtosCarregados = await carregarProdutos(); // carregarProdutos now returns the sorted, consignable products
        const dadosSalvos = sessionStorage.getItem(storageKey);

        if (dadosSalvos) {
            const { vendedorNome: nomeSalvo, dataSaida: dataSalva, movimentacoes: movsSalvos, movimentacoesProcessadas: movsProcSalvos } = JSON.parse(dadosSalvos);
            setVendedorNome(nomeSalvo || '');
            setDataSaida(dataSalva || new Date().toISOString().split('T')[0]);

            const movsAtualizados = {};
            const movsProcAtualizados = {};
            // Ensure movimentacoes are initialized for all loaded products that are eligible for consignation, then overlay saved data
            produtosCarregados.forEach(p => {
                movsAtualizados[p.id] = movsSalvos?.[p.id] || { saiu: 0, voltou: 0, vendeu: 0 };
                movsProcAtualizados[p.id] = movsProcSalvos?.[p.id] || { saiu: 0, voltou: 0 };
            });
            setMovimentacoes(movsAtualizados);
            setMovimentacoesProcessadas(movsProcAtualizados);
        }
    };

    const carregarProdutos = async () => {
        setLoading(true);
        try {
            // Carregar TODOS os produtos para permitir cálculo correto de estoque dos kits
            const lista = await Produto.list('-created_date');
            
            // Salvar TODOS os produtos no state para cálculos de estoque (e para ser usado pelo calcularEstoqueProduto)
            setProdutos(lista);
            
            // Filtrar apenas produtos e kits que devem aparecer na consignação para exibição
            const produtosParaConsignacao = lista.filter(p => {
                // Verificações básicas
                const ativo = p.ativo !== false;
                const apareceConsignacao = p.aparece_consignacao !== false;
                
                return ativo && apareceConsignacao;
            });
            
            const produtosSorted = produtosParaConsignacao.sort((a, b) => (a.descricao || '').localeCompare(b.descricao || ''));
            
            // Definir produtos filtrados para exibição
            setProdutosFiltrados(produtosSorted);
            
            // Initialize movimentacoes for all products that can be consigned
            const movimentacoesIniciais = {};
            const movimentacoesProcessadasIniciais = {};
            produtosSorted.forEach(produto => {
                movimentacoesIniciais[produto.id] = {
                    saiu: 0,
                    voltou: 0,
                    vendeu: 0
                };
                movimentacoesProcessadasIniciais[produto.id] = {
                    saiu: 0,
                    voltou: 0
                };
            });
            setMovimentacoes(movimentacoesIniciais);
            setMovimentacoesProcessadas(movimentacoesProcessadasIniciais);
            return produtosSorted; // Return for use in carregarDadosSalvos
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            alert('Erro ao carregar produtos!');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const carregarVendedores = async () => {
        try {
            const lista = await CadastroVendedor.list();
            setVendedores(lista.filter(v => v.ativo !== false));
        } catch (error) {
            console.error('Erro ao carregar vendedores:', error);
        }
    };

    const filtrarProdutos = async () => {
        // 1. Initial filter for consignable, active, and search term
        let filtrados = produtos.filter(p => {
            const buscaNormalizada = normalizeText(buscaProduto);
            const matchSearch = !buscaProduto || 
                                (p.codigo && normalizeText(p.codigo).includes(buscaNormalizada)) ||
                                (p.descricao && normalizeText(p.descricao).includes(buscaNormalizada));
            
            if (!matchSearch) return false;

            const ativo = p.ativo !== false;
            const apareceConsignacao = p.aparece_consignacao !== false;
            
            return ativo && apareceConsignacao;
        });

        // 2. Apply vendor filter if active, and load vendor-specific data
        if (filtroVendedor === 'saiu_vendedor' && vendedorNome) {
            try {
                const consignacoes = await Consignacao.filter({
                    vendedor_nome: vendedorNome,
                    status: 'em_consignacao'
                });

                const dbData = {};
                if (consignacoes.length > 0) {
                    let todosItens = [];
                    for (const consignacao of consignacoes) {
                        const itens = await ConsignacaoItem.filter({ consignacao_id: consignacao.id });
                        todosItens = [...todosItens, ...itens];
                    }
                    
                    // Aggregate totals from database
                    todosItens.forEach(item => {
                        if (!dbData[item.produto_id]) {
                            dbData[item.produto_id] = { saiu: 0, voltou: 0 };
                        }
                        dbData[item.produto_id].saiu += (item.quantidade_saida || 0);
                        dbData[item.produto_id].voltou += (item.quantidade_retorno || 0);
                    });
                }
                
                const itensMap = {}; // for "(Em posse: X)" text
                const movsAtualizados = {}; // to update the state for UI inputs

                // Initialize all consignable products to 0
                produtos.filter(p => p.aparece_consignacao !== false).forEach(p => {
                    movsAtualizados[p.id] = { saiu: 0, voltou: 0, vendeu: 0 };
                });

                // Overwrite with data from the specific vendor
                Object.keys(dbData).forEach(produtoId => {
                    const data = dbData[produtoId];
                    const saldo = data.saiu - data.voltou;
                    if (saldo > 0) {
                        itensMap[produtoId] = saldo;
                    }
                    // Load DB state into the UI state for correct calculation
                    movsAtualizados[produtoId] = {
                        saiu: data.saiu,
                        voltou: data.voltou,
                        vendeu: 0 // Will be calculated in render
                    };
                });
                
                // Update state once with all new data
                setItensEmConsignacao(itensMap);
                setMovimentacoes(movsAtualizados);
                setMovimentacoesProcessadas(movsAtualizados); // Sync processed state with DB state on load
                
                // Filter the product list to only show those in the vendor's possession
                const produtosEmPosseIds = new Set(Object.keys(itensMap));
                filtrados = filtrados.filter(p => produtosEmPosseIds.has(p.id));
                
            } catch (error) {
                console.error('Erro ao carregar itens do vendedor:', error);
                filtrados = [];
                setItensEmConsignacao({});
            }
        } else {
            // Clear consignment-specific data if filter is not active
            setItensEmConsignacao({});
        }
        
        // 3. Apply stock filter to the (potentially already filtered) list
        filtrados = filtrados.filter(p => {
            const estoqueAtual = calcularEstoqueProduto(p, produtos);
            if (filtroEstoque === 'zerado') {
                return estoqueAtual === 0;
            } else if (filtroEstoque === 'positivo') {
                return estoqueAtual > 0;
            }
            return true; // "todos"
        });
        
        // 4. Set the final filtered list
        setProdutosFiltrados(filtrados.sort((a, b) => (a.descricao || '').localeCompare(b.descricao || '')));
    };

    const atualizarMovimentacao = (produtoId, tipo, valor) => {
        setMovimentacoes(prev => ({
            ...prev,
            [produtoId]: {
                ...prev[produtoId],
                [tipo]: Math.max(0, valor)
            }
        }));
    };

    // This function now uses the centralized `calcularEstoqueProduto` helper
    const calcularEstoqueDisponivel = (produto) => {
        return calcularEstoqueProduto(produto, produtos); // 'produtos' state holds the full list
    };

    const confirmarAcao = (title, description, action) => {
        setAlertDialog({
            open: true,
            title,
            description,
            action
        });
    };

    const salvarSaida = async () => {
        if (!vendedorNome.trim()) {
            alert('Selecione um vendedor!');
            return;
        }

        const itensComSaida = Object.entries(movimentacoes)
            .map(([id, mov]) => {
                const movProcessado = movimentacoesProcessadas[id] || { saiu: 0 };
                // Calculate the new quantity to be processed (difference from what's already processed)
                const novaSaida = (mov.saiu || 0) - (movProcessado.saiu || 0);
                return { id, ...mov, saiu: novaSaida, produto: produtos.find(p => p.id === id) };
            })
            .filter(item => item.saiu > 0); // Only process if there's a new quantity to be saved

        if (itensComSaida.length === 0) {
            alert('Adicione novas quantidades na coluna "Saiu"!');
            return;
        }

        // Verificar estoque disponível usando a função atualizada
        for (const item of itensComSaida) {
            if (!item.produto) {
                alert(`Erro: Produto com ID ${item.id} não encontrado.`);
                return;
            }
            // The `estoqueDisponivel` here is the current stock before this transaction
            // We check if the *new* quantity (`item.saiu`) can be taken from the current available stock
            const estoqueDisponivel = calcularEstoqueDisponivel(item.produto); 
            if (item.saiu > estoqueDisponivel) {
                alert(`Estoque insuficiente para ${item.produto.descricao}. Disponível: ${estoqueDisponivel}, Solicitado: ${item.saiu}`);
                return;
            }
        }

        try {
            // Criar registro de consignação
            const consignacao = await Consignacao.create({
                vendedor_nome: vendedorNome,
                data_saida: dataSaida,
                status: 'em_consignacao',
                observacoes: 'Saída registrada'
            });

            // Criar itens da consignação
            const itensParaCriar = itensComSaida.map(item => ({
                consignacao_id: consignacao.id,
                produto_id: item.produto.id,
                codigo: item.produto.codigo,
                descricao: item.produto.descricao,
                // Use the calculated new 'saiu' quantity for the record
                quantidade_saida: item.saiu,
                quantidade_retorno: 0,
                quantidade_vendida: 0,
                preco_atacado: item.produto.preco_atacado || item.produto.preco_varejo || 0,
                custo: item.produto.custo || 0
            }));

            await ConsignacaoItem.bulkCreate(itensParaCriar);

            // Atualizar estoque (dar baixa)
            const estoqueUpdates = [];
            for (const item of itensComSaida) { // item.saiu here is the novaSaida
                if (item.produto.tipo_produto === 'kit' && item.produto.componentes_kit) {
                    // Para kits, dar baixa nos componentes
                    for (const componente of item.produto.componentes_kit) {
                        const produtoComponente = produtos.find(p => p.id === componente.produto_id); // Use 'produtos' state
                        if (produtoComponente) {
                            const quantidadeADeduzir = item.saiu * componente.quantidade_utilizada;
                            const novoEstoque = Math.max(0, (produtoComponente.estoque || 0) - quantidadeADeduzir);
                            estoqueUpdates.push(Produto.update(produtoComponente.id, { estoque: novoEstoque }));
                        }
                    }
                } else {
                    // Para produtos individuais
                    const novoEstoque = Math.max(0, (item.produto.estoque || 0) - item.saiu);
                    estoqueUpdates.push(Produto.update(item.produto.id, { estoque: novoEstoque }));
                }
            }

            await Promise.all(estoqueUpdates);

            alert('Saída registrada com sucesso! Estoque atualizado.');
            
            // Update movimentacoesProcessadas to reflect the quantities that are now committed
            const novasMovimentacoesProcessadas = { ...movimentacoesProcessadas };
            itensComSaida.forEach(item => {
                if (novasMovimentacoesProcessadas[item.id]) {
                    novasMovimentacoesProcessadas[item.id].saiu += item.saiu;
                } else {
                     novasMovimentacoesProcessadas[item.id] = { saiu: item.saiu, voltou: 0 };
                }
            });
            setMovimentacoesProcessadas(novasMovimentacoesProcessadas);
            
            // Recarregar produtos para atualizar estoque (importante para refletir as baixas)
            await carregarProdutos();
            
        } catch (error) {
            console.error('Erro ao salvar saída:', error);
            alert('Erro ao registrar saída!');
        }
    };

    const registrarRetorno = async () => {
        if (!vendedorNome.trim()) {
            alert('Selecione um vendedor!');
            return;
        }

        const itensComRetorno = Object.entries(movimentacoes)
            .map(([id, mov]) => {
                const movProcessado = movimentacoesProcessadas[id] || { voltou: 0 };
                // Calculate the new quantity to be processed (difference from what's already processed)
                const novoRetorno = (mov.voltou || 0) - (movProcessado.voltou || 0);
                return { id, ...mov, voltou: novoRetorno, produto: produtos.find(p => p.id === id) }; // Corrected from 'products' to 'produtos'
            })
            .filter(item => item.voltou > 0); // Only process if there's a new quantity to be returned

        if (itensComRetorno.length === 0) {
            alert('Adicione novas quantidades na coluna "Voltou"!');
            return;
        }

        try {
            // Buscar consignações em andamento do vendedor
            const consignacoes = await Consignacao.filter({
                vendedor_nome: vendedorNome,
                status: 'em_consignacao'
            });

            if (consignacoes.length === 0) {
                alert('Não há consignações em andamento para este vendedor!');
                return;
            }

            // Para simplicidade, usar a última consignação ativa para aplicar o retorno.
            // Em um sistema mais complexo, seria necessário permitir selecionar a consignação específica.
            const consignacao = consignacoes[consignacoes.length - 1];

            // Buscar itens da consignação
            const itensConsignacao = await ConsignacaoItem.filter({
                consignacao_id: consignacao.id
            });

            // Atualizar itens com retorno
            const updates = [];
            const estoqueUpdates = [];

            for (const itemRetorno of itensComRetorno) { // itemRetorno.voltou here is the novoRetorno
                const itemConsignacao = itensConsignacao.find(ic => ic.produto_id === itemRetorno.id);
                if (itemConsignacao) {
                    // Check if not returning more than what's available for return (original saiu - already returned - already sold)
                    const maxRetorno = itemConsignacao.quantidade_saida - (itemConsignacao.quantidade_retorno || 0) - (itemConsignacao.quantidade_vendida || 0);
                    if (itemRetorno.voltou > maxRetorno) {
                        alert(`Não é possível retornar ${itemRetorno.voltou} de ${itemRetorno.produto.descricao}. Máximo possível de retorno: ${maxRetorno}`);
                        return;
                    }

                    // Calculate the new total quantity returned for this consignation item
                    const novoRetornoTotalParaItemConsignacao = (itemConsignacao.quantidade_retorno || 0) + itemRetorno.voltou;
                    const novaQuantidadeVendida = itemConsignacao.quantidade_saida - novoRetornoTotalParaItemConsignacao; // Recalcula quantidade vendida

                    updates.push(
                        ConsignacaoItem.update(itemConsignacao.id, {
                            quantidade_retorno: novoRetornoTotalParaItemConsignacao,
                            quantidade_vendida: novaQuantidadeVendida
                        })
                    );

                    // Devolver ao estoque
                    if (itemRetorno.produto.tipo_produto === 'kit' && itemRetorno.produto.componentes_kit) {
                        // Para kits, devolver componentes
                        for (const componente of itemRetorno.produto.componentes_kit) {
                            const produtoComponente = produtos.find(p => p.id === componente.produto_id); // Use 'produtos' state
                            if (produtoComponente) {
                                const quantidadeADevolver = itemRetorno.voltou * componente.quantidade_utilizada;
                                const novoEstoque = (produtoComponente.estoque || 0) + quantidadeADevolver;
                                estoqueUpdates.push(Produto.update(produtoComponente.id, { estoque: novoEstoque }));
                            }
                        }
                    } else {
                        // Para produtos individuais
                        const novoEstoque = (itemRetorno.produto.estoque || 0) + itemRetorno.voltou;
                        estoqueUpdates.push(Produto.update(itemRetorno.produto.id, { estoque: novoEstoque }));
                    }
                }
            }

            await Promise.all([...updates, ...estoqueUpdates]);

            alert('Retorno registrado com sucesso! Estoque atualizado.');
            
            // Update movimentacoesProcessadas to reflect the quantities that are now committed
            const novasMovimentacoesProcessadas = { ...movimentacoesProcessadas };
            itensComRetorno.forEach(item => {
                if (novasMovimentacoesProcessadas[item.id]) {
                    novasMovimentacoesProcessadas[item.id].voltou += item.voltou;
                } else {
                     novasMovimentacoesProcessadas[item.id] = { saiu: 0, voltou: item.voltou };
                }
            });
            setMovimentacoesProcessadas(novasMovimentacoesProcessadas);
            
            // Recarregar produtos para atualizar estoque (importante para refletir as devoluções)
            await carregarProdutos();
            
        } catch (error) {
            console.error('Erro ao registrar retorno:', error);
            alert('Erro ao registrar retorno!');
        }
    };

    const finalizarVenda = async () => {
        if (!vendedorNome.trim()) {
            alert('Selecione um vendedor!');
            return;
        }

        try {
            // Buscar consignações em andamento do vendedor
            const consignacoes = await Consignacao.filter({
                vendedor_nome: vendedorNome,
                status: 'em_consignacao'
            });

            if (consignacoes.length === 0) {
                alert('Não há consignações para finalizar para este vendedor!');
                return;
            }

            // Buscar todos os itens de *todas* as consignações em andamento do vendedor
            let todosItensConsignados = [];
            for (const consignacao of consignacoes) {
                const itens = await ConsignacaoItem.filter({
                    consignacao_id: consignacao.id
                });
                todosItensConsignados = [...todosItensConsignados, ...itens];
            }

            // Consolidar itens vendidos (pode haver o mesmo produto em diferentes consignações/saídas)
            const itensVendidosConsolidados = {};
            todosItensConsignados.forEach(item => {
                // The 'vendidaAtual' here is the real amount sold from the DB's perspective
                if ((item.quantidade_saida || 0) > (item.quantidade_retorno || 0)) {
                    const vendidaAtual = (item.quantidade_saida || 0) - (item.quantidade_retorno || 0);
                    if (vendidaAtual > 0) {
                        if (!itensVendidosConsolidados[item.produto_id]) {
                            itensVendidosConsolidados[item.produto_id] = { 
                                ...item, 
                                quantidade_vendida_total: 0,
                                // Ensure price is set, falling back to a default if undefined
                                preco_atacado: item.preco_atacado || item.preco_varejo || 0 
                            };
                        }
                        itensVendidosConsolidados[item.produto_id].quantidade_vendida_total += vendidaAtual;
                    }
                }
            });

            const itensParaVendaPDV = Object.values(itensVendidosConsolidados);

            if (itensParaVendaPDV.length === 0) {
                alert('Não há produtos com saldo para venda para finalizar!');
                return;
            }

            // Montar carrinho para o PDV
            const carrinhoConsignacao = {
                itens: itensParaVendaPDV.map(item => ({
                    id: Date.now() + Math.random(), // Unique ID for PDV item
                    item_id: item.produto_id,
                    codigo: item.codigo,
                    descricao: item.descricao,
                    quantidade: item.quantidade_vendida_total,
                    preco_unitario: item.preco_atacado,
                    subtotal: item.quantidade_vendida_total * item.preco_atacado,
                    tipo: 'produto'
                })),
                total: itensParaVendaPDV.reduce((acc, item) => acc + (item.quantidade_vendida_total * item.preco_atacado), 0),
                vendedor: vendedorNome // Pass vendedor para o PDV se necessário
            };

            // Salvar no sessionStorage para o PDV
            sessionStorage.setItem('carrinhoConsignacao', JSON.stringify(carrinhoConsignacao));
            
            // Finalizar todas as consignações em aberto para este vendedor
            const finalizarPromises = consignacoes.map(c => 
                Consignacao.update(c.id, { 
                    status: 'finalizado',
                    data_retorno: new Date().toISOString().split('T')[0]
                })
            );
            await Promise.all(finalizarPromises);

            alert('Consignação finalizada! Redirecionando para o PDV...');
            
            // Limpar dados salvos no sessionStorage da consignação atual
            sessionStorage.removeItem(storageKey);
            
            // Redirecionar para PDV Atacado
            navigate(createPageUrl('PDV?tipo=atacado'));
            
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
            alert('Erro ao finalizar venda!');
        }
    };

    const limparFormulario = () => {
        setVendedorNome('');
        setDataSaida(new Date().toISOString().split('T')[0]);
        // Reset movimentacoes for all products that are consignable
        const movimentacoesLimpas = {};
        const movimentacoesProcessadasLimpas = {};
        // It's better to iterate over the full `produtos` list that are consignable to ensure all are reset
        produtos.filter(p => p.ativo !== false && p.aparece_consignacao !== false).forEach(produto => {
            movimentacoesLimpas[produto.id] = { saiu: 0, voltou: 0, vendeu: 0 };
            movimentacoesProcessadasLimpas[produto.id] = { saiu: 0, voltou: 0 };
        });
        setMovimentacoes(movimentacoesLimpas);
        setMovimentacoesProcessadas(movimentacoesProcessadasLimpas);
        setItensEmConsignacao({}); // Clear items in consignment
        sessionStorage.removeItem(storageKey);
    };

    const handleVerResumo = () => {
        if (!vendedorNome.trim()) {
            alert('Selecione um vendedor para ver o resumo!');
            return;
        }
    
        const itensParaResumo = Object.entries(movimentacoes)
            .map(([produtoId, mov]) => {
                // Incluir itens que saíram ou voltaram para ter um relatório completo da operação
                if ((mov.saiu || 0) > 0 || (mov.voltou || 0) > 0) {
                    const produto = produtos.find(p => p.id === produtoId);
                    if (produto) {
                        // Calculate 'vendeu' based on the current state of 'mov'
                        const vendeu = Math.max(0, (mov.saiu || 0) - (mov.voltou || 0));
                        return {
                            ...produto,
                            saiu: mov.saiu || 0,
                            voltou: mov.voltou || 0,
                            vendeu: vendeu
                        };
                    }
                }
                return null;
            })
            .filter(Boolean) // Remove null entries (produtos não encontrados ou sem movimentação)
            .sort((a,b) => (a.descricao || '').localeCompare(b.descricao || ''));
    
        if (itensParaResumo.length === 0) {
            alert('Nenhuma movimentação de saída ou retorno foi registrada para gerar um resumo.');
            return;
        }
    
        setResumoData(itensParaResumo);
        setShowResumoModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Carregando produtos...</span>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Controle de Consignação
                    </h1>
                    <div className="flex gap-2">
                        <Link to={createPageUrl("PDV")}>
                            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao PDV</Button>
                        </Link>
                    </div>
                </div>

                {/* Seção de Controles */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Informações da Consignação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* LINHA 1: Vendedor, Data, Modo de Operação */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-1">
                                <label className="text-sm font-medium mb-1 block">Nome do Vendedor</label>
                                <Select value={vendedorNome} onValueChange={setVendedorNome}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vendedores.map(vendedor => (
                                            <SelectItem key={vendedor.id} value={vendedor.nome}>
                                                {vendedor.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="md:col-span-1">
                                <label className="text-sm font-medium mb-1 block">Data de Saída</label>
                                <Input
                                    type="date"
                                    value={dataSaida}
                                    onChange={(e) => setDataSaida(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="md:col-span-2 flex items-center justify-center md:justify-start gap-2 pt-6">
                                <Button
                                    onClick={() => setColunaVisivel('saiu')}
                                    variant={colunaVisivel === 'saiu' ? 'default' : 'outline'}
                                    className={`flex items-center gap-2 ${colunaVisivel === 'saiu' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                                >
                                    <TrendingDown className="w-4 h-4" />
                                    Saída
                                </Button>
                                <Button
                                    onClick={() => setColunaVisivel('voltou')}
                                    variant={colunaVisivel === 'voltou' ? 'default' : 'outline'}
                                    className={`flex items-center gap-2 ${colunaVisivel === 'voltou' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    Retorno
                                </Button>
                            </div>
                        </div>

                        {/* LINHA 2: Filtros */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Buscar Produto</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Código ou descrição..."
                                        value={buscaProduto}
                                        onChange={(e) => setBuscaProduto(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Filtro de Estoque</label>
                                <Select value={filtroEstoque} onValueChange={setFiltroEstoque}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por estoque..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos os Produtos</SelectItem>
                                        <SelectItem value="positivo">Apenas com Estoque</SelectItem>
                                        <SelectItem value="zerado">Apenas Estoque Zerado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Filtro Vendedor</label>
                                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar produtos..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos os Produtos</SelectItem>
                                        <SelectItem value="saiu_vendedor" disabled={!vendedorNome}>
                                            Produtos que {vendedorNome || 'Vendedor'} Saiu
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* LINHA 3: Botões de Ação */}
                        <div className="flex gap-2 flex-wrap border-t pt-4">
                            <Button 
                                onClick={() => confirmarAcao(
                                    "Confirmar Saída",
                                    "Esta ação dará baixa no estoque dos produtos marcados na coluna 'Saiu' e criará um registro de consignação. Deseja continuar?",
                                    salvarSaida
                                )}
                                className="bg-red-600 hover:bg-red-700 flex-1"
                                disabled={!vendedorNome.trim()}
                            >
                                <TrendingDown className="w-4 h-4 mr-2" />
                                Salvar Saída (Baixa Estoque)
                            </Button>

                            <Button 
                                onClick={() => confirmarAcao(
                                    "Confirmar Retorno",
                                    "Esta ação devolverá ao estoque os produtos marcados na coluna 'Voltou' e ajustará o saldo da consignação. Deseja continuar?",
                                    registrarRetorno
                                )}
                                className="bg-blue-600 hover:bg-blue-700 flex-1"
                                disabled={!vendedorNome.trim()}
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                Registrar Retorno (Volta Estoque)
                            </Button>
                            
                            <Button 
                                onClick={handleVerResumo}
                                className="bg-cyan-600 hover:bg-cyan-700"
                                disabled={!vendedorNome.trim()}
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Resumo
                            </Button>

                            <Button 
                                onClick={() => confirmarAcao(
                                    "Finalizar Venda",
                                    "Esta ação finalizará todas as consignações em aberto para este vendedor, consolidará os produtos com saldo não retornado como vendidos e redirecionará para o PDV com os itens. Deseja continuar?",
                                    finalizarVenda
                                )}
                                className="bg-green-600 hover:bg-green-700 flex-1"
                                disabled={!vendedorNome.trim()}
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Finalizar Venda (PDV Atacado)
                            </Button>
                            
                            <Button 
                                onClick={() => navigate(createPageUrl('VendedorExterno'))}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Vendedor
                            </Button>

                            <Button 
                                onClick={limparFormulario}
                                variant="outline"
                                className="text-gray-600"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Limpar Tudo
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabela de Produtos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Produtos Disponíveis ({produtosFiltrados.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20 px-1 md:px-4">Imagem</TableHead>
                                        <TableHead className="w-20 hidden md:table-cell md:text-sm">Cod</TableHead>
                                        <TableHead className="md:text-sm">Descrição do produto</TableHead>
                                        <TableHead className="text-right w-24 hidden md:table-cell md:text-sm">Valor</TableHead>
                                        {colunaVisivel === 'saiu' && <TableHead className="text-center w-20 md:w-24 md:text-sm">Saiu</TableHead>}
                                        {colunaVisivel === 'voltou' && <TableHead className="text-center w-20 md:w-24 md:text-sm">Voltou</TableHead>}
                                        {colunaVisivel === 'voltou' && <TableHead className="text-center w-20 md:w-24 md:text-sm">Vendeu</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {produtosFiltrados.map((produto) => {
                                        const mov = movimentacoes[produto.id] || { saiu: 0, voltou: 0, vendeu: 0 };
                                        const emPosse = itensEmConsignacao[produto.id] || 0; // Added this line as per outline, though its value is not directly used in the following snippet.
                                        const vendeu = Math.max(0, mov.saiu - mov.voltou); // Vendeu é o que saiu menos o que voltou
                                        // Usa a função de estoque atualizada para exibir o estoque
                                        const estoqueDisponivel = calcularEstoqueProduto(produto, produtos); // 'produtos' state holds the full list
                                        
                                        return (
                                            <TableRow key={produto.id} className="dark:bg-gray-800">
                                                <TableCell className="pl-0 pr-2 md:p-4">
                                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                                        {produto.imagem_url ? (
                                                            <CachedImage src={produto.imagem_url} alt={produto.descricao} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-8 h-8 md:w-12 md:h-12 text-gray-500" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium hidden md:table-cell md:text-base text-gray-300">{produto.codigo}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium text-sm md:text-lg">{produto.descricao}</span>
                                                        <div className="text-xs md:text-sm text-gray-500">
                                                            <span className="md:hidden">Cód: {produto.codigo} | </span>
                                                            Estoque: {estoqueDisponivel}
                                                            {itensEmConsignacao[produto.id] > 0 && (
                                                                <span className="ml-2 font-bold text-purple-600 dark:text-purple-400">
                                                                    (Em posse: {itensEmConsignacao[produto.id]})
                                                                </span>
                                                            )}
                                                            {produto.tipo_produto === 'kit' && <span className=" ml-1 text-blue-600">(Kit)</span>}
                                                            <div className="md:hidden text-green-600 font-semibold mt-1">
                                                                R$ {(produto.preco_atacado || produto.preco_varejo || 0).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-bold hidden md:table-cell md:text-xl">
                                                    R$ {(produto.preco_atacado || produto.preco_varejo || 0).toFixed(2)}
                                                </TableCell>
                                                {colunaVisivel === 'saiu' && (
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="1" 
                                                            min="0"
                                                            // Max input should be current stock + already "saiu" (processed) for visual consistency
                                                            max={estoqueDisponivel + (movimentacoesProcessadas[produto.id]?.saiu || 0)} 
                                                            value={mov.saiu || ''}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                                const valor = parseInt(e.target.value) || 0;
                                                                atualizarMovimentacao(produto.id, 'saiu', valor);
                                                            }}
                                                            onKeyPress={(e) => {
                                                                // Bloquear vírgula, ponto e sinais
                                                                if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === '+') {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="w-16 text-center text-lg font-bold md:w-20 md:text-2xl"
                                                        />
                                                    </TableCell>
                                                )}
                                                {colunaVisivel === 'voltou' && (
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="0"
                                                            // Max input for return should be current 'saiu' + already "voltou" (processed)
                                                            max={mov.saiu} 
                                                            value={mov.voltou || ''}
                                                            placeholder="0"
                                                            onChange={(e) => {
                                                                const valor = parseInt(e.target.value) || 0;
                                                                atualizarMovimentacao(produto.id, 'voltou', valor);
                                                            }}
                                                            onKeyPress={(e) => {
                                                                // Bloquear vírgula, ponto e sinais
                                                                if (e.key === '.' || e.key === ',' || e.key === '-' || e.key === '+') {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            className="w-16 text-center text-lg font-bold md:w-20 md:text-2xl"
                                                        />
                                                    </TableCell>
                                                )}
                                                {colunaVisivel === 'voltou' && (
                                                    <TableCell className="text-center font-bold text-green-600 md:text-2xl">
                                                        {vendeu}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                    {produtosFiltrados.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                Nenhum produto encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Dialog de Confirmação */}
                <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog(prev => ({ ...prev, open }))}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
                            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => {
                                    if (alertDialog.action) {
                                        alertDialog.action();
                                    }
                                    setAlertDialog({ open: false, title: '', description: '', action: null });
                                }}
                            >
                                Confirmar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal de Resumo */}
                <ModalRelatorioConsignacao 
                    isOpen={showResumoModal}
                    onClose={() => setShowResumoModal(false)}
                    resumoData={resumoData}
                    vendedorNome={vendedorNome}
                    dataSaida={dataSaida}
                />
            </div>
        </div>
    );
}
