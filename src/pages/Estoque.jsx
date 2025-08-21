
import React, { useState, useEffect, useMemo } from 'react';
import { Produto } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Package, Search, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CachedImage from '../components/common/CachedImage';

export default function Estoque() {
    const [produtos, setProdutos] = useState([]);
    const [busca, setBusca] = useState("");
    const [filtroEstoque, setFiltroEstoque] = useState("todos"); // todos, zerados, positivos
    const [editandoEstoque, setEditandoEstoque] = useState(null);
    const [novoEstoque, setNovoEstoque] = useState("");

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const produtosList = await Produto.list("-created_date");
        const produtosSemKits = produtosList.filter(p => p.tipo_produto !== 'kit');
        setProdutos(produtosSemKits);
    };

    const handleEditarEstoque = (produto) => {
        setEditandoEstoque(produto.id);
        setNovoEstoque(produto.estoque?.toString() || "0");
    };

    const handleSalvarEstoque = async (produtoId) => {
        try {
            const estoqueAtualizado = parseFloat(novoEstoque) || 0;
            await Produto.update(produtoId, { estoque: estoqueAtualizado });
            
            // Atualizar estado local
            setProdutos(prev => prev.map(p => 
                p.id === produtoId ? { ...p, estoque: estoqueAtualizado } : p
            ));
            
            setEditandoEstoque(null);
            setNovoEstoque("");
        } catch (error) {
            alert('Erro ao atualizar estoque!');
            console.error(error);
        }
    };

    const handleCancelarEdicao = () => {
        setEditandoEstoque(null);
        setNovoEstoque("");
    };

    // Helper function for accent-insensitive and case-insensitive text normalization
    const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const produtosFiltrados = useMemo(() => {
        let produtosProcessados = [...produtos];

        // 1. Apply search filter (busca)
        if (busca) {
            const buscaNormalizada = normalizeText(busca);
            produtosProcessados = produtosProcessados.filter(produto => {
                const matchCodigo = (produto.codigo && normalizeText(produto.codigo).includes(buscaNormalizada));
                const matchDescricao = (produto.descricao && normalizeText(produto.descricao).includes(buscaNormalizada));
                return matchCodigo || matchDescricao;
            });
        }

        // 2. Apply stock level filter (filtroEstoque)
        produtosProcessados = produtosProcessados.filter(produto => {
            const estoque = produto.estoque || 0;
            if (filtroEstoque === "zerados") {
                return estoque === 0;
            } else if (filtroEstoque === "positivos") {
                return estoque > 0;
            }
            return true; // "todos"
        });

        // 3. Apply sorting
        return produtosProcessados.sort((a, b) => {
            // Ordenar por código (números primeiro, depois texto)
            const codigoA = a.codigo || "";
            const codigoB = b.codigo || "";
            
            const numA = parseFloat(codigoA);
            const numB = parseFloat(codigoB);
            
            const isANum = !isNaN(numA) && isFinite(numA);
            const isBNum = !isNaN(numB) && isFinite(numB);
            
            if (isANum && isBNum) {
                return numA - numB;
            } else if (isANum) {
                return -1;
            } else if (isBNum) {
                return 1;
            } else {
                return codigoA.localeCompare(codigoB);
            }
        });
    }, [produtos, busca, filtroEstoque]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Package className="w-8 h-8" />
                        Controle de Estoque
                    </h1>
                    <Link to={createPageUrl("Gerencia")}>
                        <Button variant="outline" className="text-lg px-6 py-3">
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Voltar à Gerência
                        </Button>
                    </Link>
                </div>

                {/* Filtros */}
                <div className="flex gap-6 mb-8">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-4 h-6 w-6 text-gray-400" />
                        <Input
                            placeholder="Buscar produtos..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="pl-12 text-lg h-14"
                        />
                    </div>
                    <div className="w-64">
                        <Select value={filtroEstoque} onValueChange={setFiltroEstoque}>
                            <SelectTrigger className="h-14 text-lg">
                                <SelectValue placeholder="Filtrar estoque" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Produtos</SelectItem>
                                <SelectItem value="zerados">Estoque Zerado</SelectItem>
                                <SelectItem value="positivos">Estoque Positivo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabela de Produtos */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="h-20">
                                    <TableHead className="w-32 text-xl font-bold">Imagem</TableHead>
                                    <TableHead className="text-xl font-bold">Código</TableHead>
                                    <TableHead className="text-xl font-bold">Descrição</TableHead>
                                    <TableHead className="text-center text-xl font-bold">Estoque</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {produtosFiltrados.map(produto => {
                                    const estaEditando = editandoEstoque === produto.id;
                                    
                                    return (
                                        <TableRow key={produto.id} className="h-32 hover:bg-gray-50">
                                            <TableCell>
                                                <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-lg overflow-hidden">
                                                    {produto.imagem_url ? (
                                                        <CachedImage 
                                                            src={produto.imagem_url} 
                                                            alt={produto.descricao} 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-8 h-8 text-gray-400" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{produto.codigo}</TableCell>
                                            <TableCell>{produto.descricao}</TableCell>
                                            <TableCell className="text-center">
                                                {estaEditando ? (
                                                    <div className="flex items-center gap-3 justify-center">
                                                        <Input
                                                            type="number"
                                                            step="0.001"
                                                            value={novoEstoque}
                                                            onChange={(e) => setNovoEstoque(e.target.value)}
                                                            className="w-28 text-center text-2xl h-16"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleSalvarEstoque(produto.id);
                                                                }
                                                            }}
                                                            onFocus={(e) => e.target.select()}
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSalvarEstoque(produto.id)}
                                                            className="w-16 h-16 p-0 bg-green-600 hover:bg-green-700"
                                                        >
                                                            <Check className="w-8 h-8" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleCancelarEdicao}
                                                            className="w-16 h-16 p-0"
                                                        >
                                                            <X className="w-8 h-8" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleEditarEstoque(produto)}
                                                        className="font-bold text-3xl hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors min-w-20 h-16 flex items-center justify-center bg-blue-100 text-blue-800 border-2 border-blue-300"
                                                    >
                                                        {produto.estoque || 0}
                                                    </button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {produtosFiltrados.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-16 text-gray-500 text-xl">
                                            Nenhum produto encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
