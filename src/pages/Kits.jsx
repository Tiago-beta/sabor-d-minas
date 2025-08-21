import React, { useState, useEffect, useMemo } from 'react';
import { Kit, KitItem, Produto } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Box, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import KitForm from '../components/kits/KitForm';

export default function Kits() {
    const [kits, setKits] = useState([]);
    const [kitItems, setKitItems] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [kitEdit, setKitEdit] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const [kitsList, kitItemsList, produtosList] = await Promise.all([
                Kit.list("-created_date"),
                KitItem.list(),
                Produto.list()
            ]);
            setKits(kitsList);
            setKitItems(kitItemsList);
            setProdutos(produtosList);
        } catch (error) {
            console.error("Erro ao carregar dados dos kits:", error);
            alert("Não foi possível carregar os dados. Tente novamente.");
        }
    };

    const calcularEstoqueKit = (kit) => {
        const itensDoKit = kitItems.filter(item => item.kit_id === kit.id);
        if (itensDoKit.length === 0) return 0;

        let estoquesPossiveis = [];
        for (const item of itensDoKit) {
            const produto = produtos.find(p => p.id === item.produto_id);
            if (!produto || !produto.estoque || item.quantidade_utilizada <= 0) {
                return 0; // Se um produto não existe, não tem estoque ou a quantidade é inválida, não pode montar kit
            }
            estoquesPossiveis.push(produto.estoque / item.quantidade_utilizada);
        }

        return Math.floor(Math.min(...estoquesPossiveis));
    };
    
    const handleSalvarKit = async (kitData, items) => {
        try {
            let kitSalvo;
            if (kitData.id) { // Editando
                await Kit.update(kitData.id, { nome: kitData.nome, preco_venda: kitData.preco_venda });
                kitSalvo = kitData;
                
                // Limpar itens antigos
                const itensAntigos = kitItems.filter(item => item.kit_id === kitData.id);
                await Promise.all(itensAntigos.map(item => KitItem.delete(item.id)));

            } else { // Criando
                kitSalvo = await Kit.create({ nome: kitData.nome, preco_venda: kitData.preco_venda });
            }

            // Criar novos itens
            const novosItens = items.map(item => ({
                kit_id: kitSalvo.id,
                produto_id: item.produto_id,
                quantidade_utilizada: item.quantidade_utilizada
            }));
            if (novosItens.length > 0) {
                await KitItem.bulkCreate(novosItens);
            }

            setModalAberto(false);
            setKitEdit(null);
            carregarDados();

        } catch (error) {
            console.error("Erro ao salvar kit:", error);
            alert("Não foi possível salvar o kit. Verifique os dados e tente novamente.");
        }
    };
    
    const handleExcluirKit = async (kit) => {
        if (confirm(`Tem certeza que deseja excluir o kit "${kit.nome}"?`)) {
            try {
                // Excluir itens associados primeiro
                const itensParaExcluir = kitItems.filter(item => item.kit_id === kit.id);
                await Promise.all(itensParaExcluir.map(item => KitItem.delete(item.id)));
                // Excluir o kit
                await Kit.delete(kit.id);
                carregarDados();
            } catch (error) {
                console.error("Erro ao excluir kit:", error);
                alert("Não foi possível excluir o kit.");
            }
        }
    };

    const handleOpenModal = (kit = null) => {
        setKitEdit(kit);
        setModalAberto(true);
    };

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Box className="w-6 h-6" /> Gerenciamento de Kits
                    </h1>
                    <div className="flex gap-2">
                        <Link to={createPageUrl("Gerencia")}>
                            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
                        </Link>
                        <Button onClick={() => handleOpenModal()} className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="w-4 h-4 mr-2" /> Novo Kit
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kits.map(kit => (
                        <Card key={kit.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex-row justify-between items-start">
                                <CardTitle>{kit.nome}</CardTitle>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenModal(kit)}><Edit className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleExcluirKit(kit)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-sm text-gray-500">Preço de Venda</p>
                                        <p className="text-lg font-bold text-blue-700">R$ {kit.preco_venda.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 text-right">Disponível</p>
                                        <p className="text-2xl font-bold text-green-600">{calcularEstoqueKit(kit)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {modalAberto && (
                <KitForm
                    kit={kitEdit}
                    kitItems={kitItems.filter(item => item.kit_id === kitEdit?.id)}
                    produtos={produtos}
                    onSubmit={handleSalvarKit}
                    onCancel={() => {
                        setModalAberto(false);
                        setKitEdit(null);
                    }}
                />
            )}
        </div>
    );
}