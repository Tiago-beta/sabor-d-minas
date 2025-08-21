import React from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { User } from "@/api/entities";

export default function MenuAdministrativo() {
  const navigate = useNavigate();

  const acessarPainelGerenciamento = async () => {
    try {
      const user = await User.me();
      
      // Verificar se o usuário tem permissões (é gerente OU tem permissões específicas)
      if (user.is_gerente || (user.permissoes && user.permissoes.length > 0)) {
        sessionStorage.setItem('isGerente', user.is_gerente ? 'true' : 'false');
        if (!user.is_gerente && user.permissoes) {
          sessionStorage.setItem('userPermissions', JSON.stringify(user.permissoes));
        }
        navigate(createPageUrl('Gerencia'));
      } else {
        alert("Você não tem permissão para acessar o painel administrativo.");
      }
      
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
      alert("Erro ao verificar permissões. Tente novamente.");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={acessarPainelGerenciamento}
      className="text-gray-500 hover:text-gray-700"
      title="Painel de Gerenciamento"
    >
      <Settings className="w-5 h-5" />
    </Button>
  );
}