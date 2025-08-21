import React, { useState } from "react";
import { User, PontoFuncionario } from "@/api/entities";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, X } from "lucide-react";

export default function ModalPontoAutomatico({ isOpen, tipo, onClose, onRegistrado, onPular }) {
  const [registrando, setRegistrando] = useState(false);
  const [operadorNome, setOperadorNome] = useState("");

  React.useEffect(() => {
    const fetchOperador = async () => {
      try {
        const user = await User.me();
        setOperadorNome(user.operador_nome || user.full_name || "OPERADOR");
      } catch (error) {
        console.error('Erro ao carregar operador:', error);
        setOperadorNome("OPERADOR");
      }
    };
    if (isOpen) {
      fetchOperador();
    }
  }, [isOpen]);

  const handleRegistrarPonto = async () => {
    setRegistrando(true);
    try {
      const user = await User.me();
      const agora = new Date();
      const dataAtual = agora.toISOString().split('T')[0];
      const horaAtual = agora.toTimeString().split(' ')[0];

      await PontoFuncionario.create({
        funcionario_id: user.id,
        funcionario_nome: user.operador_nome || user.full_name,
        data: dataAtual,
        hora: horaAtual,
        tipo: tipo, // 'entrada' ou 'saida'
        observacoes: 'Registro automático via sistema'
      });

      onRegistrado();
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
      alert('Erro ao registrar ponto automático!');
      onClose();
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
            Registro de Ponto
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full w-fit">
              {tipo === 'entrada' ? (
                <LogIn className="w-8 h-8 text-green-600" />
              ) : (
                <LogOut className="w-8 h-8 text-red-600" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold mb-2">
              {tipo === 'entrada' ? 'Registrar entrada do ponto agora?' : 'Registrar saída do ponto agora?'}
            </h3>
            
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Operador: <span className="font-semibold">{operadorNome}</span>
            </p>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tipo === 'entrada' 
                ? 'Ao confirmar, sua entrada será registrada automaticamente com o horário atual.'
                : 'Ao confirmar, sua saída será registrada automaticamente com o horário atual.'
              }
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onPular}
              variant="outline"
              className="flex-1"
              disabled={registrando}
            >
              <X className="w-4 h-4 mr-2" />
              Pular
            </Button>
            
            <Button
              onClick={handleRegistrarPonto}
              className={`flex-1 ${tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={registrando}
            >
              {tipo === 'entrada' ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              {registrando ? 'Registrando...' : 'Sim, Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}