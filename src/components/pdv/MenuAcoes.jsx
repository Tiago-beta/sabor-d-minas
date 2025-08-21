
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Percent, ShoppingCart, Search, Copy, Truck, Package, ShoppingBasket, Menu } from "lucide-react";

const AcaoButton = ({ icon: Icon, label, onClick }) => (
    <Button variant="outline" className="h-20 flex-col gap-2 text-gray-800" onClick={onClick}>
        <Icon className="w-6 h-6"/>
        <span>{label}</span>
    </Button>
);

export default function MenuAcoes({ onDesconto }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [descontoOpen, setDescontoOpen] = useState(false);
    const [valorDesconto, setValorDesconto] = useState("");

    const handleAplicarDesconto = () => {
        onDesconto(valorDesconto);
        setValorDesconto("");
        setDescontoOpen(false);
        setMenuOpen(false);
    };

    const botoes = [
        { label: "Desconto", icon: Percent, action: () => setDescontoOpen(true) },
        { label: "Estoque", icon: Package, action: () => {} },
        { label: "Delivery", icon: Truck, action: () => {} },
        { label: "Compras", icon: ShoppingCart, action: () => {} },
        { label: "Atacado", icon: ShoppingBasket, action: () => {} },
        { label: "Registro", icon: Search, action: () => {} },
    ];
    
    return (
        <>
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="bg-gray-200 hover:bg-gray-300 text-gray-900 text-lg py-6">
                        <Menu className="mr-2" />
                        Ações
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Menu de Ações</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-4 py-4">
                        {botoes.map(botao => (
                           <AcaoButton key={botao.label} {...botao} /> 
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={descontoOpen} onOpenChange={setDescontoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Aplicar Desconto</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium">Valor do Desconto (R$)</label>
                        <Input
                            type="number"
                            value={valorDesconto}
                            onChange={(e) => setValorDesconto(e.target.value)}
                            placeholder="0,00"
                            className="mt-1"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDescontoOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAplicarDesconto}>Aplicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
