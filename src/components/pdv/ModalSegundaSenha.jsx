
import React, { useState, useEffect } from "react";
import { User, isAuthDisabled } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KeyRound, LogIn, LogOut } from "lucide-react";

export default function ModalSegundaSenha({ onAuthenticated }) {
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [operadorNome, setOperadorNome] = useState("OPERADOR");

  useEffect(() => {
    if (isAuthDisabled()) {
      const nome = localStorage.getItem('operador_nome') || 'OPERADOR';
      setOperadorNome(nome);
      return;
    }
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setOperadorNome(user.operador_nome || user.full_name || "OPERADOR");
      } catch (e) {
        setOperadorNome("OPERADOR");
      }
    };
    fetchUser();
  }, []);

  const handleVerificarSenha = async () => {
    if (!senha) {
      setError("Por favor, digite sua senha.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (isAuthDisabled()) {
        const segunda = localStorage.getItem('segunda_senha') || '1234';
        if (senha === segunda) {
          onAuthenticated();
        } else {
          setError('Senha incorreta.');
        }
      } else {
        const user = await User.me();
        if (user.segunda_senha === senha) {
          onAuthenticated();
        } else {
          setError("Senha incorreta. Tente novamente.");
        }
      }
    } catch (err) {
      setError("Usuário não encontrado. Faça login novamente.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    if (isAuthDisabled()) {
      // somente limpar dados locais
      sessionStorage.clear();
      localStorage.removeItem('operador_nome');
      return;
    }
    try {
        // Limpa a sessão local para garantir que o usuário seja deslogado
        sessionStorage.clear();
        if (typeof(Storage) !== "undefined" && window.localStorage) {
            window.localStorage.clear();
        }
        
        // Usar loginWithRedirect para garantir que volte ao PDV após login
        if (!isAuthDisabled()) {
          const currentUrl = window.location.href;
          await User.loginWithRedirect(currentUrl);
        }
    } catch (error) {
        console.error("Erro ao tentar deslogar, forçando recarga:", error);
        // Em caso de erro, apenas recarrega a página inteira
        window.location.reload();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerificarSenha();
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-sm">
        <DialogHeader className="text-center">
            <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full w-fit mb-4">
                <KeyRound className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            </div>
          <DialogTitle>Acesso ao PDV</DialogTitle>
          <DialogDescription>
            Olá, {operadorNome}. Digite sua segunda senha para continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium" htmlFor="segunda_senha">Senha de acesso</label>
            <Input
              id="segunda_senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="••••••••"
              autoFocus
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-col gap-2">
            <Button onClick={handleVerificarSenha} disabled={loading}>
              {loading ? "Verificando..." : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleLogout} title="Entrar com outro operador">
                <LogOut className="w-4 h-4 mr-2" />
                Trocar Operador
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
