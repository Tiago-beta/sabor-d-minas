
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X, Pencil } from "lucide-react";
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
import ModalEditarItem from './ModalEditarItem'; // Importando o novo modal de edição

const InfoEmpresa = ({ operadorNome, clienteNome }) => {
    const [numeroPedido] = React.useState(() => `PF:${new Date().getTime().toString().slice(-4)}`);

    return (
        <div className="px-2 py-3 text-xs border-b-2 border-dashed border-gray-400 cupom-area">
            <p className="font-bold">PÃO D'QUEIJO & CIA</p>
            <p>Rua Inajá, 18, Jd Mirante - Várzea Paulista - SP</p>
            <p>CNPJ: 34.669.787/0001-09</p>
            <p>Pedido: {numeroPedido}</p>
            <p>Data Pedido: {new Date().toLocaleDateString()}</p>
            {clienteNome && <p className="font-bold">Cliente: {clienteNome}</p>}
            <p className="font-bold mt-1">CUPOM NÃO FISCAL</p>
        </div>
    );
};

const RodapeOperador = ({ operadorNome }) => (
    <div className="p-2 border-t-2 border-dashed border-gray-400 text-xs cupom-area">
        <p>OPERADOR: {operadorNome || 'SISTEMA'}</p>
        <p>PDV-CUPOM NÃO FISCAL-FRENTE CAIXA 3.0</p>
    </div>
);

const SubtotalDisplay = ({ valor }) => (
    <div className="p-4 border-t-2 border-dashed border-gray-400 text-right cupom-area">
        <span className="text-sm font-semibold text-gray-700">SUBTOTAL:</span>
        <span className="text-2xl font-bold text-blue-800 ml-2">
            R$ {valor.toFixed(2)}
        </span>
    </div>
);

const ListaItens = React.memo(({ 
  itens, 
  itemSelecionadoId, 
  onItemSelecionado, 
  operadorNome,
  onRemoverItem,
  onEditarItem,
  onEditarQuantidade, 
  subtotal,
  clienteNome
}) => {
  const [itemParaExcluir, setItemParaExcluir] = React.useState(null);
  const [itemParaEditar, setItemParaEditar] = React.useState(null);

  const handleExcluirItem = () => {
    if (itemParaExcluir && onRemoverItem) {
      onRemoverItem(itemParaExcluir.id);
      setItemParaExcluir(null);
    }
  };

  const handleSaveEdicao = (novoPreco, novaQuantidade) => {
    if (itemParaEditar) {
      if (Number(novoPreco) !== itemParaEditar.preco_unitario) {
        onEditarItem(itemParaEditar.id, Number(novoPreco));
      }
      if (Number(novaQuantidade) !== itemParaEditar.quantidade) {
        onEditarQuantidade(itemParaEditar.id, Number(novaQuantidade));
      }
    }
    setItemParaEditar(null);
  };

  return (
    <div className="h-full rounded-lg shadow-inner flex flex-col border cupom-area">
      <InfoEmpresa operadorNome={operadorNome} clienteNome={clienteNome} />
      <div className="flex-1 min-h-0 cupom-area">
        <div className="h-full cupom-area overflow-y-auto">
          <Table className="cupom-area">
            <TableHeader className="cupom-area">
              <TableRow className="cupom-area">
                <TableHead className="h-8 cupom-area w-12 text-center">Cód</TableHead>
                <TableHead className="h-8 cupom-area">Descrição</TableHead>
                <TableHead className="h-8 text-center cupom-area">Qtde</TableHead>
                <TableHead className="h-8 text-center cupom-area">V.Unit.</TableHead>
                <TableHead className="h-8 text-right cupom-area">Total</TableHead>
                <TableHead className="h-8 w-24 cupom-area text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="cupom-area">
              {itens.map((item) => (
                <TableRow 
                  key={item.id} 
                  onClick={() => onItemSelecionado(item.id)}
                  className={`cursor-pointer h-10 cupom-area ${itemSelecionadoId === item.id ? 'bg-yellow-200' : 'hover:bg-yellow-100'}`}
                >
                  <TableCell className="font-medium p-1 cupom-area text-xs text-center">{item.codigo}</TableCell>
                  <TableCell className="font-medium p-2 cupom-area">{item.descricao}</TableCell>
                  <TableCell className="text-center p-1 cupom-area">
                    {item.quantidade}
                  </TableCell>
                  <TableCell className="text-center p-1 cupom-area">
                    {item.preco_unitario.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-semibold p-2 cupom-area">{item.subtotal.toFixed(2)}</TableCell>
                  <TableCell className="p-1 cupom-area">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemParaEditar(item);
                        }}
                        className="w-6 h-6 p-0 text-gray-400 hover:bg-blue-100 hover:text-blue-600 rounded-full flex items-center justify-center"
                        title="Editar item"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemParaExcluir(item);
                        }}
                        className="w-6 h-6 p-0 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-full flex items-center justify-center"
                        title="Remover item"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {itens.length === 0 && (
                  <TableRow className="cupom-area">
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500 cupom-area">
                          Aguardando itens...
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <SubtotalDisplay valor={subtotal} />
      <RodapeOperador operadorNome={operadorNome} />

      <AlertDialog open={!!itemParaExcluir} onOpenChange={() => setItemParaExcluir(null)}>
        <AlertDialogContent style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{itemParaExcluir?.descricao}" do carrinho?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExcluirItem}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {itemParaEditar && (
        <ModalEditarItem
          item={itemParaEditar}
          isOpen={!!itemParaEditar}
          onClose={() => setItemParaEditar(null)}
          onSave={handleSaveEdicao}
        />
      )}
    </div>
  );
});

export default ListaItens;
