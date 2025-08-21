
import React, { useState, useEffect, useRef } from 'react';
import { Bairro } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Minus, Plus, ArrowLeft } from 'lucide-react';
import CachedImage from '../common/CachedImage'; // Importa o novo componente

export default function Carrinho({ carrinho, onClose, onAddToCart, onRemoveFromCart, onEnviarPedido, onUpdateCarrinho }) {
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [nomeCliente, setNomeCliente] = useState('');
    const [bairroCliente, setBairroCliente] = useState('');
    const [nomeError, setNomeError] = useState(false);
    const [bairros, setBairros] = useState([]);
    const [infoEntrega, setInfoEntrega] = useState(null); // { taxa, minimo, entregaGratis }
    const [showSugestoesBairro, setShowSugestoesBairro] = useState(false);
    const [bairrosSugeridos, setBairrosSugeridos] = useState([]);
    const [bairroSelecionado, setBairroSelecionado] = useState(null); // Novo estado para persistir bairro selecionado

    // Ref para o timer de debounce
    const timerRef = useRef(null);

    // Calcular subtotal primeiro, antes dos useEffects
    const subtotal = carrinho.reduce((total, item) => total + (item.subtotal || 0), 0);
    const economia = carrinho.reduce((total, item) => {
        if (item.preco_original_promocao > 0) {
            return total + (item.preco_original_promocao - (item.preco_unitario || 0)) * item.quantidade;
        }
        return total;
    }, 0);

    useEffect(() => {
        carregarBairros();
        // Carregar dados permanentes do cliente (nome e bairro) ao abrir o carrinho
        const dadosSalvos = localStorage.getItem('cliente_dados_permanentes');
        if (dadosSalvos) {
            try {
                const { nome, bairro } = JSON.parse(dadosSalvos);
                if (nome) setNomeCliente(nome);
                // Do not override bairroCliente here if it's set by localStorage later
                if (bairro && !localStorage.getItem('bairroSelecionadoCatalogo')) {
                    setBairroCliente(bairro);
                }
            } catch (error) {
                console.error('Erro ao carregar dados permanentes do cliente:', error);
                localStorage.removeItem('cliente_dados_permanentes'); // Clear corrupted data
            }
        }
    }, []);

    // Carregar bairro selecionado do localStorage ao abrir o carrinho
    useEffect(() => {
        const bairroSalvo = localStorage.getItem('bairroSelecionadoCatalogo');
        if (bairroSalvo) {
            try {
                const { bairro, nomeDigitado } = JSON.parse(bairroSalvo);
                setBairroSelecionado(bairro);
                setBairroCliente(nomeDigitado);
                
                // Aplicar automaticamente as informações de entrega
                const taxa = bairro.taxa_entrega || 0;
                const minimo = bairro.minimo_entrega_gratis || 0;
                const entregaGratis = subtotal >= minimo || (minimo - subtotal) <= 1;
                
                setInfoEntrega({
                    taxa,
                    minimo,
                    entregaGratis,
                    bairroNome: bairro.nome,
                    cidadeNome: bairro.cidade
                });
            } catch (error) {
                console.error('Erro ao carregar bairro salvo:', error);
                // Clear potentially corrupted data if parsing fails
                localStorage.removeItem('bairroSelecionadoCatalogo');
            }
        }
    }, [subtotal]); // Recalcular quando subtotal mudar

    // Salvar dados permanentes do cliente sempre que mudarem
    useEffect(() => {
        // Não salvar se os campos estiverem vazios para não criar lixo no localStorage
        if (nomeCliente || bairroCliente) {
            try {
                const dadosAtuais = JSON.parse(localStorage.getItem('cliente_dados_permanentes') || '{}');
                const novosDados = {
                    nome: nomeCliente || dadosAtuais.nome,
                    bairro: bairroCliente || dadosAtuais.bairro,
                };
                localStorage.setItem('cliente_dados_permanentes', JSON.stringify(novosDados));
            } catch (error) {
                console.error('Erro ao salvar dados permanentes do cliente:', error);
            }
        }
    }, [nomeCliente, bairroCliente]);

    // REMOVIDOS OS useEffects que lidavam com localStorage.
    // A lógica agora é centralizada no componente pai (Catalogo.js)

    const carregarBairros = async () => {
        try {
            const listaBairros = await Bairro.list();
            setBairros(listaBairros);
        } catch (error) {
            console.error('Erro ao carregar bairros:', error);
        }
    };

    const normalizeText = (text = '') => {
        if (!text) return '';
        return text.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z\s]/g, "") // Remove números e caracteres especiais
            .trim();
    };

    // Função para extrair palavras-chave do nome do bairro (Preservada, embora a nova lógica de busca em verificarEntrega não a utilize diretamente)
    const extrairPalavrasChave = (texto) => {
        if (!texto) return [];
        
        const textoNormalizado = normalizeText(texto);
        
        // Remover abreviações comuns no início e manter apenas as palavras importantes
        let textoLimpo = textoNormalizado
            .replace(/^(jd|jardim)\s+/, '') // Remove "jd" ou "jardim" no início
            .replace(/^(vl|vila)\s+/, '') // Remove "vl" ou "vila" no início
            .replace(/^(v)\s+/, '') // Remove "v" no início (abreviação de vila)
            .replace(/^(pq|parque)\s+/, '') // Remove "pq" ou "parque" no início
            .replace(/^(cj|conjunto)\s+/, '') // Remove "cj" ou "conjunto" no início
            .replace(/^(res|residencial)\s+/, '') // Remove "res" ou "residencial" no início
            .replace(/^(ch|chacara)\s+/, '') // Remove "ch" ou "chacara" no início
            .trim();
        
        // Se após remover as abreviações não sobrou nada, usar o texto original normalizado
        if (!textoLimpo) {
            textoLimpo = textoNormalizado;
        }
        
        // Dividir em palavras e filtrar palavras muito pequenas
        return textoLimpo.split(/\s+/).filter(palavra => palavra.length >= 3); // Aumentei para 3 caracteres mínimos
    };

    const verificarEntrega = () => {
        if (!bairroCliente || bairros.length === 0) {
            setInfoEntrega(null);
            setShowSugestoesBairro(false);
            setBairrosSugeridos([]);
            setBairroSelecionado(null); // Limpa o bairro selecionado se o input estiver vazio ou bairros não carregados
            return;
        }

        // Se já tem um bairro selecionado e o input não mudou muito, manter
        if (bairroSelecionado && normalizeText(bairroCliente).includes(normalizeText(bairroSelecionado.nome))) {
            const taxa = bairroSelecionado.taxa_entrega || 0;
            const minimo = bairroSelecionado.minimo_entrega_gratis || 0;
            const entregaGratis = subtotal >= minimo || (minimo - subtotal) <= 1;
            
            setInfoEntrega({
                taxa,
                minimo,
                entregaGratis,
                bairroNome: bairroSelecionado.nome,
                cidadeNome: bairroSelecionado.cidade
            });
            setShowSugestoesBairro(false);
            setBairrosSugeridos([]);
            return;
        } else if (bairroSelecionado && !normalizeText(bairroCliente).includes(normalizeText(bairroSelecionado.nome))) {
            // Se o input não corresponde mais ao bairro selecionado, limpa a seleção
            setBairroSelecionado(null);
        }

        const palavrasInput = bairroCliente.trim().split(/\s+/);
        let palavraParaBusca = '';

        // Procurar a última palavra válida (que não seja número ou palavra comum)
        for (let i = palavrasInput.length - 1; i >= 0; i--) {
            const palavra = palavrasInput[i];
            const palavraNormalizada = normalizeText(palavra);
            
            // Lista de palavras comuns que devem ser ignoradas
            const palavrasComuns = ['vila', 'vl', 'v', 'jardim', 'jd', 'j', 'parque', 'pq', 'p', 'conjunto', 'cj', 'residencial', 'res', 'chacara', 'ch', 'sitio'];
            
            // Se a palavra é apenas números, ignorar
            const isNumero = /^\d+$/.test(palavra);
            
            // Se não é palavra comum, não é apenas número e tem pelo menos 3 caracteres
            if (!palavrasComuns.includes(palavraNormalizada) && !isNumero && palavraNormalizada.length >= 3) {
                palavraParaBusca = palavraNormalizada;
                break;
            }
        }

        // Se não encontrou palavra válida para busca, não fazer nada
        if (!palavraParaBusca) {
            setInfoEntrega(null);
            setShowSugestoesBairro(false);
            setBairrosSugeridos([]);
            return;
        }

        // Buscar TODOS os bairros que contenham a palavra válida (busca exata)
        const bairrosEncontrados = bairros.filter(b => {
            const normalizedBairroName = normalizeText(b.nome);
            return normalizedBairroName.includes(palavraParaBusca);
        });
        
        if (bairrosEncontrados.length === 1) {
            // Se encontrou apenas um bairro, aplicar automaticamente
            const foundBairro = bairrosEncontrados[0];
            const taxa = foundBairro.taxa_entrega || 0;
            const minimo = foundBairro.minimo_entrega_gratis || 0;
            const entregaGratis = subtotal >= minimo || (minimo - subtotal) <= 1;
            
            setBairroSelecionado(foundBairro); // Persistir seleção
            setInfoEntrega({
                taxa,
                minimo,
                entregaGratis,
                bairroNome: foundBairro.nome,
                cidadeNome: foundBairro.cidade
            });
            setShowSugestoesBairro(false);
            setBairrosSugeridos([]);
            
        } else if (bairrosEncontrados.length > 1) {
            // Se encontrou múltiplos bairros, mostrar sugestões
            setBairrosSugeridos(bairrosEncontrados);
            setShowSugestoesBairro(true);
            setInfoEntrega(null);
            
        } else {
            // Se não encontrou nenhum bairro com busca exata, tentar busca por semelhança
            const bairrosSemelhantes = bairros.filter(b => {
                const normalizedBairroName = normalizeText(b.nome);
                const palavrasBairro = normalizedBairroName.split(/\s+/);
                
                // Verificar se alguma palavra do bairro tem semelhança com a palavra buscada
                return palavrasBairro.some(palavraBairro => {
                    // Calcular semelhança usando distância de Levenshtein simplificada
                    return calcularSemelhanca(palavraParaBusca, palavraBairro) >= 0.6; // 60% de semelhança
                });
            });
            
            if (bairrosSemelhantes.length > 0) {
                // Ordenar por semelhança (mais semelhante primeiro)
                bairrosSemelhantes.sort((a, b) => {
                    const semelhancaA = Math.max(...normalizeText(a.nome).split(/\s+/).map(p => calcularSemelhanca(palavraParaBusca, p)));
                    const semelhancaB = Math.max(...normalizeText(b.nome).split(/\s+/).map(p => calcularSemelhanca(palavraParaBusca, p)));
                    return semelhancaB - semelhancaA;
                });
                
                setBairrosSugeridos(bairrosSemelhantes);
                setShowSugestoesBairro(true);
                setInfoEntrega(null);
            } else {
                // Se nem por semelhança encontrou, limpar tudo
                setInfoEntrega(null);
                setShowSugestoesBairro(false);
                setBairrosSugeridos([]);
            }
        }
    };

    // Função para calcular semelhança entre duas strings (distância de Levenshtein normalizada)
    const calcularSemelhanca = (str1, str2) => {
        // Normalize strings for comparison (case-insensitive and without accents/special chars)
        str1 = normalizeText(str1);
        str2 = normalizeText(str2);

        if (str1.length === 0) return str2.length === 0 ? 1 : 0; // If both empty, 100% similar, if one empty, 0% similar
        if (str2.length === 0) return 0;

        // Create a matrix for the Levenshtein distance calculation
        const matriz = [];
        for (let i = 0; i <= str2.length; i++) {
            matriz[i] = [i]; // Initialize the first column
        }
        for (let j = 0; j <= str1.length; j++) {
            matriz[0][j] = j; // Initialize the first row
        }

        // Fill the matrix
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matriz[i][j] = matriz[i - 1][j - 1]; // No cost if characters are the same
                } else {
                    matriz[i][j] = Math.min(
                        matriz[i - 1][j - 1] + 1, // Substitution
                        matriz[i][j - 1] + 1,     // Insertion
                        matriz[i - 1][j] + 1      // Deletion
                    );
                }
            }
        }

        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1; // Both strings are empty, consider them 100% similar

        // Calculate similarity as (maxLength - distance) / maxLength
        return (maxLength - matriz[str2.length][str1.length]) / maxLength;
    };

    const selecionarBairroSugerido = (bairroSelecionadoItem, event) => {
        // Evitar propagação de eventos para prevenir duplo clique
        event?.stopPropagation();
        event?.preventDefault();
        
        // Aplicar o bairro selecionado
        const taxa = bairroSelecionadoItem.taxa_entrega || 0;
        const minimo = bairroSelecionadoItem.minimo_entrega_gratis || 0;
        const entregaGratis = subtotal >= minimo || (minimo - subtotal) <= 1;
        
        // Persistir o bairro selecionado
        setBairroSelecionado(bairroSelecionadoItem);
        
        setInfoEntrega({
            taxa,
            minimo,
            entregaGratis,
            bairroNome: bairroSelecionadoItem.nome,
            cidadeNome: bairroSelecionadoItem.cidade
        });
        
        // Atualizar o campo de input com o nome completo do bairro
        setBairroCliente(bairroSelecionadoItem.nome);
        
        // Fechar sugestões
        setShowSugestoesBairro(false);
        setBairrosSugeridos([]);
        
        // Salvar no localStorage para persistir entre navegações
        localStorage.setItem('bairroSelecionadoCatalogo', JSON.stringify({
            bairro: bairroSelecionadoItem,
            nomeDigitado: bairroSelecionadoItem.nome
        }));
    };

    // Timer para verificação de entrega (debounce)
    useEffect(() => {
        if (!bairroCliente) {
            setInfoEntrega(null);
            setShowSugestoesBairro(false);
            setBairrosSugeridos([]);
            setBairroSelecionado(null); // Limpa o bairro selecionado quando o input está vazio
            return;
        }

        // Cancelar timer anterior se existir
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Criar novo timer para verificar após 0,5 segundo (alterado de 1000 para 500ms)
        timerRef.current = setTimeout(() => {
            verificarEntrega();
        }, 500);

        // Cleanup do timer
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [bairroCliente, subtotal, bairros]); // Adicionado bairros como dependência para que a verificação ocorra após o carregamento dos bairros

    const handleEnviarPedido = async () => {
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            return;
        }
        if (!nomeCliente.trim()) {
            alert("Por favor, digite seu nome.");
            setNomeError(true);
            return;
        }
        setNomeError(false); // Clear error if name is provided

        if (!bairroCliente.trim()) {
            alert("Por favor, informe seu bairro para entrega.");
            return;
        }

        // Regras para exibir o bairro no recibo do WhatsApp
        let linhaBairro = '';
        if (infoEntrega) { // Bairro encontrado no cadastro
            if (infoEntrega.entregaGratis) {
                // Caso 2: Bairro com entrega grátis
                linhaBairro = `📍 Bairro: ${infoEntrega.bairroNome} em ${infoEntrega.cidadeNome} (entrega grátis)`;
            } else {
                // Caso 3: Bairro com taxa de entrega
                const totalComEntrega = subtotal + infoEntrega.taxa;
                linhaBairro = `📍 Bairro: ${infoEntrega.bairroNome} em ${infoEntrega.cidadeNome} - Taxa: R$ ${infoEntrega.taxa.toFixed(2)} 🛵 Total com entrega: R$ ${totalComEntrega.toFixed(2)}`;
            }
        } else { // Bairro não encontrado no cadastro
            // Caso 1: Bairro não cadastrado
            linhaBairro = `📍 Bairro: ${bairroCliente} (verificar se entrega)`;
        }

        let mensagem = `MEU PEDIDO AQUI:\n\n`;
        mensagem += `👤 Cliente: ${nomeCliente || 'Não informado'}\n\n`;

        carrinho.forEach(item => {
            mensagem += `Cod (${item.codigo}) ${item.descricao}\n`;
            mensagem += `Qtd: ${item.quantidade} x R$ ${item.preco_unitario.toFixed(2)} = R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}\n\n`;
        });

        mensagem += `TOTAL DO PEDIDO: R$ ${subtotal.toFixed(2)}\n\n`;

        // Adicionar a linha do bairro formatada
        mensagem += `${linhaBairro}\n`;
        
        const observacoes = document.getElementById('observacoes-pedido')?.value;
        if (observacoes) {
            mensagem += `\n📝 Observações:\n${observacoes}\n`;
        }

        const numeroWhatsapp = "5511967758855";
        const linkWhatsapp = `https://api.whatsapp.com/send?phone=${numeroWhatsapp}&text=${encodeURIComponent(mensagem)}`;
        
        window.open(linkWhatsapp, '_blank');

        // IMPORTANTE: Dados do cliente (nome e bairro) permanecem salvos PERMANENTEMENTE
        // Dados do carrinho também permanecem para facilitar repetição do pedido
        // Cliente pode continuar comprando com os mesmos dados e itens anteriores
        
        // Os dados só serão removidos se o cliente limpar manualmente ou trocar de dispositivo
        console.log('Pedido enviado, dados permanentes mantidos no localStorage');
        
        // Call the prop function with its existing signature
        onEnviarPedido(nomeCliente, bairroCliente, infoEntrega);
    };

    const toggleExpanded = (itemId) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        } else {
            newExpanded.add(itemId);
        }
        setExpandedItems(newExpanded);
    };

    const truncateText = (text, maxLength = 60) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Determina se deve mostrar o botão "Completar Pedido"
    const mostrarBotaoCompletar = infoEntrega && !infoEntrega.entregaGratis && (infoEntrega.minimo - subtotal) > 1;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white p-0 max-w-md h-screen flex flex-col m-0">
                <div className="p-2 border-b border-gray-700 bg-gray-800">
                    {/* Barra limpa */}
                </div>
                
                <DialogHeader className="p-4 border-b border-gray-700 flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <DialogTitle className="text-lg">Seu pedido</DialogTitle>
                        <span className="text-sm text-gray-400">{carrinho.length} itens</span>
                    </div>
                    <div className="flex flex-col gap-2 items-center relative">
                        <Input
                            placeholder="Digite seu nome"
                            value={nomeCliente}
                            onChange={(e) => {
                                setNomeCliente(e.target.value);
                                if (nomeError) setNomeError(false);
                            }}
                            className={`bg-gray-800 text-white h-10 w-40 ${nomeError ? 'border-red-500 ring-red-500' : 'border-gray-600'}`}
                        />
                        <Input
                            placeholder="Informe seu bairro"
                            value={bairroCliente}
                            onChange={(e) => {
                                setBairroCliente(e.target.value);
                                // Always clear infoEntrega and suggestions when user starts typing in the bairro field
                                setInfoEntrega(null);
                                setShowSugestoesBairro(false);
                                setBairrosSugeridos([]);
                            }}
                            className="bg-gray-800 text-white h-10 w-40 border-gray-600"
                        />
                        
                        {/* Lista de Sugestões de Bairros */}
                        {showSugestoesBairro && bairrosSugeridos.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-md mt-1 max-h-60 overflow-y-auto z-50">
                                <div className="p-2 text-xs text-gray-300 border-b border-gray-600">
                                    Escolha seu bairro:
                                </div>
                                {bairrosSugeridos.map((bairro, index) => (
                                    <button
                                        key={bairro.id || index}
                                        onClick={(e) => selecionarBairroSugerido(bairro, e)}
                                        className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                                    >
                                        <div className="text-sm font-medium text-white">
                                            {bairro.nome}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {bairro.cidade}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {carrinho.length > 0 && (
                    <div className="p-4 pt-2 border-b border-gray-700 space-y-3">
                        {economia > 0 && (
                            <div className="flex justify-between text-sm text-green-400">
                                <span>Você economiza</span>
                                <span>R$ {economia.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold">
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                        </div>

                        {/* Informações de Entrega */}
                        {infoEntrega && (
                            <div className="bg-gray-800 p-3 rounded-lg text-sm">
                                {infoEntrega.entregaGratis ? (
                                    <div className="text-center">
                                        <div className="text-yellow-400 mb-1">
                                            Taxa - {infoEntrega.bairroNome} em {infoEntrega.cidadeNome} é R$ {infoEntrega.taxa.toFixed(2)} 🛵
                                        </div>
                                        <div className="text-blue-400 mb-1">
                                            Entrega grátis - acima de R$ {infoEntrega.minimo.toFixed(2)}.
                                        </div>
                                        <div className="text-green-400 font-bold text-lg">
                                            Parabéns! Você ganhou entrega grátis! 🎉
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="text-yellow-400 mb-1">
                                            Taxa - {infoEntrega.bairroNome} em {infoEntrega.cidadeNome} é R$ {infoEntrega.taxa.toFixed(2)} 🛵
                                        </div>
                                        <div className="text-blue-400 mb-1">
                                            Entrega grátis - acima de R$ {infoEntrega.minimo.toFixed(2)}.
                                        </div>
                                        <div className="text-orange-400 font-bold text-lg">
                                            Falta só R$ {(infoEntrega.minimo - subtotal).toFixed(2)} para ganhar entrega grátis!
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Botão Completar Pedido (se necessário) */}
                        {mostrarBotaoCompletar && (
                            <Button 
                                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base font-bold mb-2"
                                onClick={onClose}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Completar Pedido
                            </Button>
                        )}

                        <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-bold" onClick={handleEnviarPedido}>
                            Enviar pedido
                        </Button>
                    </div>
                )}

                <div className="flex-grow p-4 overflow-y-auto">
                    {carrinho.length === 0 && (
                        <div className="text-center text-gray-500 pt-20">
                            <p>Seu carrinho está vazio</p>
                        </div>
                    )}
                    {carrinho.map((item, index) => {
                        const isExpanded = expandedItems.has(item.id);
                        const shouldTruncate = item.descricao && item.descricao.length > 60;
                        
                        return (
                            <div key={item.id} className={`flex justify-between items-start gap-4 py-4 ${index > 0 ? 'border-t border-gray-700' : ''}`}>
                                <div className="flex items-start gap-4 flex-1">
                                    <CachedImage 
                                        src={item.imagem_url} 
                                        alt={item.descricao} 
                                        className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                                    />
                                    <div className="flex flex-col justify-center gap-2 mt-1 flex-1">
                                        <div 
                                            className={`font-semibold leading-tight text-sm ${shouldTruncate ? 'cursor-pointer hover:text-blue-300' : ''}`}
                                            onClick={() => shouldTruncate && toggleExpanded(item.id)}
                                            style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: isExpanded ? 'unset' : 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                minHeight: isExpanded ? 'auto' : '2.5em'
                                            }}
                                        >
                                            {isExpanded ? item.descricao : (shouldTruncate ? truncateText(item.descricao) : item.descricao)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-6 h-6 p-0 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 rounded-md" 
                                                onClick={() => onRemoveFromCart(item.id)}
                                            >
                                                <Minus className="w-3 h-3"/>
                                            </Button>
                                            <span className="w-4 text-center font-bold text-sm">{item.quantidade}</span>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-6 h-6 p-0 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 rounded-md" 
                                                onClick={() => onAddToCart(item)}
                                            >
                                                <Plus className="w-3 h-3"/>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right flex-shrink-0 mt-1">
                                    <p className="text-white font-bold text-sm">R$ {(item.preco_unitario || 0).toFixed(2)}</p>
                                    {/* REMOVIDO PREÇO PROMOCIONAL PARA UM VISUAL MAIS LIMPO */}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {carrinho.length > 0 && (
                    <div className="p-4 border-t border-gray-700">
                        <p className="text-xs text-gray-400 text-center">
                            Ao continuar, você concorda em compartilhar seu carrinho, nome e número de telefone com a empresa para que ela possa confirmar seu pedido e o preço total, incluindo impostos, taxas e descontos.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
