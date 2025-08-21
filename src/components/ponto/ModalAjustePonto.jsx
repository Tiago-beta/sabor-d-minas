import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Save } from 'lucide-react';

export default function ModalAjustePonto({ isOpen, onClose, onSave, pontoInicial, funcionarios }) {
    const [ponto, setPonto] = useState({
        funcionario_id: '',
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0].slice(0, 5),
        tipo: 'entrada'
    });

    useEffect(() => {
        if (pontoInicial) {
            setPonto({
                id: pontoInicial.id,
                funcionario_id: pontoInicial.funcionario_id,
                data: pontoInicial.data,
                hora: pontoInicial.hora.slice(0, 5),
                tipo: pontoInicial.tipo
            });
        } else {
            // Reset for new entry
            setPonto({
                funcionario_id: '',
                data: new Date().toISOString().split('T')[0],
                hora: new Date().toTimeString().split(' ')[0].slice(0, 5),
                tipo: 'entrada'
            });
        }
    }, [pontoInicial, isOpen]);

    const handleSave = () => {
        if (!ponto.funcionario_id || !ponto.data || !ponto.hora || !ponto.tipo) {
            alert('Todos os campos são obrigatórios.');
            return;
        }
        
        const funcionarioSelecionado = funcionarios.find(f => f.id === ponto.funcionario_id);
        
        const dadosParaSalvar = {
            ...ponto,
            hora: `${ponto.hora}:00`, // Add seconds for consistency
            funcionario_nome: funcionarioSelecionado?.operador_nome || funcionarioSelecionado?.full_name || ''
        };

        onSave(dadosParaSalvar);
    };

    const handleChange = (field, value) => {
        setPonto(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{ponto.id ? 'Editar Registro de Ponto' : 'Adicionar Registro de Ponto'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label>Funcionário</label>
                        <Select value={ponto.funcionario_id} onValueChange={(value) => handleChange('funcionario_id', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um funcionário" />
                            </SelectTrigger>
                            <SelectContent>
                                {funcionarios.map(f => (
                                    <SelectItem key={f.id} value={f.id}>{f.operador_nome || f.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Data</label>
                            <Input type="date" value={ponto.data} onChange={(e) => handleChange('data', e.target.value)} />
                        </div>
                        <div>
                            <label>Hora</label>
                            <Input type="time" value={ponto.hora} onChange={(e) => handleChange('hora', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label>Tipo de Registro</label>
                        <Select value={ponto.tipo} onValueChange={(value) => handleChange('tipo', value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="entrada">Entrada</SelectItem>
                                <SelectItem value="saida">Saída</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}