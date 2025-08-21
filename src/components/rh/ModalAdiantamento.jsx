import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Save } from 'lucide-react';

export default function ModalAdiantamento({ isOpen, onClose, onSave, funcionario }) {
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('adiantamento');
    const [descricao, setDescricao] = useState('');
    const [data, setData] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        // Reset state when modal opens or funcionario changes
        if (isOpen) {
            setValor('');
            setTipo('adiantamento');
            setDescricao('');
            setData(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, funcionario]);

    if (!funcionario) return null;

    const isFinancialType = ['adiantamento', 'bonus', 'desconto'].includes(tipo);

    const handleSave = () => {
        if (isFinancialType && (!valor || parseFloat(valor) <= 0)) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        onSave({
            funcionario_id: funcionario.id,
            funcionario_nome: funcionario.operador_nome,
            valor: isFinancialType ? parseFloat(valor) : 0,
            data: data,
            tipo,
            descricao
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Lançar Evento para {funcionario.operador_nome}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label>Data do Evento</label>
                            <Input 
                                type="date" 
                                value={data} 
                                onChange={(e) => setData(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label>Tipo</label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="adiantamento">Adiantamento (Vale)</SelectItem>
                                    <SelectItem value="bonus">Bônus</SelectItem>
                                    <SelectItem value="desconto">Desconto</SelectItem>
                                    <SelectItem value="folga">Folga</SelectItem>
                                    <SelectItem value="atestado">Atestado</SelectItem>
                                    <SelectItem value="falta">Falta Justificada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {isFinancialType && (
                        <div>
                            <label>Valor (R$)</label>
                            <Input 
                                type="number" 
                                value={valor} 
                                onChange={(e) => setValor(e.target.value)} 
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>
                    )}
                    <div>
                        <label>Descrição (opcional)</label>
                        <Textarea 
                            value={descricao} 
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Ex: Adiantamento, Bônus, Atestado Médico..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Lançamento
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}