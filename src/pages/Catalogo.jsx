
import React, { useState, useEffect, useMemo } from 'react';
import { Produto, PedidoOnline } from '@/api/entities';
import { ShoppingCart, Download } from 'lucide-react';

import HeaderCatalogo from '../components/catalogo/HeaderCatalogo';
import CardProduto from '../components/catalogo/CardProduto';
import ModalDetalheProduto from '../components/catalogo/ModalDetalheProduto';
import Carrinho from '../components/catalogo/Carrinho';
import BotaoFlutuanteCarrinho from '../components/catalogo/BotaoFlutuanteCarrinho';
import { Button } from '@/components/ui/button'; // Assuming this import for the Button component

export default function Catalogo() {
    const [produtos, setProdutos] = useState([]);
    const [todosOsProdutos, setTodosOsProdutos] = useState([]); // <- GUARDA A LISTA COMPLETA
    const [carrinho, setCarrinho] = useState([]);
    const [produtoDetalhado, setProdutoDetalhado] = useState(null); // Renamed from produtoSelecionado
    const [mostrarCarrinho, setMostrarCarrinho] = useState(false); // Renamed from isCartVisible
    const [loading, setLoading] = useState(true);

    const [mostrarTodosAssados, setMostrarTodosAssados] = useState(false);
    const [mostrarTodasPromocoes, setMostrarTodasPromocoes] = useState(false);

    // New states from outline
    const [busca, setBusca] = useState('');
    const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todos os itens'); // Categoria selecionada para os itens gerais
    const [categoriaFiltro, setCategoriaFiltro] = useState('todas'); // This corresponds to 'filtro' in the outline
    const [bairroSelecionado, setBairroSelecionado] = useState(null);
    const [bairros, setBairros] = useState([]); // No logic to populate, initialized empty
    const [gerandoPDF, setGerandoPDF] = useState(false);

    const numeroWhatsApp = '5511967758855';

    const truncateTextForWhatsapp = (text, maxLength = 45) => {
        if (!text || text.length <= maxLength) return text;
        let truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > -1) truncated = truncated.substring(0, lastSpace);
        return truncated + '...';
    };

    useEffect(() => {
        carregarDados();
        verificarPedidoParaEdicao();
    }, []);

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
                    (p.preco_varejo || 0) > 0 &&
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

            setProdutos(produtosVisiveis); // Define apenas os produtos visíveis para renderização
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        } finally {
            setLoading(false);
        }
    };

    // NOVO: useEffect centralizado para salvar o carrinho no localStorage
    useEffect(() => {
        // Salva o carrinho apenas se houver itens
        if (carrinho.length > 0) {
            const dadosParaSalvar = {
                itens: carrinho,
                timestamp: Date.now()
            };
            // Usando uma chave específica para este backup de 1 hora
            localStorage.setItem('carrinho_backup_1_hora', JSON.stringify(dadosParaSalvar));
        } else {
            // Se o carrinho for esvaziado, remove o backup
            localStorage.removeItem('carrinho_backup_1_hora');
        }
    }, [carrinho]);


    const verificarPedidoParaEdicao = async () => {
        // 1. Tentar carregar o carrinho salvo por 1 hora
        try {
            const dadosSalvos = localStorage.getItem('carrinho_backup_1_hora');
            if (dadosSalvos) {
                const dados = JSON.parse(dadosSalvos);
                const umaHoraEmMs = 60 * 60 * 1000;
                
                // Se os dados não expiraram (menos de 1 hora)
                if (dados.timestamp && (Date.now() - dados.timestamp) < umaHoraEmMs) {
                    if (dados.itens && dados.itens.length > 0) {
                        setCarrinho(dados.itens);
                        console.log('Carrinho restaurado do backup de 1 hora.');
                        return; // Pára a execução se o backup foi restaurado
                    }
                } else {
                    // Limpa se o backup expirou
                    localStorage.removeItem('carrinho_backup_1_hora');
                    console.log('Backup do carrinho expirado e removido.');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar backup do carrinho:', error);
            localStorage.removeItem('carrinho_backup_1_hora');
        }

        // 2. Lógica existente para carregar pedido por link (se o backup não existir ou estiver expirado)
        const urlParams = new URLSearchParams(window.location.search);
        const linkUnico = urlParams.get('pedido');
        if (linkUnico) {
            try {
                const pedidos = await PedidoOnline.filter({ link_unico: linkUnico });
                if (pedidos.length > 0) {
                    const pedido = pedidos[0];
                    const itensCarrinho = pedido.itens.map(item => ({ ...item, id: `${item.codigo}-${Date.now()}` }));
                    setCarrinho(itensCarrinho);
                    
                    // Salvar também como dados permanentes (agora no backup de 1h)
                    // The original `carrinh_catalogo_permanente` key logic is now replaced by `carrinho_backup_1_hora`
                    const dadosParaBackup = {
                        itens: itensCarrinho,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('carrinho_backup_1_hora', JSON.stringify(dadosParaBackup));
                    console.log('Pedido da URL salvo como backup de 1 hora.');
                }
            } catch (error) {
                console.error('Erro ao carregar pedido da URL:', error);
            }
        }
    };

    const adicionarAoCarrinho = (produto, quantidade = 1) => {
        setCarrinho(prev => {
            const itemExistente = prev.find(item => item.codigo === produto.codigo);
            let newCart;
            if (itemExistente) {
                const novaQuantidade = Math.max(0, itemExistente.quantidade + quantidade);
                if (novaQuantidade === 0) {
                    newCart = prev.filter(item => item.codigo !== produto.codigo);
                } else {
                    newCart = prev.map(item =>
                        item.codigo === produto.codigo ? { ...item, quantidade: novaQuantidade, subtotal: novaQuantidade * item.preco_unitario } : item
                    );
                }
            } else if (quantidade > 0) {
                const estoqueDisponivel = calcularEstoqueProduto(produto, todosOsProdutos);
                if (estoqueDisponivel < quantidade) {
                    alert(`Estoque insuficiente! Disponível: ${estoqueDisponivel}`);
                    return prev;
                }

                newCart = [...prev, {
                    id: `${produto.codigo}-${Date.now()}`,
                    codigo: produto.codigo,
                    descricao: produto.descricao,
                    quantidade,
                    preco_unitario: produto.preco_varejo || 0,
                    subtotal: (produto.preco_varejo || 0) * quantidade,
                    imagem_url: produto.imagem_url,
                    preco_original_promocao: produto.preco_original_promocao || 0
                }];
            } else {
                newCart = prev;
            }

            // LÓGICA DE SALVAMENTO REMOVIDA DAQUI - Agora é gerenciada pelo useEffect
            return newCart;
        });
        if (produtoDetalhado) {
            setProdutoDetalhado(null);
        }
    };

    const removerDoCarrinho = (itemId) => {
        setCarrinho(prev => {
            let newCart;
            const itemExistente = prev.find(item => item.id === itemId);
            if (itemExistente && itemExistente.quantidade > 1) {
                newCart = prev.map(item =>
                    item.id === itemId ? { ...item, quantidade: item.quantidade - 1, subtotal: (item.quantidade - 1) * item.preco_unitario } : item
                );
            } else {
                newCart = prev.filter(item => item.id !== itemId);
            }

            // LÓGICA DE SALVAMENTO REMOVIDA DAQUI - Agora é gerenciada pelo useEffect
            return newCart;
        });
    };

    const enviarPedido = async (nomeCliente, bairroCliente = '', infoEntrega = null) => {
        if (carrinho.length === 0) return;

        try {
            const linkUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const numeroPedido = `PED${Date.now()}`;

            let total = 0;
            let economia = 0;

            carrinho.forEach(item => {
                total += item.subtotal;
                if (item.preco_original_promocao > 0) {
                    economia += (item.preco_original_promocao - item.preco_unitario) * item.quantidade;
                }
            });

            await PedidoOnline.create({
                numero_pedido: numeroPedido,
                link_unico: linkUnico,
                cliente_nome: nomeCliente,
                bairro: bairroCliente || '',
                itens: carrinho.map(item => ({
                    codigo: item.codigo,
                    descricao: item.descricao,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario,
                    subtotal: item.subtotal,
                    imagem_url: item.imagem_url
                })),
                total: total,
                economia: economia,
                data_criacao: new Date().toISOString()
            });

            let mensagem = `MEU PEDIDO AQUI:\n\n`;
            
            // Adicionar nome do cliente
            if (nomeCliente) {
                mensagem += `👤 Cliente: ${nomeCliente}\n\n`;
            }

            carrinho.forEach(item => {
                const descricaoTruncada = truncateTextForWhatsapp(item.descricao);
                mensagem += `Cod (C${item.codigo}) ${descricaoTruncada}\n`;
                mensagem += `Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${item.subtotal.toFixed(2)}\n\n`;
            });

            mensagem += `TOTAL DO PEDIDO: R$ ${total.toFixed(2)}\n\n`;

            // Adicionar informações de entrega
            if (bairroCliente) {
                if (infoEntrega && infoEntrega.cidadeNome) {
                    mensagem += `📍 Bairro: ${bairroCliente} - ${infoEntrega.cidadeNome}\n`;
                } else {
                    mensagem += `📍 Bairro: ${bairroCliente}\n`;
                }
                
                if (infoEntrega) {
                    if (infoEntrega.entregaGratis) {
                        mensagem += `🎉 ENTREGAMOS GRÁTIS NESTE BAIRRO!\n`;
                    } else {
                        mensagem += `🛵 Taxa de entrega para ${bairroCliente}: R$ ${infoEntrega.taxa.toFixed(2)}\n`;
                        mensagem += `🧾 Pedido ficou R$ ${(total + infoEntrega.taxa).toFixed(2)} com a entrega\n`;
                    }
                }
            } else {
                 if (infoEntrega) {
                    mensagem += `🛵 Taxa de entrega: R$ ${infoEntrega.taxa.toFixed(2)}\n`;
                    mensagem += `🧾 Pedido ficou R$ ${(total + infoEntrega.taxa).toFixed(2)} com a entrega\n`;
                }
            }

            const mensagemCodificada = encodeURIComponent(mensagem);
            const linkWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${mensagemCodificada}`;
            window.open(linkWhatsApp, '_blank');

            // --- MUDANÇA PRINCIPAL ---
            // NÃO limpa o carrinho nem remove o localStorage. Apenas esconde o modal.
            // O useEffect já garante que o carrinho está salvo.
            // O timestamp no localStorage será o de quando o último item foi adicionado/removido.
            // Para "resetar" o timer de 1 hora a partir do envio, atualizamos o timestamp.
            const dadosSalvos = localStorage.getItem('carrinho_backup_1_hora');
            if (dadosSalvos) {
                try {
                    const dados = JSON.parse(dadosSalvos);
                    dados.timestamp = Date.now(); // Atualiza o timestamp para o momento do envio
                    localStorage.setItem('carrinho_backup_1_hora', JSON.stringify(dados));
                    console.log('Timestamp do backup do carrinho atualizado para 1 hora.');
                } catch (e) { console.error("Erro ao atualizar timestamp do backup:", e); }
            }
            
            setMostrarCarrinho(false);
            // As linhas abaixo foram removidas para manter o carrinho:
            // setCarrinho([]);
            // localStorage.removeItem('carrinh_catalogo_permanente');

        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            alert('Erro ao processar pedido. Tente novamente.');
        }
    };

    const gerarPDFCatalogo = async () => {
        setGerandoPDF(true);
        try {
            // Carrega jsPDF dinamicamente se não existir (sem alterar package.json)
            const ensureJsPDF = () => new Promise((resolve, reject) => {
                if (window.jspdf || window.jsPDF) return resolve();
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
                document.head.appendChild(script);
            });
            await ensureJsPDF();
            const { jsPDF } = window.jspdf || window;

            const dpi = 300; // Alta definição
            const a4WidthPx = 8.27 * dpi; // 2481
            const a4HeightPx = 11.69 * dpi; // 3508
            // PÁGINAS DE PRODUTO: sem capa agora – somente margem mínima
            const marginX = 0; // sem margem lateral para ocupar toda a página
            const topMarginProdutos = 30; // pequena folga superior
            const bottomMarginProdutos = 30; // pequena folga inferior
            const cardsPerPage = 3; // agora 3 itens por página para aumentar tamanho
            const cardHeight = Math.floor((a4HeightPx - topMarginProdutos - bottomMarginProdutos) / cardsPerPage);

            const loadImage = (url) => new Promise(resolve => {
                if (!url) return resolve(null);
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = url;
            });

            // Produtos visíveis clonados e embaralhados (ordem aleatória a cada geração)
            const produtosDisponiveis = produtos
                .filter(p => p.aparece_catalogo !== false)
                .slice();
            // Fisher-Yates shuffle
            for (let i = produtosDisponiveis.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [produtosDisponiveis[i], produtosDisponiveis[j]] = [produtosDisponiveis[j], produtosDisponiveis[i]];
            }

            const pages = [];

            // ====== PÁGINAS DE PRODUTOS ======
            let canvas = document.createElement('canvas');
            canvas.width = a4WidthPx; canvas.height = a4HeightPx;
            let ctx = canvas.getContext('2d');
            let cardIndexInPage = 0;

            const iniciarPaginaProdutos = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0,0,canvas.width,canvas.height);
                cardIndexInPage = 0;
            };
            iniciarPaginaProdutos();

            for (let i=0;i<produtosDisponiveis.length;i++) {
                const produto = produtosDisponiveis[i];
                if (cardIndexInPage >= cardsPerPage) {
                    pages.push(canvas.toDataURL('image/jpeg',0.92));
                    iniciarPaginaProdutos();
                }
                const cardY = topMarginProdutos + cardIndexInPage * cardHeight + 5;
                const cardWidth = a4WidthPx - marginX*2; // largura total
                const cardX = marginX; // começa na borda
                const cardH = cardHeight - 10; // pequena folga interna inferior
                const cardRadius = 24;
                ctx.fillStyle = '#0f1622';
                ctx.beginPath();
                ctx.moveTo(cardX+cardRadius,cardY);
                ctx.lineTo(cardX+cardWidth-cardRadius,cardY);
                ctx.quadraticCurveTo(cardX+cardWidth,cardY,cardX+cardWidth,cardY+cardRadius);
                ctx.lineTo(cardX+cardWidth,cardY+cardH-cardRadius);
                ctx.quadraticCurveTo(cardX+cardWidth,cardY+cardH,cardX+cardWidth-cardRadius,cardY+cardH);
                ctx.lineTo(cardX+cardRadius,cardY+cardH);
                ctx.quadraticCurveTo(cardX,cardY+cardH,cardX,cardY+cardH-cardRadius);
                ctx.lineTo(cardX,cardY+cardRadius);
                ctx.quadraticCurveTo(cardX,cardY,cardX+cardRadius,cardY);
                ctx.closePath();
                ctx.fill();

                // IMAGEM GRANDE
                let imgBoxSize = 1040; // alvo
                if (imgBoxSize > cardH - 40) imgBoxSize = cardH - 40; // garante que cabe deixando margem
                const imgX = cardX + 40;
                const imgY = cardY + (cardH - imgBoxSize)/2; // centraliza vertical
                if (produto.imagem_url) {
                    // eslint-disable-next-line no-await-in-loop
                    const img = await loadImage(produto.imagem_url);
                    if (img) {
                        ctx.fillStyle = '#1e2936';
                        ctx.fillRect(imgX, imgY, imgBoxSize, imgBoxSize);
                        ctx.strokeStyle = '#374151';
                        ctx.lineWidth = 6;
                        ctx.strokeRect(imgX, imgY, imgBoxSize, imgBoxSize);
                        const ratio = img.width / img.height;
                        let drawW, drawH;
                        if (ratio > 1) { drawW = imgBoxSize; drawH = imgBoxSize/ratio; }
                        else { drawH = imgBoxSize; drawW = imgBoxSize*ratio; }
                        const offX = imgX + (imgBoxSize - drawW)/2;
                        const offY = imgY + (imgBoxSize - drawH)/2;
                        ctx.drawImage(img, offX, offY, drawW, drawH);
                    }
                }

                // TEXTO
                const textX = imgX + imgBoxSize + 60; // mais espaço após imagem
                const textRight = cardX + cardWidth - 70;
                const textWidth = textRight - textX;
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                // Aumentado: descrição e preço +20%
                const codeFontSize = 84; // mantém código
                const bodyFontSize = 86; // antes 72
                const tagFontSize = 72; // mantém tags
                const lineHeight = 100; // ajustado para acomodar nova fonte
                // Código
                ctx.font = `bold ${codeFontSize}px Arial`;
                let currentY = imgY + 50;
                ctx.fillText(`(C${produto.codigo})`, textX, currentY);
                // Descrição
                currentY += lineHeight + 30; // gap maior para descer a descrição e harmonizar layout
                ctx.font = `bold ${bodyFontSize}px Arial`;
                const words = (produto.descricao || '').split(/\s+/);
                let line = '';
                for (let w=0; w<words.length; w++) {
                    const test = line + words[w] + ' ';
                    if (ctx.measureText(test).width > textWidth && line) {
                        ctx.fillText(line.trim(), textX, currentY);
                        line = words[w] + ' ';
                        currentY += lineHeight;
                        // Reserva espaço mínimo para preço + tags (2*lineHeight + padding)
                        if (currentY > imgY + imgBoxSize - (lineHeight*2 + 140)) { line = '...'; ctx.fillText(line, textX, currentY); break; }
                    } else line = test;
                }
                if (line !== '...') {
                    ctx.fillText(line.trim(), textX, currentY);
                }
                const descEndY = currentY;
                // Definir posições alvo para preço e tag para distribuir no bloco vertical da imagem
                let priceY = imgY + imgBoxSize - (lineHeight*2) - 60; // posiciona mais acima do fundo
                let tagY = priceY + lineHeight + 20;
                // Se descrição invadir espaço planejado para preço, empurra tudo para baixo
                if (descEndY + lineHeight + 40 > priceY) {
                    priceY = descEndY + lineHeight + 40;
                    tagY = priceY + lineHeight + 20;
                }
                // Caso ultrapasse a área da imagem, limitar
                if (tagY > imgY + imgBoxSize - 20) {
                    const overflow = tagY - (imgY + imgBoxSize - 20);
                    priceY -= overflow;
                    tagY -= overflow;
                }
                // Preço
                ctx.fillStyle = '#10b981';
                ctx.font = `bold ${bodyFontSize}px Arial`;
                ctx.fillText(`R$ ${(produto.preco_varejo || 0).toFixed(2)}`, textX, priceY);
                // Tag
                if (produto.is_assado || produto.preco_promocional) {
                    ctx.font = `bold ${tagFontSize}px Arial`;
                    if (produto.is_assado) { ctx.fillStyle = '#dc2626'; ctx.fillText('ASSADO', textX, tagY); }
                    else if (produto.preco_promocional) { ctx.fillStyle = '#f59e0b'; ctx.fillText('PROMOÇÃO', textX, tagY); }
                }

                cardIndexInPage++;
            }

            // Salva última página de produtos
            pages.push(canvas.toDataURL('image/jpeg',0.92));

            // Monta PDF
            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            for (let i=0;i<pages.length;i++) {
                if (i>0) pdf.addPage();
                const imgData = pages[i];
                // Ajusta imagem para largura total da página considerando jsPDF A4 595x842 pt
                const pageWidthPt = pdf.internal.pageSize.getWidth();
                const pageHeightPt = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'JPEG', 0, 0, pageWidthPt, pageHeightPt, undefined, 'FAST');
            }
            pdf.save('catalogo-sabor-de-minas.pdf');
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF do catálogo');
        } finally {
            setGerandoPDF(false);
        }
    };

    const totalItensCarrinho = carrinho.reduce((total, item) => total + item.quantidade, 0);

    // This useMemo hook processes and randomizes the list of products based on filters.
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
        produtos.forEach(p => {
            if (p.categoria && p.categoria.trim() !== '' && !p.is_assado && !p.preco_promocional) {
                categorias.add(p.categoria.trim());
            }
        });
        return ['Todos os itens', ...Array.from(categorias).sort()];
    }, [produtos]);

    // Derive the display sections from the `produtosFiltrados` list
    // This ensures that search, category filters, and randomization apply to all displayed sections.
    const produtosAssados = produtosFiltrados.filter(p => p.is_assado === true);
    const produtosPromocoes = produtosFiltrados.filter(p => p.preco_promocional === true && !p.is_assado);
    
    // Filtra os itens gerais pela categoria selecionada - CORRIGINDO AQUI
    let produtosGerais = produtosFiltrados.filter(p => !p.is_assado && !p.preco_promocional);
    
    if (categoriaSelecionada !== 'Todos os itens') {
        produtosGerais = produtosGerais.filter(p => {
            // CORREÇÃO: Usar .trim() para remover espaços em branco extras dos dados do produto
            return (p.categoria || '').trim() === categoriaSelecionada;
        });
    }

    const renderSecao = (titulo, produtosDaSecao, mostrarTodos = true, onMostrarTodos = null) => {
        // Only render the section if there are products
        if (!produtosDaSecao || produtosDaSecao.length === 0) {
            return null;
        }
        
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
                        <CardProduto
                            key={produto.id || produto.codigo}
                            produto={produto}
                            onCardClick={setProdutoDetalhado}
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
            <HeaderCatalogo
                // Updated props for iFood flow and search/filter
                busca={busca}
                setBusca={setBusca}
                categoriaFiltro={categoriaFiltro}
                setCategoriaFiltro={setCategoriaFiltro}
                bairroSelecionado={bairroSelecionado}
                setBairroSelecionado={setBairroSelecionado}
                bairros={bairros}
                totalItens={totalItensCarrinho} // Renamed from cartItemCount
                onMostrarCarrinho={() => setMostrarCarrinho(true)} // Renamed from onCartClick
            />

            {/* Botão PDF - Apenas Desktop */}
            <div className="hidden md:block fixed top-20 right-4 z-30">
                <Button
                    onClick={gerarPDFCatalogo}
                    disabled={gerandoPDF}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
                    size="sm"
                >
                    <Download className="w-4 h-4 mr-2" />
                    {gerandoPDF ? 'Gerando PDF...' : 'PDF'}
                </Button>
            </div>

            <div className="pt-16">
                <div className="text-center py-6 bg-gradient-to-br from-yellow-600 to-yellow-800">
                    <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1998e308b_1000133280_d3377269cbb8de9edc1987eb5d5b980c-24_12_202411_46_41.png"
                        alt="Sabor de Minas"
                        className="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-4 border-yellow-400"
                    />
                    <h1 className="text-2xl font-bold text-white mb-1">Pão D'Queijo e Cia</h1>
                    <p className="text-yellow-100 text-sm">Vendemos no atacado e varejo produtos direto de Minas 😋</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <ShoppingCart className="w-10 h-10 animate-pulse" />
                    </div>
                ) : (
                    <div className="p-2 space-y-6">
                        {/* Render sections based on categoriaFiltro and busca */}
                        {categoriaFiltro === 'todas' || categoriaFiltro === 'assados' ?
                            renderSecao("Assados", produtosAssados, mostrarTodosAssados, () => setMostrarTodosAssados(true)) : null}
                        
                        {categoriaFiltro === 'todas' || categoriaFiltro === 'promocoes' ?
                            renderSecao("Promoções", produtosPromocoes, mostrarTodasPromocoes, () => setMostrarTodasPromocoes(true)) : null}
                        
                        {/* Seção "Selecione a categoria" com filtro de categoria */}
                        {(categoriaFiltro === 'todas' || categoriaFiltro === 'gerais') && (
                            <div className="mb-6">
                                <div className="px-4 mb-4">
                                    <h2 className="text-xl font-bold text-white">Selecione a categoria</h2>
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
                                            <CardProduto
                                                key={produto.id || produto.codigo}
                                                produto={produto}
                                                onCardClick={setProdutoDetalhado}
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

            <BotaoFlutuanteCarrinho
                isVisible={carrinho.length > 0 && !mostrarCarrinho}
                itemCount={totalItensCarrinho}
                onClick={() => setMostrarCarrinho(true)}
            />

            {mostrarCarrinho && (
                <Carrinho
                    carrinho={carrinho}
                    onClose={() => setMostrarCarrinho(false)}
                    onAddToCart={(item) => adicionarAoCarrinho(item, 1)}
                    onRemoveFromCart={removerDoCarrinho}
                    onEnviarPedido={enviarPedido}
                    onUpdateCarrinho={setCarrinho} // Passa o setCarrinho diretamente
                />
            )}

            {produtoDetalhado && (
                <ModalDetalheProduto
                    produto={produtoDetalhado}
                    onClose={() => setProdutoDetalhado(null)}
                    onAddToCart={(qtd) => adicionarAoCarrinho(produtoDetalhado, qtd)}
                    whatsappNumber={numeroWhatsApp}
                />
            )}

            {carrinho.length > 0 && <div className="h-20" />}
        </div>
    );
}
