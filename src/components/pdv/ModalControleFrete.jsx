
import React, { useState, useEffect } from 'react';
import { Bairro } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Truck, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ModalControleFrete({ isOpen, onClose }) {
  const [bairros, setBairros] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [editandoBairro, setEditandoBairro] = useState(null);
  const [showNovoBairro, setShowNovoBairro] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bairroParaExcluir, setBairroParaExcluir] = useState(null);
  const [deleting, setDeleting] = useState(false); // Novo estado para o loader de exclusão
  const [novoBairro, setNovoBairro] = useState({
    nome: '',
    cidade: '',
    taxa_entrega: '',
    minimo_entrega_gratis: '',
    direcao: ''
  });

  useEffect(() => {
    if (isOpen) {
      carregarBairros();
    }
  }, [isOpen]);

  const calcularMinimoGratis = (taxa) => {
    const valorTaxa = parseFloat(taxa) || 0;
    if (valorTaxa === 4) return 40;
    if (valorTaxa === 5) return 50;
    if (valorTaxa === 7) return 60;
    if (valorTaxa === 8) return 80;
    if (valorTaxa === 9) return 80;
    if (valorTaxa === 10) return 90;
    if (valorTaxa === 15) return 120;
    if (valorTaxa === 20) return 150;
    return 0;
  };

  const carregarBairros = async () => {
    setLoading(true);
    try {
      const lista = await Bairro.list();
      const bairrosCompletos = lista.map(b => ({
        ...b,
        minimo_entrega_gratis: b.minimo_entrega_gratis || calcularMinimoGratis(b.taxa_entrega)
      }));
      setBairros(bairrosCompletos);
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarBairro = async (bairroId, campo, valor, e) => {
    let valorProcessado = valor;
    let atualizacao = {};
    let minimoGratisCalculado = null;

    if (campo === 'taxa_entrega') {
      valorProcessado = parseFloat(valor) || 0;
      minimoGratisCalculado = calcularMinimoGratis(valorProcessado);
      atualizacao = { taxa_entrega: valorProcessado, minimo_entrega_gratis: minimoGratisCalculado };
    } else {
      valorProcessado = campo === 'minimo_entrega_gratis' ? parseFloat(valor) || 0 : valor;
      atualizacao = { [campo]: valorProcessado };
    }

    setBairros(prev => prev.map(b => {
      if (b.id === bairroId) {
        return { ...b, ...atualizacao };
      }
      return b;
    }));
    
    if (e.type === 'blur') {
      try {
        await Bairro.update(bairroId, atualizacao);
      } catch (error) {
        console.error('Erro ao atualizar bairro:', error);
        alert('Erro ao salvar alteração! Os dados serão recarregados.');
        carregarBairros();
      }
    }
  };

  const handleCriarBairro = async () => {
    if (!novoBairro.nome || !novoBairro.cidade || !novoBairro.taxa_entrega) {
      alert('Por favor, preencha pelo menos o nome, cidade e taxa de entrega.');
      return;
    }

    try {
      const taxaNumerica = parseFloat(novoBairro.taxa_entrega) || 0;
      const minimoCalculado = novoBairro.minimo_entrega_gratis ? 
        parseFloat(novoBairro.minimo_entrega_gratis) : 
        calcularMinimoGratis(taxaNumerica);

      await Bairro.create({
        nome: novoBairro.nome,
        cidade: novoBairro.cidade,
        taxa_entrega: taxaNumerica,
        minimo_entrega_gratis: minimoCalculado,
        direcao: novoBairro.direcao || '',
        ativo: true
      });

      setNovoBairro({
        nome: '',
        cidade: '',
        taxa_entrega: '',
        minimo_entrega_gratis: '',
        direcao: ''
      });
      setShowNovoBairro(false);
      carregarBairros();
    } catch (error) {
      console.error('Erro ao criar bairro:', error);
      alert('Erro ao criar bairro!');
    }
  };

  const handleEditarBairro = (bairro) => {
    setEditandoBairro({
      ...bairro,
      taxa_entrega: bairro.taxa_entrega?.toString() || '',
      minimo_entrega_gratis: bairro.minimo_entrega_gratis?.toString() || ''
    });
  };

  const handleSalvarEdicao = async () => {
    if (!editandoBairro.nome || !editandoBairro.cidade) {
      alert('Nome e cidade são obrigatórios.');
      return;
    }

    try {
      const taxaNumerica = parseFloat(editandoBairro.taxa_entrega) || 0;
      const minimoNumerico = editandoBairro.minimo_entrega_gratis ? 
        parseFloat(editandoBairro.minimo_entrega_gratis) : 
        calcularMinimoGratis(taxaNumerica);

      await Bairro.update(editandoBairro.id, {
        nome: editandoBairro.nome,
        cidade: editandoBairro.cidade,
        taxa_entrega: taxaNumerica,
        minimo_entrega_gratis: minimoNumerico,
        direcao: editandoBairro.direcao || ''
      });

      setEditandoBairro(null);
      carregarBairros();
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      alert('Erro ao salvar alterações!');
    }
  };

  const handleExcluirBairro = async () => {
    if (!bairroParaExcluir) return;

    setDeleting(true);
    try {
      await Bairro.delete(bairroParaExcluir.id);
      carregarBairros(); // Recarrega sem await para não travar
      setBairroParaExcluir(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Erro ao excluir bairro:', error);
      alert('Erro ao excluir bairro!');
    } finally {
      setDeleting(false);
    }
  };

  const normalizeText = (text = '') => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const buscarBairrosRepetidos = () => {
    const bairrosAgrupados = {};
    const repetidos = [];

    // Agrupar bairros por nome (ignorando diferenças de maiúscula/minúscula e acentos)
    bairros.forEach(bairro => {
      const nomeNormalizado = normalizeText(bairro.nome);
      if (!bairrosAgrupados[nomeNormalizado]) {
        bairrosAgrupados[nomeNormalizado] = [];
      }
      bairrosAgrupados[nomeNormalizado].push(bairro);
    });

    // Encontrar grupos com mais de um bairro (repetidos)
    Object.values(bairrosAgrupados).forEach(grupo => {
      if (grupo.length > 1) {
        repetidos.push(...grupo);
      }
    });

    if (repetidos.length > 0) {
      // Filtrar a lista para mostrar apenas os repetidos
      // Coleta apenas os nomes normalizados únicos dos bairros repetidos para a busca
      const nomesUnicosRepetidos = [...new Set(repetidos.map(b => normalizeText(b.nome)))];
      setBusca(`repetidos:(${nomesUnicosRepetidos.join('|')})`);
      
      // Criar uma mensagem informativa
      const gruposRepetidos = {};
      repetidos.forEach(bairro => {
        const nomeNormalizado = normalizeText(bairro.nome);
        if (!gruposRepetidos[nomeNormalizado]) {
          gruposRepetidos[nomeNormalizado] = [];
        }
        gruposRepetidos[nomeNormalizado].push(bairro);
      });
      
      let mensagem = `Encontrados ${repetidos.length} ocorrências de bairros com nomes repetidos:\n\n`;
      Object.entries(gruposRepetidos).forEach(([nomeNormalizado, grupo]) => {
        // Exibe o nome original do primeiro bairro do grupo para a mensagem
        mensagem += `• ${grupo[0].nome} (${grupo.length} ocorrências)\n`;
      });
      
      alert(mensagem);
    } else {
      alert('Nenhum bairro repetido encontrado!');
      setBusca(''); // Limpa a busca se não houver repetidos
    }
  };

  const bairrosFiltrados = bairros.filter(bairro => {
    // Verificar se é uma busca por repetidos
    if (busca.startsWith('repetidos:(') && busca.endsWith(')')) {
      const nomesRepetidos = busca.slice(11, -1).split('|');
      return nomesRepetidos.includes(normalizeText(bairro.nome));
    }
    
    // Busca normal
    const buscaNormalizada = normalizeText(busca);
    return (bairro.nome && normalizeText(bairro.nome).includes(buscaNormalizada)) ||
           (bairro.cidade && normalizeText(bairro.cidade).includes(buscaNormalizada));
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Gerenciar Fretes por Bairro
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">Tabela de Bairros Cadastrados</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={buscarBairrosRepetidos} 
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar Repetidos
                </Button>
                <Button onClick={() => setShowNovoBairro(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Bairro
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por bairro ou cidade..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {loading ? (
                <div className="text-center py-8">Carregando bairros...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bairro</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Taxa (R$)</TableHead>
                      <TableHead>Mín. p/ Grátis (R$)</TableHead>
                      <TableHead>Direita/Esquerda</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bairrosFiltrados.map((bairro) => (
                      <TableRow key={bairro.id}>
                        <TableCell className="font-medium">
                          {bairro.nome}
                        </TableCell>
                        <TableCell>
                          {bairro.cidade || '-'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={bairro.taxa_entrega || ''}
                            onChange={(e) => atualizarBairro(bairro.id, 'taxa_entrega', e.target.value, e)}
                            onBlur={(e) => atualizarBairro(bairro.id, 'taxa_entrega', e.target.value, e)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={bairro.minimo_entrega_gratis || ''}
                            onChange={(e) => atualizarBairro(bairro.id, 'minimo_entrega_gratis', e.target.value, e)}
                            onBlur={(e) => atualizarBairro(bairro.id, 'minimo_entrega_gratis', e.target.value, e)}
                            className="w-24"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={bairro.direcao || ''}
                            onChange={(e) => atualizarBairro(bairro.id, 'direcao', e.target.value, e)}
                            onBlur={(e) => atualizarBairro(bairro.id, 'direcao', e.target.value, e)}
                            className="w-24"
                            placeholder="Direita"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditarBairro(bairro)}
                              title="Editar bairro"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBairroParaExcluir(bairro);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title="Excluir bairro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {bairrosFiltrados.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Nenhum bairro encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para criar novo bairro */}
      <Dialog open={showNovoBairro} onOpenChange={setShowNovoBairro}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Bairro</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Bairro *</label>
              <Input
                value={novoBairro.nome}
                onChange={(e) => setNovoBairro(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Centro"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Cidade *</label>
              <Input
                value={novoBairro.cidade}
                onChange={(e) => setNovoBairro(prev => ({ ...prev, cidade: e.target.value }))}
                placeholder="Ex: Várzea Paulista"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Taxa de Entrega (R$) *</label>
              <Input
                type="number"
                step="0.01"
                value={novoBairro.taxa_entrega}
                onChange={(e) => setNovoBairro(prev => ({ ...prev, taxa_entrega: e.target.value }))}
                placeholder="5.00"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Mínimo para Entrega Grátis (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={novoBairro.minimo_entrega_gratis}
                onChange={(e) => setNovoBairro(prev => ({ ...prev, minimo_entrega_gratis: e.target.value }))}
                placeholder="Será calculado automaticamente se vazio"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Direção</label>
              <Input
                value={novoBairro.direcao}
                onChange={(e) => setNovoBairro(prev => ({ ...prev, direcao: e.target.value }))}
                placeholder="Ex: Direita"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovoBairro(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarBairro} className="bg-green-600 hover:bg-green-700">
              Criar Bairro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar bairro */}
      {editandoBairro && (
        <Dialog open={!!editandoBairro} onOpenChange={() => setEditandoBairro(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Bairro</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Bairro *</label>
                <Input
                  value={editandoBairro.nome}
                  onChange={(e) => setEditandoBairro(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Cidade *</label>
                <Input
                  value={editandoBairro.cidade}
                  onChange={(e) => setEditandoBairro(prev => ({ ...prev, cidade: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Taxa de Entrega (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editandoBairro.taxa_entrega}
                  onChange={(e) => setEditandoBairro(prev => ({ ...prev, taxa_entrega: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Mínimo para Entrega Grátis (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editandoBairro.minimo_entrega_gratis}
                  onChange={(e) => setEditandoBairro(prev => ({ ...prev, minimo_entrega_gratis: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Direção</label>
                <Input
                  value={editandoBairro.direcao}
                  onChange={(e) => setEditandoBairro(prev => ({ ...prev, direcao: e.target.value }))}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditandoBairro(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarEdicao} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de confirmação para exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o bairro "{bairroParaExcluir?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBairroParaExcluir(null);
              setShowDeleteDialog(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirBairro}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
