
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Produto, PedidoOnline } from '@/api/entities';
import { ShoppingCart } from 'lucide-react';

import HeaderCatalogoAtacado from '../components/catalogo/HeaderCatalogoAtacado';
import CardProdutoAtacado from '../components/catalogo/CardProdutoAtacado';
import ModalDetalheProdutoAtacado from '../components/catalogo/ModalDetalheProdutoAtacado';
import CarrinhoAtacado from '../components/catalogo/CarrinhoAtacado';
import BotaoFlutuanteCarrinhoAtacado from '../components/catalogo/BotaoFlutuanteCarrinhoAtacado';

export default function CatalogoAtacado() {
    const [produtos, setProdutos] = useState([]);
    const [todosOsProdutos, setTodosOsProdutos] = useState([]); // <- GUARDA A LISTA COMPLETA
    const [carrinho, setCarrinho] = useState([]);
    const [produtoSelecionado, setProdutoSelecionado] = useState(null);
    const [isCartVisible, setIsCartVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    const [mostrarTodosAssados, setMostrarTodosAssados] = useState(false);
    const [mostrarTodasPromocoes, setMostrarTodasPromocoes] = useState(false); // New state for 'Promocoes' section
    
    // Estados para filtros e busca
    const [busca, setBusca] = useState(''); // General search (e.g., from Header)
    // Removed: const [buscaTodosItens, setBuscaTodosItens] = useState(''); // Specific search for "Todos os Itens" section
    const [filtro, setFiltro] = useState('todas'); // New filter state: 'todas', 'assados', 'promocoes', 'gerais'
    const [categoriaSelecionada, setCategoriaSelecionada] = useState('Ver tudo'); // Categoria para itens gerais

    // The outline included these, but they are not used in the current context
    // and might be part of a larger, unprovided change. Keeping them commented
    // out to avoid unused variable warnings and ensure functionality.
    const [bairroSelecionado, setBairroSelecionado] = useState(null); 
    const [bairros, setBairros] = useState([]);

    const numeroWhatsApp = '5511967758855';

    // Função para normalizar texto (remover acentos e converter para minúsculas)
    const normalizeText = (text) => {
        if (typeof text !== 'string') return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .trim();
    };

    // Função simplificada para busca (apenas ignora acentos)
    const searchProducts = (products, searchTerm) => {
        if (!searchTerm.trim()) return products;
        
        const searchNormalized = normalizeText(searchTerm);
        
        return products.filter(produto => {
            // Busca no código
            if (produto.codigo && normalizeText(produto.codigo).includes(searchNormalized)) {
                return true;
            }
            
            // Busca na descrição (apenas contenção, sem tolerância a erros)
            if (produto.descricao && normalizeText(produto.descricao).includes(searchNormalized)) {
                return true;
            }
            
            return false;
        });
    };

    // New useMemo for filtered and randomized products
    const produtosFiltrados = useMemo(() => {
        let filtered = [...produtos]; // Start with the pre-filtered (visible, in-stock) products

        // Apply general search filter (from HeaderCatalogo)
        if (busca) {
            filtered = searchProducts(filtered, busca);
        }

        // Embaralha a lista de produtos filtrados
        return filtered.sort(() => Math.random() - 0.5);
    }, [produtos, busca]);

    // Lista de categorias para o filtro, excluindo produtos de promoção ou assados
    const categoriasGerais = useMemo(() => {
        const categorias = new Set();
        todosOsProdutos.forEach(p => { // Use todosOsProdutos to get all possible categories
            if (p.categoria && p.categoria.trim() !== '' && !p.is_assado && !p.preco_promocional) {
                categorias.add(p.categoria.trim());
            }
        });
        return ['Ver tudo', ...Array.from(categorias).sort()];
    }, [todosOsProdutos]);

    // Deriva as seções de exibição
    const produtosAssados = produtosFiltrados.filter(p => p.is_assado === true);
    const produtosPromocoes = produtosFiltrados.filter(p => p.preco_promocional === true && !p.is_assado);

    // Filtra os itens gerais pela categoria selecionada
    let produtosGerais = produtosFiltrados.filter(p => !p.is_assado && !p.preco_promocional);
    if (categoriaSelecionada !== 'Ver tudo') {
        produtosGerais = produtosGerais.filter(p => {
             // CORREÇÃO: Usar .trim() para remover espaços em branco extras dos dados do produto
            return (p.categoria || '').trim() === categoriaSelecionada;
        });
    }

    const truncateTextForWhatsapp = (text, maxLength = 45) => {
        if (!text || text.length <= maxLength) return text;
        let truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > -1) truncated = truncated.substring(0, lastSpace);
        return truncated + '...';
    };

    useEffect(() => {
        carregarDados();
    }, []);

    // Função corrigida que sempre usa a lista completa de produtos para calcular estoque de kits
    const calcularEstoqueProduto = (produto, allProducts) => {
        if (!allProducts || allProducts.length === 0) return produto.estoque || 0;

        if (produto.tipo_produto === 'kit' && produto.componentes_kit?.length > 0) {
            const estoquesPossiveis = produto.componentes_kit.map(componente => {
                const produtoComponente = allProducts.find(p => p.id === componente.produto_id);
                if (!produtoComponente || typeof produtoComponente.estoque !== 'number' || componente.quantidade_utilizada <= 0) {
                    return 0; // Se um componente não existe ou não tem estoque, o kit não pode ser montado
                }
                return Math.floor(produtoComponente.estoque / componente.quantidade_utilizada);
            });
            return Math.min(...estoquesPossiveis);
        }
        return produto.estoque || 0;
    };

    const carregarDados = async () => {
        setLoading(true);
        try {
            const allProducts = await Produto.list("-created_date", 1000);
            setTodosOsProdutos(allProducts); // Armazena a lista completa no estado

            const produtosParaOcultar = [];

            const produtosVisiveis = allProducts.filter(p => {
                const estoque = calcularEstoqueProduto(p, allProducts);

                // Se o estoque é zero e ainda está marcado para aparecer, adiciona à lista para ocultar
                if (estoque <= 0 && p.aparece_catalogo === true) {
                    produtosParaOcultar.push(p.id);
                }

                // A condição final para aparecer no catálogo é ter estoque > 0
                return p.ativo !== false &&
                       p.aparece_catalogo === true &&
                       (p.preco_atacado || 0) > 0 &&
                       estoque > 0;
            });

            // Oculta os produtos sem estoque no banco de dados
            if (produtosParaOcultar.length > 0) {
                const ocultarPromises = produtosParaOcultar.map(id =>
                    Produto.update(id, { aparece_catalogo: false }).catch(err =>
                        console.error(`Erro ao ocultar produto ${id}:`, err)
                    )
                );
                await Promise.all(ocultarPromises);
            }

            // Randomize the products before setting them to state, ensuring initial randomization
            setProdutos(produtosVisiveis.sort(() => Math.random() - 0.5));
        } catch (error) {
            console.error('Erro ao carregar produtos (Atacado):', error);
        } finally {
            setLoading(false);
        }
    };

    const adicionarAoCarrinho = (produto, quantidade = 1) => {
        setCarrinho(prev => {
            const itemExistente = prev.find(item => item.codigo === produto.codigo);
            if (itemExistente) {
                const novaQuantidade = Math.max(0, itemExistente.quantidade + quantidade);
                if (novaQuantidade === 0) {
                    return prev.filter(item => item.codigo !== produto.codigo);
                }
                return prev.map(item =>
                    item.codigo === produto.codigo ? { ...item, quantidade: novaQuantidade, subtotal: novaQuantidade * item.preco_unitario } : item
                );
            } else if (quantidade > 0) {
                // Passa a lista completa de produtos para calcular o estoque corretamente
                const estoqueDisponivel = calcularEstoqueProduto(produto, todosOsProdutos);
                if (estoqueDisponivel < quantidade) {
                    alert(`Estoque insuficiente! Disponível: ${estoqueDisponivel}`);
                    return prev;
                }

                return [...prev, {
                    id: `${produto.codigo}-${Date.now()}`,
                    codigo: produto.codigo,
                    descricao: produto.descricao,
                    quantidade,
                    preco_unitario: produto.preco_atacado || 0,
                    subtotal: (produto.preco_atacado || 0) * quantidade,
                    imagem_url: produto.imagem_url,
                }];
            }
            return prev;
        });
        if (produtoSelecionado) {
            setProdutoSelecionado(null);
        }
    };

    const removerDoCarrinho = (itemId) => {
        setCarrinho(prev => {
            const itemExistente = prev.find(item => item.id === itemId);
            if (itemExistente && itemExistente.quantidade > 1) {
                return prev.map(item =>
                    item.id === itemId ? { ...item, quantidade: item.quantidade - 1, subtotal: (item.quantidade - 1) * item.preco_unitario } : item
                );
            } else {
                return prev.filter(item => item.id !== itemId);
            }
        });
    };

    const enviarPedido = async () => {
        if (carrinho.length === 0) return;

        try {
            const linkUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const numeroPedido = `PED-ATACADO-${Date.now()}`;

            let total = 0;
            carrinho.forEach(item => total += item.subtotal);

            await PedidoOnline.create({
                numero_pedido: numeroPedido,
                link_unico: linkUnico,
                itens: carrinho.map(item => ({
                    codigo: item.codigo,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    subtotal: item.subtotal,
                    imagem_url: item.imagem_url
                })),
                total: total,
                economia: 0,
                data_criacao: new Date().toISOString()
            });

            let mensagem = `MEU PEDIDO ATACADO:\n\n`;
            carrinho.forEach(item => {
                const descricaoTruncada = truncateTextForWhatsapp(item.descricao);
                mensagem += `Cod (C${item.codigo}) ${descricaoTruncada}\n`;
                mensagem += `Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n\n`;
            });
            mensagem += `TOTAL DO PEDIDO: R$ ${total.toFixed(2)}`;

            const mensagemCodificada = encodeURIComponent(mensagem);
            const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemCodificada}`;
            window.open(linkWhatsApp, '_blank');

            setCarrinho([]);
            setIsCartVisible(false);

        } catch (error) {
            console.error('Erro ao enviar pedido de atacado:', error);
            alert('Erro ao processar pedido. Tente novamente.');
        }
    };

    const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);
    
    const renderSecao = (titulo, produtosDaSecao, mostrarTodos = true, onMostrarTodos = null) => {
        if (!produtosDaSecao || produtosDaSecao.length === 0) return null;
        
        const produtosParaMostrar = mostrarTodos ? produtosDaSecao : produtosDaSecao.slice(0, 3);
        const temMaisProdutos = produtosDaSecao.length > 3;

        return (
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4 px-4">
                    <h2 className="text-xl font-bold text-white">{titulo}</h2>
                    {!mostrarTodos && temMaisProdutos && onMostrarTodos && (
                        <button
                            onClick={onMostrarTodos}
                            className="border border-green-600 text-green-600 hover:bg-gray-800 px-3 py-1 rounded-full text-sm"
                        >
                            Mostrar tudo
                        </button>
                    )}
                </div>
                <div className="space-y-3 px-2">
                    {produtosParaMostrar.map((produto) => (
                        <CardProdutoAtacado
                            key={produto.id || produto.codigo}
                            produto={produto}
                            onCardClick={setProdutoSelecionado}
                            onAddClick={adicionarAoCarrinho}
                            carrinho={carrinho}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans">
            <HeaderCatalogoAtacado
                onCartClick={() => setIsCartVisible(true)}
                cartItemCount={totalItensCarrinho}
                whatsappNumber={numeroWhatsApp}
                // setFiltro={setFiltro} // Uncomment if HeaderCatalogoAtacado provides filter options
                // setBusca={setBusca} // Uncomment if HeaderCatalogoAtacado provides global search
            />

            <div className="pt-16">
                <div className="text-center py-6 bg-gradient-to-br from-blue-700 to-blue-900">
                     <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1998e308b_1000133280_d3377269cbb8de9edc1987eb5d5b980c-24_12_202411_46_41.png"
                        alt="Sabor de Minas"
                        className="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-4 border-blue-400"
                    />
                    <h1 className="text-2xl font-bold text-white mb-1">Catálogo Atacado</h1>
                    <p className="text-blue-100 text-sm">Produtos com preço especial para revendedores 🤑</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <ShoppingCart className="w-10 h-10 animate-pulse" />
                    </div>
                ) : (
                    <div className="p-2 space-y-6">
                        {filtro === 'todas' || filtro === 'assados' ?
                            renderSecao("Assados", produtosAssados, mostrarTodosAssados, () => setMostrarTodosAssados(true)) : null}
                        
                        {filtro === 'todas' || filtro === 'promocoes' ?
                            renderSecao("Promoções", produtosPromocoes, mostrarTodasPromocoes, () => setMostrarTodasPromocoes(true)) : null}
                        
                        {(filtro === 'todas' || filtro === 'gerais') && (
                            <div className="mb-6">
                                <div className="px-4 mb-4">
                                    <h2 className="text-xl font-bold text-white">Todos os Itens</h2>
                                </div>

                                {/* Filtro de Categoria com quebra de linha */}
                                <div className="px-4 mb-4">
                                    <div className="flex flex-wrap justify-between gap-2">
                                        {categoriasGerais.map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => setCategoriaSelecionada(cat)}
                                                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${
                                                    categoriaSelecionada === cat 
                                                    ? 'bg-green-600 text-white' 
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                                style={{
                                                    minWidth: 'fit-content',
                                                    flex: '1 1 auto'
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lista de Produtos */}
                                <div className="space-y-3 px-2">
                                    {produtosGerais.length > 0 ? (
                                        produtosGerais.map((produto) => (
                                            <CardProdutoAtacado
                                                key={produto.id || produto.codigo}
                                                produto={produto}
                                                onCardClick={setProdutoSelecionado}
                                                onAddClick={adicionarAoCarrinho}
                                                carrinho={carrinho}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <p>Nenhum produto encontrado nesta categoria.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <BotaoFlutuanteCarrinhoAtacado
                isVisible={carrinho.length > 0 && !isCartVisible}
                itemCount={totalItensCarrinho}
                onClick={() => setIsCartVisible(true)}
            />

            {isCartVisible && (
                <CarrinhoAtacado
                    carrinho={carrinho}
                    onClose={() => setIsCartVisible(false)}
                    onAddToCart={(item) => adicionarAoCarrinho(item, 1)}
                    onRemoveFromCart={removerDoCarrinho}
                    onEnviarPedido={enviarPedido}
                />
            )}

            {produtoSelecionado && (
                <ModalDetalheProdutoAtacado
                    produto={produtoSelecionado}
                    onClose={() => setProdutoSelecionado(null)}
                    onAddToCart={(qtd) => adicionarAoCarrinho(produtoSelecionado, qtd)}
                    whatsappNumber={numeroWhatsApp}
                />
            )}

            {carrinho.length > 0 && <div className="h-20" />}
        </div>
    );
}
