
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ModalEditarItem({ item, isOpen, onClose, onSave }) {
  const [preco, setPreco] = useState(0);
  const [quantidade, setQuantidade] = useState(0);

  useEffect(() => {
    if (item) {
      setPreco(item.preco_unitario);
      setQuantidade(item.quantidade);
    }
  }, [item]);

  if (!isOpen || !item) {
    return null;
  }

  const handleSave = () => {
    onSave(preco, quantidade);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Item: {item.descricao}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4" onKeyDown={handleKeyDown}>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantidade" className="text-right">
              Quantidade
            </Label>
            <Input
              id="quantidade"
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="col-span-3"
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="preco" className="text-right">
              Preço Unit.
            </Label>
            <Input
              id="preco"
              type="number"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(Number(e.target.value))}
              className="col-span-3"
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
