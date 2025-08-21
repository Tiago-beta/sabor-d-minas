
import React, { useState, useEffect } from "react";
import { CadastroVendedor } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, ArrowLeft, Plus, Save, Pencil, Trash2 } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Checkbox } from "@/components/ui/checkbox";

export default function CadastroVendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [editandoVendedor, setEditandoVendedor] = useState(null);
  const [novoVendedor, setNovoVendedor] = useState({
    nome: "",
    telefone: "",
    ativo: true,
    observacoes: ""
  });

  useEffect(() => {
    carregarVendedores();
  }, []);

  const carregarVendedores = async () => {
    const lista = await CadastroVendedor.list('-created_date');
    setVendedores(lista);
  };

  const salvarVendedor = async () => {
    if (!novoVendedor.nome.trim()) {
      alert("Nome do vendedor é obrigatório!");
      return;
    }

    try {
      if (editandoVendedor) {
        await CadastroVendedor.update(editandoVendedor.id, novoVendedor);
        setEditandoVendedor(null);
      } else {
        await CadastroVendedor.create(novoVendedor);
      }
      
      setNovoVendedor({
        nome: "",
        telefone: "",
        ativo: true,
        observacoes: ""
      });
      
      carregarVendedores();
    } catch (error) {
      console.error("Erro ao salvar vendedor:", error);
      alert("Erro ao salvar vendedor!");
    }
  };

  const editarVendedor = (vendedor) => {
    setNovoVendedor({
      nome: vendedor.nome,
      telefone: vendedor.telefone || "",
      ativo: vendedor.ativo,
      observacoes: vendedor.observacoes || ""
    });
    setEditandoVendedor(vendedor);
  };

  const cancelarEdicao = () => {
    setEditandoVendedor(null);
    setNovoVendedor({
      nome: "",
      telefone: "",
      ativo: true,
      observacoes: ""
    });
  };

  const removerVendedor = async (vendedorId) => {
    if (confirm("Tem certeza que deseja remover este vendedor?")) {
      await CadastroVendedor.delete(vendedorId);
      carregarVendedores();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Cadastro de Vendedores Externos
          </h1>
          <Link to={createPageUrl("Gerencia")}>
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar à Gerência</Button>
          </Link>
        </div>

        {/* Formulário de Cadastro/Edição */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editandoVendedor ? 'Editar Vendedor' : 'Cadastrar Novo Vendedor'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Nome do Vendedor *</label>
                <Input
                  value={novoVendedor.nome}
                  onChange={(e) => setNovoVendedor({...novoVendedor, nome: e.target.value})}
                  placeholder="Digite o nome..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={novoVendedor.telefone}
                  onChange={(e) => setNovoVendedor({...novoVendedor, telefone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium">Observações</label>
              <Textarea
                value={novoVendedor.observacoes}
                onChange={(e) => setNovoVendedor({...novoVendedor, observacoes: e.target.value})}
                placeholder="Observações sobre o vendedor..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={novoVendedor.ativo}
                onCheckedChange={(checked) => setNovoVendedor({...novoVendedor, ativo: checked})}
              />
              <label className="text-sm font-medium">Vendedor Ativo</label>
            </div>
            <div className="flex gap-2">
              {editandoVendedor && (
                <Button onClick={cancelarEdicao} variant="outline">
                  Cancelar
                </Button>
              )}
              <Button onClick={salvarVendedor} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {editandoVendedor ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Vendedores */}
        <Card>
          <CardHeader>
            <CardTitle>Vendedores Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor) => (
                  <TableRow key={vendedor.id}>
                    <TableCell className="font-medium">{vendedor.nome}</TableCell>
                    <TableCell>{vendedor.telefone || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${vendedor.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vendedor.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell>{vendedor.observacoes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editarVendedor(vendedor)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerVendedor(vendedor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {vendedores.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Nenhum vendedor cadastrado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
