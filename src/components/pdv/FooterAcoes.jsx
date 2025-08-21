
import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Eraser, CheckCircle, Search, Repeat, Users, Truck, Printer } from 'lucide-react';

const ActionButton = ({ icon: Icon, label, onClick, className = "" }) => (
    <Button variant="ghost" className={`flex-col h-12 text-gray-600 hover:bg-gray-200 hover:text-gray-900 ${className}`} onClick={onClick}>
        <Icon className="w-4 h-4"/>
        <span className="text-xs mt-1">{label}</span>
    </Button>
);

export default function FooterAcoes({ onLimpar, onExcluir, onFinalizar, onConsultarVendas, onTrocarPdv, onConsignacao, onRecebimentos, tipoPdv, onImprimirCupom }) {
    return (
        <footer className="bg-gray-100 border-t-2 border-gray-300 p-2 flex-shrink-0 shadow-inner">
            <div className="flex justify-between items-center">
                <div className="flex gap-1">
                    <ActionButton label="Limpar" icon={Eraser} onClick={onLimpar} />
                    <ActionButton label="Excluir" icon={Trash2} onClick={onExcluir} />
                    <ActionButton label="Vendas" icon={Search} onClick={onConsultarVendas} />
                    <ActionButton label="Consignação" icon={Users} onClick={onConsignacao} />
                    <ActionButton label="Recebimentos" icon={Truck} onClick={onRecebimentos} />
                    <ActionButton label={tipoPdv === 'varejo' ? "Atacado" : "Varejo"} icon={Repeat} onClick={onTrocarPdv} />
                    <ActionButton label="Cupom" icon={Printer} onClick={onImprimirCupom} />
                </div>
                <Button className="h-12 px-8 bg-green-600 hover:bg-green-700 text-lg font-bold" onClick={onFinalizar}>
                    <CheckCircle className="mr-2 w-5 h-5"/>
                    FINALIZAR
                </Button>
            </div>
        </footer>
    );
}
