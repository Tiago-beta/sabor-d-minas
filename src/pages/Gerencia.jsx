
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart2,
  Package,
  Settings,
  Users,
  ClipboardList,
  Truck,
  ArrowLeft,
  BookOpen,
  DollarSign,
  UserCheck,
  Building2,
  FileText,
  KeyRound,
  MessageSquare,
  ShoppingCart,
  ShoppingBag,
  Calculator,
  Clock,
  UserPlus,
  Briefcase,
  Database 
} from "lucide-react";
import { User } from "@/api/entities";

export default function Gerencia() {
    const [isGerente, setIsGerente] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);

    useEffect(() => {
        const verificarAcesso = async () => {
            try {
                const usuario = await User.me();
                if (usuario && usuario.is_gerente) {
                    setIsGerente(true);
                    setUserPermissions([]); // Gerente tem acesso total
                } else if (usuario && usuario.permissoes && usuario.permissoes.length > 0) {
                    // Usuário com permissões específicas
                    setIsGerente(false);
                    setUserPermissions(usuario.permissoes);
                }
            } catch (error) {
                console.error("Erro ao verificar o tipo de usuário:", error);
            }
        };
        verificarAcesso();
    }, []);

    // Se não é gerente e não tem permissões, negar acesso
    if (!isGerente && userPermissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
                <p className="text-gray-600 dark:text-gray-400">Você não tem permissão para acessar esta página.</p>
                <Link to={createPageUrl("PDV")}>
                    <Button variant="outline" className="mt-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao PDV
                    </Button>
                </Link>
            </div>
        );
    }
  
    const allMenuItems = [
      { nome: "Produtos", icone: <Package className="w-8 h-8" />, link: createPageUrl('Produtos'), permission: 'Produtos' },
      { nome: "Estoque", icone: <BarChart2 className="w-8 h-8" />, link: createPageUrl('Estoque'), permission: 'Estoque' },
      { nome: "Relatórios", icone: <BarChart2 className="w-8 h-8" />, link: createPageUrl('Relatorios'), permission: 'Relatorios' },
      { nome: "Compras", icone: <ShoppingBag className="w-8 h-8" />, link: createPageUrl('Compras'), permission: 'Compras' },
      { nome: "Consignação", icone: <Users className="w-8 h-8" />, link: createPageUrl('Consignacao'), permission: 'Consignacao' },
      { nome: "Recebimentos", icone: <ClipboardList className="w-8 h-8" />, link: createPageUrl('Recebimentos'), permission: 'Recebimentos' },
      { nome: "A Prazo", icone: <Clock className="w-8 h-8" />, link: createPageUrl('APrazo'), permission: 'APrazo' },
      { nome: "Motoboys", icone: <Truck className="w-8 h-8" />, link: createPageUrl('Motoboy'), permission: 'Motoboy' },
      { nome: "Clientes", icone: <UserCheck className="w-8 h-8" />, link: createPageUrl('Clientes'), permission: 'Clientes' },
      { nome: "RH", icone: <Briefcase className="w-8 h-8" />, link: createPageUrl('RH'), permission: 'RH' },
      { nome: "Empresas", icone: <Building2 className="w-8 h-8" />, link: createPageUrl('Empresas'), permission: 'Empresas' },
      { nome: "Fechamento", icone: <DollarSign className="w-8 h-8" />, link: createPageUrl('FechamentoCaixa'), permission: 'FechamentoCaixa' },
      { nome: "Saldo", icone: <Calculator className="w-8 h-8" />, link: createPageUrl('Saldo'), permission: 'Saldo' },
      { nome: "Senhas", icone: <KeyRound className="w-8 h-8" />, link: createPageUrl('Senhas'), permission: 'Senhas' },
      { nome: "Cad. Vendedores", icone: <UserPlus className="w-8 h-8" />, link: createPageUrl('CadastroVendedores'), permission: 'CadastroVendedores' },
      { nome: "Limpeza", icone: <Database className="w-8 h-8" />, link: createPageUrl('Limpeza'), permission: 'Limpeza' },
    ];

    // Se é gerente, mostra todos. Se não, filtra por permissões
    const menuItems = isGerente 
      ? allMenuItems 
      : allMenuItems.filter(item => userPermissions.includes(item.permission));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
            {isGerente ? 'Painel de Gerenciamento' : 'Painel de Acesso'}
          </h1>
          {!isGerente && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Acesso limitado às suas permissões
            </p>
          )}
        </div>
        <Link to={createPageUrl("PDV")}>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar ao PDV
            </button>
        </Link>
      </header>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {menuItems.map((item, index) => (
          <Link to={item.link} key={index} className="no-underline">
            <Card className="bg-white dark:bg-gray-800 hover:shadow-lg hover:-translate-y-1 transition-transform duration-300">
              <CardHeader className="flex flex-col items-center justify-center text-center p-6">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-300 mb-4">
                  {item.icone}
                </div>
                <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-300">{item.nome}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
