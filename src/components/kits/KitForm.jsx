import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

export default function KitForm({ kit, kitItems, produtos, onSubmit, onCancel }) {
    const [kitData, setKitData] = useState({ id: null, nome: '', preco_venda: '' });
    const [items, setItems] = useState([]);
    const [produtoBusca, setProdutoBusca] = useState('');

    useEffect(() => {
        if (kit) {
            setKitData({ id: kit.id, nome: kit.nome, preco_venda: kit.preco_venda.toString() });
            const initialItems = kitItems.map(item => {
                const produto = produtos.find(p => p.id === item.produto_id);
                return {
                    produto_id: item.produto_id,
                    produto_nome: produto?.descricao || 'Produto não encontrado',
                    produto_custo: produto?.custo || 0,
                    quantidade_utilizada: item.quantidade_utilizada,
                };
            });
            setItems(initialItems);
        } else {
            setKitData({ id: null, nome: '', preco_venda: '' });
            setItems([]);
        }
    }, [kit, kitItems, produtos]);

    const handleAddProduto = (produto) => {
        if (produto && !items.find(item => item.produto_id === produto.id)) {
            setItems(prev => [...prev, {
                produto_id: produto.id,
                produto_nome: produto.descricao,
                produto_custo: produto.custo,
                quantidade_utilizada: 1
            }]);
            setProdutoBusca('');
        }
    };

    const handleItemQtyChange = (produto_id, quantidade) => {
        setItems(prev => prev.map(item =>
            item.produto_id === produto_id
                ? { ...item, quantidade_utilizada: parseFloat(quantidade) || 0 }
                : item
        ));
    };

    const handleRemoveItem = (produto_id) => {
        setItems(prev => prev.filter(item => item.produto_id !== produto_id));
    };

    const custoTotal = useMemo(() => {
        return items.reduce((total, item) => total + (item.produto_custo * item.quantidade_utilizada), 0);
    }, [items]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalKitData = { ...kitData, preco_venda: parseFloat(kitData.preco_venda) || 0 };
        const finalItems = items.map(i => ({ produto_id: i.produto_id, quantidade_utilizada: i.quantidade_utilizada }));
        onSubmit(finalKitData, finalItems);
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{kit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Nome do Kit</label>
                            <Input
                                value={kitData.nome}
                                onChange={e => setKitData(prev => ({ ...prev, nome: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label>Preço de Venda (R$)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={kitData.preco_venda}
                                onChange={e => setKitData(prev => ({ ...prev, preco_venda: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-medium mb-2">Itens do Kit</h3>
                        <div>
                            <label>Adicionar Produto</label>
                            <Input
                                value={produtoBusca}
                                onChange={e => setProdutoBusca(e.target.value)}
                                list="produtos-list"
                                placeholder="Digite para buscar um produto..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const prod = produtos.find(p => p.descricao.toLowerCase() === produtoBusca.toLowerCase());
                                        if (prod) handleAddProduto(prod);
                                    }
                                }}
                            />
                            <datalist id="produtos-list">
                                {produtos.map(p => <option key={p.id} value={p.descricao} />)}
                            </datalist>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                            {items.map(item => (
                                <div key={item.produto_id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                    <p className="flex-grow">{item.produto_nome}</p>
                                    <div className="w-28">
                                        <Input
                                            type="number"
                                            step="0.001"
                                            value={item.quantidade_utilizada}
                                            onChange={e => handleItemQtyChange(item.produto_id, e.target.value)}
                                            className="text-right"
                                        />
                                    </div>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveItem(item.produto_id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t pt-4 text-right">
                        <p className="text-sm">Custo Total do Kit</p>
                        <p className="text-xl font-bold">R$ {custoTotal.toFixed(2)}</p>
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" form="kit-form" onClick={handleSubmit}>Salvar Kit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}