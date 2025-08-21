
import React, { useState, useEffect, useMemo } from "react";
import { Produto } from "@/api/entities";
// Integrações removidas - stubs locais
const UploadFile = async ({ file }) => ({ file_url: URL.createObjectURL(file) });
const ExtractDataFromUploadedFile = async () => ({ rows: [] });
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Package, Upload, ArrowLeft, Box, FileSpreadsheet, ImageUp, Users, Tag, Flame, Globe, Save, X, Copy, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CachedImage from "../components/common/CachedImage";

const initialProdutoState = {
    id: null,
    codigo: "",
    descricao: "",
    preco_varejo: "",
    preco_atacado: "",
    estoque: "",
    categoria: "",
    imagem_url: "",
    tipo_produto: "individual",
    componentes_kit: [],
    aparece_consignacao: true,
    preco_promocional: false,
    preco_original_promocao: "",
    is_assado: false,
    aparece_catalogo: true
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [modalProduto, setModalProduto] = useState(false);
  const [produtoEdit, setProdutoEdit] = useState(initialProdutoState);
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [excelFile, setExcelFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [imageFiles, setImageFiles] = useState(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  
  // Estados para edição inline
  const [editandoCampo, setEditandoCampo] = useState(null); // { id, campo }
  const [valorEditando, setValorEditando] = useState("");
  const [uploadingImageFor, setUploadingImageFor] = useState(null);

  // Estados para conversão para kit
  const [modalConverterKit, setModalConverterKit] = useState(false);
  const [produtoParaConverter, setProdutoParaConverter] = useState(null);
  const [componentesNovoKit, setComponentesNovoKit] = useState([]);
  const [buscaComponente, setBuscaComponente] = useState("");

  // Novos estados para os filtros de checkbox
  const [filtroConsignacao, setFiltroConsignacao] = useState('todos'); // todos, marcados, desmarcados
  const [filtroPromocional, setFiltroPromocional] = useState('todos');
  const [filtroAssado, setFiltroAssado] = useState('todos');
  const [filtroCatalogo, setFiltroCatalogo] = useState('todos');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    const lista = await Produto.list("-created_date");
    setProdutos(lista);
    
    const categoriasUnicas = [...new Set(lista.map(p => p.categoria).filter(Boolean))].sort();
    setCategorias(categoriasUnicas);
  };

  const calcularEstoqueKit = (produto) => {
    if (produto.tipo_produto === 'kit' && produto.componentes_kit && produto.componentes_kit.length > 0) {
      let estoquesPossiveis = [];
      for (const componente of produto.componentes_kit) {
        const produtoComponente = produtos.find(p => p.id === componente.produto_id);
        if (!produtoComponente || !produtoComponente.estoque || componente.quantidade_utilizada <= 0) {
          return 0;
        }
        estoquesPossiveis.push(Math.floor(produtoComponente.estoque / componente.quantidade_utilizada));
      }
      return Math.min(...estoquesPossiveis);
    }
    return produto.estoque || 0;
  };

  // Função para iniciar edição inline
  const iniciarEdicao = (produtoId, campo, valorAtual) => {
    setEditandoCampo({ id: produtoId, campo });
    setValorEditando(valorAtual?.toString() || "");
  };

  // Função para atualizar estoque com controle automático de visibilidade
  const atualizarEstoqueComControleVisibilidade = async (produtoId, novoEstoque) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    // Use a função calcularEstoqueKit para obter o estoque anterior de kits também
    const estoqueAnterior = produto.tipo_produto === 'kit' ? calcularEstoqueKit(produto) : (produto.estoque || 0);
    const apareceCatalogoAtual = produto.aparece_catalogo ?? true; // Default to true if undefined/null

    // Determinar nova visibilidade baseada no estoque
    let novaVisibilidade = apareceCatalogoAtual;
    
    // Se o produto está configurado para aparecer no catálogo, controlar baseado no estoque
    if (apareceCatalogoAtual) {
      // Se estoque zerar, ocultar automaticamente
      if (estoqueAnterior > 0 && novoEstoque === 0) {
        novaVisibilidade = false;
      }
      // Se estoque voltar de zero, mostrar automaticamente
      else if (estoqueAnterior === 0 && novoEstoque > 0) {
        novaVisibilidade = true;
      }
    }

    // Atualizar produto com novo estoque e visibilidade se necessário
    const updates = { estoque: novoEstoque };
    if (novaVisibilidade !== apareceCatalogoAtual) {
      updates.aparece_catalogo = novaVisibilidade;
    }
    
    await Produto.update(produtoId, updates);
  };

  // Função para salvar edição inline
  const salvarEdicaoInline = async () => {
    if (!editandoCampo) return;
    
    try {
      const { id, campo } = editandoCampo;
      let valor = valorEditando;
      
      if (campo === 'codigo') {
        if (!valor.trim()) {
            alert("O código não pode ser vazio.");
            return;
        }
        const produtosExistentes = await Produto.filter({ codigo: valor });
        const isDuplicate = produtosExistentes.some(p => p.id !== id);
        if (isDuplicate) {
            alert(`O código "${valor}" já está em uso por outro produto. Por favor, escolha um código único.`);
            return;
        }
      }

      // Converter para número se for campo de preço ou estoque
      if (['preco_varejo', 'preco_atacado', 'estoque'].includes(campo)) {
        valor = parseFloat(valorEditando) || 0;
      }
      
      // Se for estoque, usar função especial com controle de visibilidade
      if (campo === 'estoque') {
        await atualizarEstoqueComControleVisibilidade(id, valor);
      } else {
        await Produto.update(id, { [campo]: valor });
      }
      
      // Atualizar estado local
      setProdutos(prev => prev.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      ));
      
      setEditandoCampo(null);
      setValorEditando("");
      
      // Recarregar produtos para pegar atualizações de visibilidade, especialmente para estoque
      if (campo === 'estoque') {
        carregarProdutos();
      }
    } catch (error) {
      alert('Erro ao atualizar produto!');
      console.error(error);
    }
  };

  // Função para cancelar edição inline
  const cancelarEdicao = () => {
    setEditandoCampo(null);
    setValorEditando("");
  };

  // Função para upload de imagem inline
  const handleImageUpload = async (produtoId, file) => {
    if (!file) return;
    
    try {
      setUploadingImageFor(produtoId);
      const { file_url } = await UploadFile({ file });
      await Produto.update(produtoId, { imagem_url: file_url });
      
      // Atualizar estado local
      setProdutos(prev => prev.map(p => 
        p.id === produtoId ? { ...p, imagem_url: file_url } : p
      ));
    } catch (error) {
      alert('Erro ao fazer upload da imagem!');
      console.error(error);
    } finally {
      setUploadingImageFor(null);
    }
  };

  // Função para criar novo produto
  const criarNovoProduto = async () => {
    try {
      const novoProduto = {
        codigo: "",
        descricao: "Novo Produto",
        preco_varejo: 0,
        preco_atacado: 0,
        tipo_produto: "individual",
        aparece_consignacao: true,
        preco_promocional: false,
        is_assado: false,
        aparece_catalogo: true,
        estoque: 0
      };
      
      const produtoCriado = await Produto.create(novoProduto);
      carregarProdutos();
      
      // Iniciar edição do código do novo produto
      setTimeout(() => {
        iniciarEdicao(produtoCriado.id, 'codigo', '');
      }, 100);
    } catch (error) {
      alert('Erro ao criar produto!');
      console.error(error);
    }
  };

  const duplicarProduto = async (produtoOriginal) => {
    try {
        const { id, created_date, updated_date, created_by, ...dadosProdutoOriginal } = produtoOriginal;
        
        const novoProduto = {
            ...dadosProdutoOriginal,
            descricao: `${dadosProdutoOriginal.descricao} (Cópia)`,
            codigo: '' // Código em branco para forçar a inserção de um novo
        };

        const produtoCriado = await Produto.create(novoProduto); // Corrected variable name from 'novoNovoProduto' to 'novoProduto'
        
        await carregarProdutos();
        
        // Iniciar edição do código do novo produto duplicado
        setTimeout(() => {
            iniciarEdicao(produtoCriado.id, 'codigo', '');
        }, 200);

    } catch (error) {
        alert('Erro ao duplicar produto!');
        console.error(error);
    }
  };

  // Modal para qualquer produto (individual ou kit)
  const handleOpenProductModal = (produto) => {
    setProdutoEdit({
      ...initialProdutoState,
      ...produto,
      preco_varejo: produto.preco_varejo?.toString() || "",
      preco_atacado: produto.preco_atacado?.toString() || "",
      estoque: produto.estoque?.toString() || "",
      preco_original_promocao: produto.preco_original_promocao?.toString() || "",
      aparece_consignacao: produto.aparece_consignacao ?? true,
      preco_promocional: produto.preco_promocional ?? false,
      is_assado: produto.is_assado ?? false,
      aparece_catalogo: produto.aparece_catalogo ?? true,
      componentes_kit: produto.tipo_produto === 'kit' && produto.componentes_kit ? [...produto.componentes_kit] : []
    });
    setImageFile(null);
    setModalProduto(true);
  };

  const salvarProduto = async () => {
    try {
      if (!produtoEdit.codigo.trim()) {
        alert("O código não pode ser vazio.");
        return;
      }

      const produtosExistentes = await Produto.filter({ codigo: produtoEdit.codigo });
      const isDuplicate = produtosExistentes.some(p => p.id !== produtoEdit.id);
      if (isDuplicate) {
          alert(`O código "${produtoEdit.codigo}" já está em uso por outro produto. Por favor, escolha um código único.`);
          return;
      }

      setIsUploading(true);
      let imageUrl = produtoEdit.imagem_url;

      if (imageFile) {
        const { file_url } = await UploadFile({ file: imageFile });
        imageUrl = file_url;
      }
      
      const dados = {
        codigo: produtoEdit.codigo,
        descricao: produtoEdit.descricao,
        preco_varejo: parseFloat(produtoEdit.preco_varejo) || 0,
        preco_atacado: parseFloat(produtoEdit.preco_atacado) || 0,
        categoria: produtoEdit.categoria,
        imagem_url: imageUrl,
        estoque: produtoEdit.tipo_produto === 'individual' ? (parseFloat(produtoEdit.estoque) || 0) : 0,
        tipo_produto: produtoEdit.tipo_produto,
        componentes_kit: produtoEdit.tipo_produto === 'kit' ? produtoEdit.componentes_kit : [],
        aparece_consignacao: produtoEdit.aparece_consignacao,
        preco_promocional: produtoEdit.preco_promocional,
        preco_original_promocao: parseFloat(produtoEdit.preco_original_promocao) || 0,
        is_assado: produtoEdit.is_assado,
        aparece_catalogo: produtoEdit.aparece_catalogo
      };

      await Produto.update(produtoEdit.id, dados);
      setModalProduto(false);
      carregarProdutos();
    } catch (error) {
      alert("Erro ao salvar produto!");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmarExclusao = async () => {
    try {
      await Produto.delete(produtoParaExcluir.id);
      setProdutoParaExcluir(null);
      carregarProdutos();
    } catch (error) {
      alert("Erro ao excluir produto!");
      console.error(error);
    }
  };

  const importarExcel = async () => {
    if (!excelFile) {
      alert('Selecione um arquivo .CSV primeiro!');
      return;
    }

    try {
      setIsImporting(true);
      
      const { file_url } = await UploadFile({ file: excelFile });
      
      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            "0": { "type": ["string", "number"] },
            "1": { "type": "string" },
            "2": { "type": ["string", "number"] }
          }
        }
      };
      
      const result = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: schema
      });

      if (result.status === "success" && result.output && Array.isArray(result.output)) {
        const produtosParaCriar = result.output.map(p => {
          const codigo = p["0"]?.toString().trim();
          const descricao = p["1"]?.toString().trim();
          const precoVarejoStr = p["2"]?.toString() || "0";
          
          if (!codigo || !descricao) return null;

          const precoVarejo = parseFloat(precoVarejoStr.replace(/[R$\s]/g, '').replace(',', '.')) || 0;
          const precoAtacado = precoVarejo * 0.85;

          return {
            codigo,
            descricao,
            preco_varejo: precoVarejo,
            preco_atacado: parseFloat(precoAtacado.toFixed(2)),
            estoque: 0,
            tipo_produto: "individual",
            aparece_consignacao: true,
            aparece_catalogo: true,
            preco_promocional: false,
            is_assado: false,
          };
        }).filter(Boolean);
        
        if (produtosParaCriar.length === 0) {
          alert("Nenhum produto válido encontrado na planilha.");
          setIsImporting(false);
          return;
        }

        const LOTE_SIZE = 50;
        let criados = 0;
        for (let i = 0; i < produtosParaCriar.length; i += LOTE_SIZE) {
          const lote = produtosParaCriar.slice(i, i + LOTE_SIZE);
          await Produto.bulkCreate(lote);
          criados += lote.length;
        }

        alert(`${criados} produtos importados com sucesso!`);
        setExcelFile(null);
        carregarProdutos();
      } else {
        alert('Erro ao processar arquivo CSV');
      }
    } catch (error) {
      alert('Erro na importação: ' + error.message);
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkImageUpload = async () => {
    if (!imageFiles || imageFiles.length === 0) {
      alert("Por favor, selecione os arquivos de imagem primeiro.");
      return;
    }

    setIsUploadingImages(true);
    setUploadProgress("Iniciando processo...");

    const allProducts = await Produto.list();
    const productMap = new Map(allProducts.map(p => [p.codigo, p.id]));
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      let codigo = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      
      if (codigo.toUpperCase().startsWith('C') && /^C\d+$/i.test(codigo)) {
        codigo = codigo.substring(1);
      }
      
      setUploadProgress(`Processando ${i + 1}/${imageFiles.length}: ${file.name} (procurando código: ${codigo})`);

      const productId = productMap.get(codigo);

      if (productId) {
        try {
          const { file_url } = await UploadFile({ file });
          await Produto.update(productId, { imagem_url: file_url });
          successCount++;
        } catch (error) {
          console.error(`Erro ao enviar imagem para o produto ${codigo}:`, error);
          errorCount++;
        }
      } else {
        console.log(`Produto não encontrado para código: ${codigo} (arquivo: ${file.name})`);
        skippedCount++;
      }
    }

    setUploadProgress("");
    setIsUploadingImages(false);
    alert(`Processo concluído!\n\n✅ ${successCount} imagens associadas com sucesso.\n⚠️ ${skippedCount} imagens ignoradas (código não encontrado).\n❌ ${errorCount} falhas no upload.\n\nDica: O sistema converte automaticamente C1 → 1, C10 → 10, etc.`);
    
    carregarProdutos();
  };

  const handleToggleProperty = async (produtoId, field, value) => {
    setProdutos(prevProdutos =>
      prevProdutos.map(p =>
        p.id === produtoId ? { ...p, [field]: value } : p
      )
    );

    try {
      await Produto.update(produtoId, { [field]: value });
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      alert(`Falha ao atualizar a propriedade. A lista será recarregada.`);
      carregarProdutos();
    }
  };

  const adicionarComponenteKit = () => {
    setProdutoEdit(prev => ({
      ...prev,
      componentes_kit: [...prev.componentes_kit, { produto_id: "", quantidade_utilizada: 1 }]
    }));
  };

  const removerComponenteKit = (index) => {
    setProdutoEdit(prev => ({
      ...prev,
      componentes_kit: prev.componentes_kit.filter((_, i) => i !== index)
    }));
  };

  const atualizarComponenteKit = (index, campo, valor) => {
    setProdutoEdit(prev => ({
      ...prev,
      componentes_kit: prev.componentes_kit.map((comp, i) => 
        i === index ? { ...comp, [campo]: valor } : comp
      )
    }));
  };

  const calcularCustoKit = () => {
    return produtoEdit.componentes_kit.reduce((total, comp) => {
      const produto = produtos.find(p => p.id === comp.produto_id);
      if (produto && comp.quantidade_utilizada) {
        return total + ((produto.custo || 0) * comp.quantidade_utilizada);
      }
      return total;
    }, 0);
  };

  // Função para abrir modal de conversão para kit
  const abrirModalConverterKit = (produto) => {
    setProdutoParaConverter(produto);
    setComponentesNovoKit([]);
    setBuscaComponente(""); // Limpar busca ao abrir
    setModalConverterKit(true);
  };

  // Função para adicionar componente ao kit
  const adicionarComponenteNovoKit = (produto) => {
    const jaExiste = componentesNovoKit.find(comp => comp.produto_id === produto.id);
    if (jaExiste) {
      // Se já existe, aumenta a quantidade
      setComponentesNovoKit(prev => prev.map(comp => 
        comp.produto_id === produto.id 
          ? { ...comp, quantidade_utilizada: (parseFloat(comp.quantidade_utilizada) || 0) + 1 }
          : comp
      ));
    } else {
      // Se não existe, adiciona novo
      setComponentesNovoKit(prev => [...prev, {
        produto_id: produto.id,
        codigo: produto.codigo,
        descricao: produto.descricao,
        imagem_url: produto.imagem_url,
        quantidade_utilizada: 1 // Começa com 1
      }]);
    }
  };

  // Função para remover componente do kit
  const removerComponenteNovoKit = (produtoId) => {
    setComponentesNovoKit(prev => prev.filter(comp => comp.produto_id !== produtoId));
  };

  // Função para atualizar quantidade do componente
  const atualizarQuantidadeComponente = (produtoId, novaQuantidade) => {
    // Permite apenas números e um único ponto/vírgula, limpando caracteres inválidos
    const cleanValue = String(novaQuantidade).replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    const finalValue = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleanValue;

    setComponentesNovoKit(prev => prev.map(comp => 
      comp.produto_id === produtoId 
        ? { ...comp, quantidade_utilizada: finalValue } 
        : comp
    ));
  };

  // Função para converter produto em kit
  const converterProdutoEmKit = async () => {
    if (!produtoParaConverter) {
      return;
    }
    
    const componentesValidos = componentesNovoKit
      .map(comp => ({
        ...comp,
        quantidade_utilizada: parseFloat(comp.quantidade_utilizada) || 0
      }))
      .filter(comp => comp.quantidade_utilizada > 0);

    if (componentesValidos.length === 0) {
      alert('Selecione pelo menos um produto e defina uma quantidade válida para compor o kit!');
      return;
    }

    try {
      // Atualizar o produto para ser um kit
      await Produto.update(produtoParaConverter.id, {
        tipo_produto: 'kit',
        componentes_kit: componentesValidos.map(comp => ({
          produto_id: comp.produto_id,
          quantidade_utilizada: comp.quantidade_utilizada
        })),
        estoque: 0 // Kits não têm estoque próprio
      });

      // Fechar modal e recarregar dados
      setModalConverterKit(false);
      setProdutoParaConverter(null);
      setComponentesNovoKit([]);
      carregarProdutos();
      
      // Remover alert de sucesso - conversão silenciosa
    } catch (error) {
      console.error('Erro ao converter produto em kit:', error);
      alert('Erro ao converter produto em kit!');
    }
  };

  // Função para lidar com Enter na busca de componentes
  const handleBuscaKeyPress = (e) => {
    if (e.key === 'Enter' && componentesNovoKit.length > 0) {
      converterProdutoEmKit();
    }
  };

  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const produtosFiltrados = useMemo(() => {
    let filteredProducts = produtos.filter(produto => {
      const buscaNormalizada = normalizeText(busca);
      const matchBusca = (produto.codigo && normalizeText(produto.codigo).includes(buscaNormalizada)) ||
                         (produto.descricao && normalizeText(produto.descricao).includes(buscaNormalizada));
      
      if (!matchBusca) return false;

      const matchCategoria = filtroCategoria === "todos" || produto.categoria === filtroCategoria;
      if (!matchCategoria) return false;

      const matchTipo = filtroTipo === "todos" || produto.tipo_produto === filtroTipo;
      if (!matchTipo) return false;

      // Default values for boolean properties if they are undefined/null
      const apareceConsignacao = produto.aparece_consignacao ?? true;
      const precoPromocional = produto.preco_promocional ?? false;
      const isAssado = produto.is_assado ?? false;
      const apareceCatalogo = produto.aparece_catalogo ?? true;

      // Novos filtros de checkbox
      const matchConsignacao = filtroConsignacao === 'todos' ||
                              (filtroConsignacao === 'marcados' && apareceConsignacao) ||
                              (filtroConsignacao === 'desmarcados' && !apareceConsignacao);
      if (!matchConsignacao) return false;

      const matchPromocional = filtroPromocional === 'todos' ||
                              (filtroPromocional === 'marcados' && precoPromocional) ||
                              (filtroPromocional === 'desmarcados' && !precoPromocional);
      if (!matchPromocional) return false;

      const matchAssado = filtroAssado === 'todos' ||
                         (filtroAssado === 'marcados' && isAssado) ||
                         (filtroAssado === 'desmarcados' && !isAssado);
      if (!matchAssado) return false;

      const matchCatalogo = filtroCatalogo === 'todos' ||
                           (filtroCatalogo === 'marcados' && apareceCatalogo) ||
                           (filtroCatalogo === 'desmarcados' && !apareceCatalogo);
      if (!matchCatalogo) return false;
      
      return true;
    });

    filteredProducts.sort((a, b) => {
      const aCodigoRaw = a.codigo ?? "";
      const bCodigoRaw = b.codigo ?? "";

      const aNum = parseFloat(aCodigoRaw);
      const bNum = parseFloat(bCodigoRaw);

      const isANum = !isNaN(aNum) && isFinite(aNum);
      const isBNum = !isNaN(bNum) && isFinite(bNum);

      if (isANum && isBNum) {
        return aNum - bNum;
      } else if (isANum) {
        return -1;
      } else if (isBNum) {
        return 1;
      } else {
        return aCodigoRaw.localeCompare(bCodigoRaw);
      }
    });

    return filteredProducts;
  }, [produtos, busca, filtroCategoria, filtroTipo, filtroConsignacao, filtroPromocional, filtroAssado, filtroCatalogo]);

  const produtosIndividuais = produtos.filter(p => p.tipo_produto === 'individual' || !p.tipo_produto);

  // Produtos disponíveis para kit (excluir ofertas, kits existentes e entregas)
  const produtosDisponiveis = produtos.filter(p => 
    p.tipo_produto !== 'kit' && 
    !p.preco_promocional &&
    !(p.descricao || '').toUpperCase().includes('ENTREGA') &&
    p.id !== produtoParaConverter?.id // Não incluir o próprio produto sendo convertido
  );

  const produtosDisponiveisFiltrados = produtosDisponiveis.filter(p => {
    const buscaComponenteNormalizada = normalizeText(buscaComponente);
    return (
      (p.descricao && normalizeText(p.descricao).includes(buscaComponenteNormalizada)) ||
      (p.codigo && normalizeText(p.codigo).includes(buscaComponenteNormalizada))
    );
  });


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Produtos e Kits</h1>
          <div className="flex gap-4">
            <Button
              onClick={criarNovoProduto}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novo Produto
            </Button>
            <Link to={createPageUrl("Gerencia")}>
                <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
            </Link>
            {/* Importar CSV */}
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setExcelFile(e.target.files[0])}
                className="w-48 text-xs"
              />
              <Button
                onClick={importarExcel}
                disabled={isImporting}
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isImporting ? "Importando..." : "CSV"}
              </Button>
            </div>
            {/* Importar Imagens */}
            <div className="flex items-center gap-2 p-2 border rounded-lg">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setImageFiles(e.target.files)}
                className="w-48 text-xs"
              />
              <Button
                onClick={handleBulkImageUpload}
                disabled={isUploadingImages}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <ImageUp className="w-4 h-4 mr-2" />
                {isUploadingImages ? "Enviando..." : "Imagens"}
              </Button>
            </div>
          </div>
        </div>

        {uploadProgress && <p className="text-center text-blue-500 mb-4">{uploadProgress}</p>}

        {/* Filtros */}
        <div className="flex gap-4 mb-6">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="individual">Produtos</SelectItem>
              <SelectItem value="kit">Kits</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Categorias</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Seção das 4 colunas com checkboxes - Inserir após os filtros existentes */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-4 gap-4">
            {/* Coluna Consignação */}
            <div className="text-center">
              <div className="flex flex-col items-center mb-3">
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium">Consignação</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setFiltroConsignacao('todos')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroConsignacao === 'todos' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroConsignacao('marcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroConsignacao === 'marcados' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ✅ Marcados
                </button>
                <button
                  onClick={() => setFiltroConsignacao('desmarcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroConsignacao === 'desmarcados' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ❌ Desmarcados
                </button>
              </div>
            </div>

            {/* Coluna Promocional */}
            <div className="text-center">
              <div className="flex flex-col items-center mb-3">
                <Tag className="w-8 h-8 text-red-600 mb-2" />
                <span className="text-sm font-medium">Promoção</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setFiltroPromocional('todos')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroPromocional === 'todos' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroPromocional('marcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroPromocional === 'marcados' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ✅ Marcados
                </button>
                <button
                  onClick={() => setFiltroPromocional('desmarcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroPromocional === 'desmarcados' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ❌ Desmarcados
                </button>
              </div>
            </div>

            {/* Coluna Assado */}
            <div className="text-center">
              <div className="flex flex-col items-center mb-3">
                <Flame className="w-8 h-8 text-orange-600 mb-2" />
                <span className="text-sm font-medium">Assado</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setFiltroAssado('todos')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroAssado === 'todos' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroAssado('marcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroAssado === 'marcados' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ✅ Marcados
                </button>
                <button
                  onClick={() => setFiltroAssado('desmarcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroAssado === 'desmarcados' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ❌ Desmarcados
                </button>
              </div>
            </div>

            {/* Coluna Catálogo */}
            <div className="text-center">
              <div className="flex flex-col items-center mb-3">
                <Eye className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium">Catálogo</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setFiltroCatalogo('todos')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroCatalogo === 'todos' ? 'bg-gray-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroCatalogo('marcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroCatalogo === 'marcados' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ✅ Marcados
                </button>
                <button
                  onClick={() => setFiltroCatalogo('desmarcados')}
                  className={`w-full px-2 py-1 text-xs rounded ${
                    filtroCatalogo === 'desmarcados' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  ❌ Desmarcados
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Produtos */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Imagem</TableHead>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Tipo</TableHead>
                  <TableHead className="w-32">Categoria</TableHead>
                  <TableHead className="w-24">Preço Var.</TableHead>
                  <TableHead className="w-24">Preço Ata.</TableHead>
                  <TableHead className="w-20">Estoque</TableHead>
                  <TooltipProvider>
                    <TableHead className="text-center w-12 px-1">
                        <Tooltip>
                            <TooltipTrigger><Users className="w-4 h-4 mx-auto" /></TooltipTrigger>
                            <TooltipContent><p>Consignação</p></TooltipContent>
                        </Tooltip>
                    </TableHead>
                    <TableHead className="text-center w-12 px-1">
                         <Tooltip>
                            <TooltipTrigger><Tag className="w-4 h-4 mx-auto" /></TooltipTrigger>
                            <TooltipContent><p>Promoção</p></TooltipContent>
                        </Tooltip>
                    </TableHead>
                     <TableHead className="text-center w-12 px-1">
                         <Tooltip>
                            <TooltipTrigger><Flame className="w-4 h-4 mx-auto" /></TooltipTrigger>
                            <TooltipContent><p>Assado</p></TooltipContent>
                        </Tooltip>
                    </TableHead>
                    <TableHead className="text-center w-12 px-1">
                         <Tooltip>
                            <TooltipTrigger><Globe className="w-4 h-4 mx-auto" /></TooltipTrigger>
                            <TooltipContent><p>Catálogo</p></TooltipContent>
                        </Tooltip>
                    </TableHead>
                  </TooltipProvider>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="relative w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(produto.id, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        {uploadingImageFor === produto.id ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : produto.imagem_url ? (
                          <CachedImage 
                            src={produto.imagem_url} 
                            alt={produto.descricao} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          produto.tipo_produto === 'kit' ? 
                          <Box className="w-6 h-6 text-gray-400" /> :
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'codigo' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-16 h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-bold cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                          onClick={() => iniciarEdicao(produto.id, 'codigo', produto.codigo)}
                        >
                          {produto.codigo || "Clique para editar"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'descricao' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                          onClick={() => iniciarEdicao(produto.id, 'descricao', produto.descricao)}
                        >
                          {produto.descricao || "Clique para editar"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {produto.tipo_produto === 'kit' ? (
                        <Badge className="bg-blue-600 text-white hover:bg-blue-700">Kit</Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                          onClick={() => abrirModalConverterKit(produto)}
                        >
                          Produto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'categoria' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-24 h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                            placeholder="Ex: Queijos"
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="cursor-pointer hover:bg-gray-100 px-1 py-1 rounded text-sm"
                          onClick={() => iniciarEdicao(produto.id, 'categoria', produto.categoria)}
                        >
                          {produto.categoria || "Definir categoria"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'preco_varejo' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-20 h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-bold text-green-600 cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                          onClick={() => iniciarEdicao(produto.id, 'preco_varejo', produto.preco_varejo)}
                        >
                          R$ {(produto.preco_varejo || 0).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editandoCampo?.id === produto.id && editandoCampo?.campo === 'preco_atacado' ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-20 h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-bold text-blue-600 cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                          onClick={() => iniciarEdicao(produto.id, 'preco_atacado', produto.preco_atacado)}
                        >
                          R$ {(produto.preco_atacado || 0).toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {produto.tipo_produto === 'kit' ? (
                        // Para kits, mostrar estoque calculado (não editável)
                        <span className="font-bold text-blue-600">
                          {calcularEstoqueKit(produto)}
                        </span>
                      ) : editandoCampo?.id === produto.id && editandoCampo?.campo === 'estoque' ? (
                        // Para produtos individuais, permitir edição
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.001"
                            value={valorEditando}
                            onChange={(e) => setValorEditando(e.target.value)}
                            className="w-20 h-8"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoInline()}
                          />
                          <Button size="sm" variant="ghost" onClick={salvarEdicaoInline} className="p-1">
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelarEdicao} className="p-1">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        // Estoque clicável para produtos individuais
                        <span
                          className={`font-bold cursor-pointer hover:bg-gray-100 px-1 py-1 rounded ${produto.tipo_produto === 'kit' ? 'text-blue-600' : 'text-gray-800'}`}
                          onClick={() => produto.tipo_produto !== 'kit' && iniciarEdicao(produto.id, 'estoque', produto.estoque)}
                        >
                          {produto.tipo_produto === 'kit' ? calcularEstoqueKit(produto) : (produto.estoque || 0)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                        <Checkbox
                            checked={produto.aparece_consignacao ?? true}
                            onCheckedChange={(checked) => handleToggleProperty(produto.id, 'aparece_consignacao', checked)}
                        />
                    </TableCell>
                     <TableCell className="text-center">
                        <Checkbox
                            checked={produto.preco_promocional ?? false}
                            onCheckedChange={(checked) => handleToggleProperty(produto.id, 'preco_promocional', checked)}
                        />
                    </TableCell>
                     <TableCell className="text-center">
                        <Checkbox
                            checked={produto.is_assado ?? false}
                            onCheckedChange={(checked) => handleToggleProperty(produto.id, 'is_assado', checked)}
                        />
                    </TableCell>
                     <TableCell className="text-center">
                        <Checkbox
                            checked={produto.aparece_catalogo ?? true}
                            onCheckedChange={(checked) => handleToggleProperty(produto.id, 'aparece_catalogo', checked)}
                        />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenProductModal(produto)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => duplicarProduto(produto)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicar Produto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setProdutoParaExcluir(produto)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Edição de Produto/Kit */}
        <Dialog open={modalProduto} onOpenChange={setModalProduto}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Editar {produtoEdit.tipo_produto === 'kit' ? 'Kit' : 'Produto'} - {produtoEdit.descricao || "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
              {/* General Product Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                  <Input id="descricao" value={produtoEdit.descricao} onChange={(e) => setProdutoEdit(prev => ({...prev, descricao: e.target.value}))} />
                </div>
                <div>
                  <label htmlFor="codigo" className="block text-sm font-medium text-gray-700">Código</label>
                  <Input id="codigo" value={produtoEdit.codigo} onChange={(e) => setProdutoEdit(prev => ({...prev, codigo: e.target.value}))} />
                </div>

                <div>
                  <label htmlFor="preco_varejo" className="block text-sm font-medium text-gray-700">Preço Varejo</label>
                  <Input id="preco_varejo" type="number" step="0.01" value={produtoEdit.preco_varejo} onChange={(e) => setProdutoEdit(prev => ({...prev, preco_varejo: e.target.value}))} />
                </div>
                <div>
                  <label htmlFor="preco_atacado" className="block text-sm font-medium text-gray-700">Preço Atacado</label>
                  <Input id="preco_atacado" type="number" step="0.01" value={produtoEdit.preco_atacado} onChange={(e) => setProdutoEdit(prev => ({...prev, preco_atacado: e.target.value}))} />
                </div>

                <div>
                  <label htmlFor="tipo_produto" className="block text-sm font-medium text-gray-700">Tipo de Produto</label>
                  <Select value={produtoEdit.tipo_produto} onValueChange={(value) => setProdutoEdit(prev => ({...prev, tipo_produto: value}))}>
                    <SelectTrigger id="tipo_produto">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Produto Individual</SelectItem>
                      <SelectItem value="kit">Kit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoria</label>
                  <Input id="categoria" value={produtoEdit.categoria} onChange={(e) => setProdutoEdit(prev => ({...prev, categoria: e.target.value}))} />
                </div>

                <div>
                  <label htmlFor="imagem_upload" className="block text-sm font-medium text-gray-700">Imagem (Upload)</label>
                  <div className="flex items-center gap-2">
                    <Input id="imagem_upload" type="file" onChange={(e) => setImageFile(e.target.files[0])} />
                    {produtoEdit.imagem_url && (
                      <a href={produtoEdit.imagem_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Ver Imagem</a>
                    )}
                  </div>
                </div>
              </div>

              {/* Conditional Fields for Individual Products */}
              {produtoEdit.tipo_produto === 'individual' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label htmlFor="estoque" className="block text-sm font-medium text-gray-700">Estoque</label>
                    <Input id="estoque" type="number" value={produtoEdit.estoque} onChange={(e) => setProdutoEdit(prev => ({...prev, estoque: e.target.value}))} />
                  </div>
                  {produtoEdit.preco_promocional && (
                    <div>
                      <label htmlFor="preco_original_promocao" className="block text-sm font-medium text-gray-700">Preço Original (Promoção)</label>
                      <Input id="preco_original_promocao" type="number" step="0.01" value={produtoEdit.preco_original_promocao} onChange={(e) => setProdutoEdit(prev => ({...prev, preco_original_promocao: e.target.value}))} />
                    </div>
                  )}
                </div>
              )}

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="aparece_consignacao" checked={produtoEdit.aparece_consignacao} onCheckedChange={(checked) => setProdutoEdit(prev => ({...prev, aparece_consignacao: checked}))} />
                  <label htmlFor="aparece_consignacao" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Aparece em Consignação</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="preco_promocional" checked={produtoEdit.preco_promocional} onCheckedChange={(checked) => setProdutoEdit(prev => ({...prev, preco_promocional: checked}))} />
                  <label htmlFor="preco_promocional" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Preço Promocional</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="is_assado" checked={produtoEdit.is_assado} onCheckedChange={(checked) => setProdutoEdit(prev => ({...prev, is_assado: checked}))} />
                  <label htmlFor="is_assado" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">É Assado</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="aparece_catalogo" checked={produtoEdit.aparece_catalogo} onCheckedChange={(checked) => setProdutoEdit(prev => ({...prev, aparece_catalogo: checked}))} />
                  <label htmlFor="aparece_catalogo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Aparece no Catálogo</label>
                </div>
              </div>

              {/* Kit Components Section (Conditional) */}
              {produtoEdit.tipo_produto === 'kit' && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Componentes do Kit</h3>
                    <Button type="button" onClick={adicionarComponenteKit} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Produto
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {produtoEdit.componentes_kit.map((componente, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-grow">
                          <Select 
                            value={componente.produto_id} 
                            onValueChange={(value) => atualizarComponenteKit(index, 'produto_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtosIndividuais.map(produto => (
                                <SelectItem key={produto.id} value={produto.id}>
                                  {produto.descricao} - R$ {produto.custo?.toFixed(2) || '0.00'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            step="1"
                            placeholder="Qtd"
                            value={componente.quantidade_utilizada}
                            onChange={(e) => atualizarComponenteKit(index, 'quantidade_utilizada', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removerComponenteKit(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Custo Total Calculado:</span>
                      <span className="text-lg font-bold text-blue-700">R$ {calcularCustoKit().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setModalProduto(false)}>Cancelar</Button>
                <Button onClick={salvarProduto} disabled={isUploading}>
                  {isUploading ? "Salvando..." : `Salvar ${produtoEdit.tipo_produto === 'kit' ? 'Kit' : 'Produto'}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={!!produtoParaExcluir} onOpenChange={setProdutoParaExcluir}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{produtoParaExcluir?.descricao}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmarExclusao}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Conversão para Kit */}
        <Dialog open={modalConverterKit} onOpenChange={setModalConverterKit}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Converter "{produtoParaConverter?.descricao}" em Kit
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex gap-6 flex-1 min-h-0">
              {/* Lista de Produtos Disponíveis */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-medium mb-2">Produtos Disponíveis</h3>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar componente..."
                      value={buscaComponente}
                      onChange={(e) => setBuscaComponente(e.target.value)}
                      onKeyPress={handleBuscaKeyPress}
                      className="pl-10"
                    />
                </div>
                <div className="flex-1 overflow-y-auto border rounded-lg p-4 space-y-2">
                  {produtosDisponiveisFiltrados.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    produtosDisponiveisFiltrados.map(produto => (
                      <div 
                        key={produto.id}
                        onClick={() => adicionarComponenteNovoKit(produto)}
                        className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg cursor-pointer border"
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                          {produto.imagem_url ? (
                            <CachedImage 
                              src={produto.imagem_url} 
                              alt={produto.descricao} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{produto.codigo}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{produto.descricao}</p>
                        </div>
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Componentes do Kit */}
              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-medium mb-4">Componentes do Kit</h3>
                <div className="flex-1 overflow-y-auto border rounded-lg p-4">
                  {componentesNovoKit.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Clique nos produtos da esquerda para adicionar ao kit
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {componentesNovoKit.map(componente => (
                        <div 
                          key={componente.produto_id} 
                          className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="w-10 h-10 bg-white rounded flex items-center justify-center overflow-hidden">
                            {componente.imagem_url ? (
                              <CachedImage 
                                src={componente.imagem_url} 
                                alt={componente.descricao} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{componente.codigo}</p>
                            <p className="text-xs text-gray-600">{componente.descricao}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => atualizarQuantidadeComponente(componente.produto_id, (parseFloat(componente.quantidade_utilizada) || 0) - 1)}
                            >
                              -
                            </Button>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={componente.quantidade_utilizada}
                              onChange={(e) => atualizarQuantidadeComponente(componente.produto_id, e.target.value)}
                              className="w-20 h-8 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => atualizarQuantidadeComponente(componente.produto_id, (parseFloat(componente.quantidade_utilizada) || 0) + 1)}
                            >
                              +
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removerComponenteNovoKit(componente.produto_id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setModalConverterKit(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={converterProdutoEmKit}
                    disabled={componentesNovoKit.length === 0}
                    className="flex-1"
                  >
                    Converter em Kit
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
