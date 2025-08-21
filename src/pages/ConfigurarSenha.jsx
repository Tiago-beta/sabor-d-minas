import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConfigurarSenha() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await User.me();
        setOperadorNome(user.operador_nome || user.full_name);
      } catch (e) {
        // Se não encontrar o usuário, redireciona para o login.
        navigate(createPageUrl("PDV"));
      }
    };
    fetchUser();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!senha || !confirmarSenha) {
      setError("Por favor, preencha ambos os campos.");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    if (senha.length < 4) {
      setError("A senha deve ter no mínimo 4 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await User.updateMyUserData({
        segunda_senha: senha,
        primeiro_login: false,
      });
      alert("Senha configurada com sucesso! Você será redirecionado para o PDV.");
      navigate(createPageUrl("PDV"));
    } catch (err) {
      console.error("Erro ao configurar senha:", err);
      setError("Ocorreu um erro ao salvar sua senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full w-fit mb-4">
            <KeyRound className="w-8 h-8 text-blue-600 dark:text-blue-300" />
          </div>
          <CardTitle>Configurar Segunda Senha</CardTitle>
          <CardDescription>
            Olá, {operadorNome}! Por segurança, você precisa criar uma segunda senha para acessar o PDV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium" htmlFor="senha">Nova Senha</label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="confirmarSenha">Confirmar Nova Senha</label>
              <Input
                id="confirmarSenha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar e Acessar o PDV
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}