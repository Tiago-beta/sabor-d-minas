
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // CardHeader and CardTitle were imported but not used in current Card structure
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, KeyRound, RotateCcw, Trash2 } from "lucide-react"; // Added RotateCcw and Trash2
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { // Added AlertDialog components
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Lista de menus disponíveis para permissão (ATUALIZADA)
const menuItems = [
    { id: 'Produtos', label: 'Produtos' },
    { id: 'Estoque', label: 'Estoque' },
    { id: 'Relatorios', label: 'Relatórios' },
    { id: 'Compras', label: 'Compras' },
    { id: 'Consignacao', label: 'Consignação' },
    { id: 'Recebimentos', label: 'Recebimentos' },
    { id: 'APrazo', label: 'A Prazo' },
    { id: 'Motoboy', label: 'Motoboys' },
    { id: 'Clientes', label: 'Clientes' },
    { id: 'RH', label: 'RH' },
    { id: 'Empresas', label: 'Empresas' },
    { id: 'FechamentoCaixa', label: 'Fechamento' },
    { id: 'Saldo', label: 'Saldo' },
    { id: 'Senhas', label: 'Senhas' },
    { id: 'CadastroVendedores', label: 'Cad. Vendedores' },
    { id: 'Limpeza', label: 'Limpeza' },
];

export default function Senhas() {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioParaResetar, setUsuarioParaResetar] = useState(null); // New state to hold user for password reset
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState(null); // New state to hold user for deletion

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const lista = await User.list();
      setUsuarios(lista);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const handlePermissaoChange = async (userId, permissao, checked) => {
    const user = usuarios.find(u => u.id === userId);
    if (!user) return;

    // Não permite alterar permissões de um gerente
    if (user.is_gerente) return;

    let novasPermissoes = [...(user.permissoes || [])];

    if (checked) {
      if (!novasPermissoes.includes(permissao)) {
        novasPermissoes.push(permissao);
      }
    } else {
      novasPermissoes = novasPermissoes.filter(p => p !== permissao);
    }

    // Atualiza o estado local para feedback imediato da UI
    setUsuarios(prev => prev.map(u => 
        u.id === userId ? { ...u, permissoes: novasPermissoes } : u
    ));
    
    // Atualiza o backend
    try {
      await User.update(userId, { permissoes: novasPermissoes });
    } catch (error) {
      console.error("Erro ao atualizar permissões:", error);
      alert("Falha ao salvar permissão. A página será recarregada.");
      carregarUsuarios(); // Reverte o estado local em caso de erro
    }
  };

  // New function to open the AlertDialog for password reset
  const handleResetarSenha = (user) => {
    setUsuarioParaResetar(user);
  };

  // New function to confirm and execute the password reset
  const confirmarResetSenha = async () => {
    if (!usuarioParaResetar) return;

    try {
        // Update the user's second password to null and set first_login to true
        await User.update(usuarioParaResetar.id, {
            segunda_senha: null,
            primeiro_login: true,
        });
        alert(`A senha de ${usuarioParaResetar.operador_nome || usuarioParaResetar.full_name} foi resetada. O operador precisará criar uma nova senha no próximo login.`);
        setUsuarioParaResetar(null); // Close the dialog
        carregarUsuarios(); // Reload users to reflect changes
    } catch (error) {
        console.error("Erro ao resetar senha:", error);
        alert("Falha ao resetar a senha.");
    }
  };

  const handleExcluirUsuario = (user) => {
    setUsuarioParaExcluir(user);
  };

  const confirmarExclusao = async () => {
    if (!usuarioParaExcluir) return;

    try {
      await User.delete(usuarioParaExcluir.id);
      alert(`Operador ${usuarioParaExcluir.operador_nome || usuarioParaExcluir.full_name} excluído com sucesso.`);
      setUsuarioParaExcluir(null);
      carregarUsuarios(); // Reload users to reflect changes
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Falha ao excluir o operador.");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="w-6 h-6" />
            Permissões de Acesso por Operador
          </h1>
          <Link to={createPageUrl("Gerencia")}>
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-gray-50 z-10">Operador</TableHead>
                    <TableHead>Segunda Senha</TableHead> {/* New TableHead for second password status */}
                    <TableHead>Resetar Senha</TableHead> {/* New TableHead for reset button */}
                    {menuItems.map(item => (
                      <TableHead key={item.id} className="text-center">{item.label}</TableHead>
                    ))}
                    <TableHead>Excluir</TableHead> {/* New TableHead for delete button */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10">
                        <div className="flex flex-col">
                            <span>{user.operador_nome || user.full_name}</span>
                            {user.is_gerente && (
                                <span className="text-xs text-red-600 font-bold">GERENTE (Acesso Total)</span>
                            )}
                        </div>
                      </TableCell>
                      {/* TableCell for Segunda Senha status */}
                      <TableCell>
                        {user.is_gerente ? (
                            <span className="text-xs text-gray-500">N/A</span>
                        ) : (
                            <span>{user.segunda_senha ? 'Definida' : 'Não definida'}</span>
                        )}
                      </TableCell>
                       {/* TableCell for Resetar Senha button */}
                       <TableCell>
                        {!user.is_gerente && (
                            <Button variant="ghost" size="sm" onClick={() => handleResetarSenha(user)}>
                                <RotateCcw className="w-4 h-4 text-orange-600" />
                            </Button>
                        )}
                      </TableCell>
                      {menuItems.map(item => (
                        <TableCell key={item.id} className="text-center">
                          <Checkbox
                            checked={user.is_gerente || (user.permissoes || []).includes(item.id)}
                            onCheckedChange={(checked) => handlePermissaoChange(user.id, item.id, checked)}
                            disabled={user.is_gerente}
                          />
                        </TableCell>
                      ))}
                      {/* TableCell for Delete button */}
                      <TableCell>
                        {!user.is_gerente && (
                          <Button variant="ghost" size="sm" onClick={() => handleExcluirUsuario(user)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* AlertDialog for password reset confirmation */}
      <AlertDialog open={!!usuarioParaResetar} onOpenChange={() => setUsuarioParaResetar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja resetar a segunda senha de "{usuarioParaResetar?.operador_nome || usuarioParaResetar?.full_name}"?
              <br/>
              O operador será solicitado a criar uma nova senha no próximo login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarResetSenha} className="bg-orange-600 hover:bg-orange-700">
              Sim, Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog for user deletion confirmation */}
      <AlertDialog open={!!usuarioParaExcluir} onOpenChange={() => setUsuarioParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o operador "{usuarioParaExcluir?.operador_nome || usuarioParaExcluir?.full_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-red-600 hover:bg-red-700">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
