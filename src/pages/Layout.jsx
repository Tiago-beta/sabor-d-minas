

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from 'react-router-dom';
import MenuAdministrativo from "@/components/admin/MenuAdministrativo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import ClockDisplay from "@/components/ClockDisplay"; // Importar o novo componente de relógio
import { User, isAuthDisabled } from "@/api/entities";
import { PontoFuncionario } from "@/api/entities"; // Added PontoFuncionario import
import { Button } from "@/components/ui/button";
import { LogOut, Repeat2, Clock } from "lucide-react"; // Added Clock for the point control button
import ModalFechamentoCaixaPDV from "@/components/pdv/ModalFechamentoCaixaPDV";
import { createPageUrl } from '@/utils';
import ModalPontoAutomatico from "@/components/ModalPontoAutomatico";

export default function Layout({ children, currentPageName }) {
  const [theme, setTheme] = useState('system');
  const [showModalPonto, setShowModalPonto] = useState(false);
  const [tipoPonto, setTipoPonto] = useState('entrada');
  const navigate = useNavigate();

  const handleLogoutAposRegistroPonto = async () => {
    // Limpa sessão local básica
    sessionStorage.clear();
    if (typeof(Storage) !== 'undefined' && window.localStorage) {
      // preservar preferências não relacionadas? apenas removendo dados específicos se desejado
      // localStorage.removeItem('operador_nome');
    }
    if (!isAuthDisabled()) {
      try {
        const currentUrl = window.location.href;
        await User.loginWithRedirect(currentUrl);
      } catch (e) {
        console.error('Erro logout redirect:', e);
        window.top.location.reload();
      }
    }
  };

  const handleLogout = async () => {
    if (isAuthDisabled()) {
      handleLogoutAposRegistroPonto();
      return;
    }
    try {
      const user = await User.me();
      if (user.is_gerente === true) {
        handleLogoutAposRegistroPonto();
        return;
      }
      const hoje = new Date().toISOString().split('T')[0];
      const pontosDoDia = await PontoFuncionario.filter({ funcionario_id: user.id, data: hoje }, '-hora', 1);
      const ultimoPonto = pontosDoDia.length > 0 ? pontosDoDia[0] : null;
      if (ultimoPonto && ultimoPonto.tipo === 'entrada') {
        setTipoPonto('saida');
        setShowModalPonto(true);
      } else {
        handleLogoutAposRegistroPonto();
      }
    } catch (error) {
      console.error('Erro ao tentar deslogar:', error);
      window.top.location.reload();
    }
  };

  // Verificar login e mostrar modal de entrada
  useEffect(() => {
    const verificarLoginEPonto = async () => {
      // Define which pages are public and do not require login
      const publicPages = ['Catalogo', 'CatalogoAtacado'];

      // If the current page is not in the public list, check for authentication
  if (isAuthDisabled()) return;
      if (currentPageName && !publicPages.includes(currentPageName) && currentPageName !== 'ConfigurarSenha') {
        try {
          const user = await User.me();
          
          if (user.primeiro_login === true) {
            console.log('Primeiro login detectado, redirecionando para configurar senha.');
            navigate(createPageUrl('ConfigurarSenha'));
            return;
          }

          // NOVO: Não mostrar modal de ponto para gerentes
          if (user.is_gerente === true) {
            console.log('Usuário é gerente, não mostrar modal de ponto.');
            return;
          }

          // --- START NEW LOGIC FOR LOGIN ---
          const jaVerifoiPonto = sessionStorage.getItem('pontoEntradaVerificado');
          if (!jaVerifoiPonto) {
            const hoje = new Date().toISOString().split('T')[0];
            const pontosDoDia = await PontoFuncionario.filter({ funcionario_id: user.id, data: hoje }, '-hora', 1);
            const ultimoPonto = pontosDoDia.length > 0 ? pontosDoDia[0] : null;

            // Mostrar modal apenas se não houver ponto hoje ou se o último ponto foi uma 'saída'
            if (!ultimoPonto || ultimoPonto.tipo === 'saida') {
              setTipoPonto('entrada');
              setShowModalPonto(true);
            } else {
              console.log('Último ponto foi entrada. Não mostrar modal.');
            }
            sessionStorage.setItem('pontoEntradaVerificado', 'true');
          }
          // --- END NEW LOGIC FOR LOGIN ---
        } catch (error) {
          // If fetching the user fails, it means they are not logged in.
          // Redirect them to the login page.
          if (!isAuthDisabled()) {
            console.log('User not authenticated, redirecting to login.');
            await User.login();
          } else {
            // sem auth, apenas prosseguir
          }
        }
      }
    };

    // VERIFICAÇÃO EXPLÍCITA: Se for Catalogo, CatalogoAtacado, ou ConfigurarSenha, NÃO EXECUTAR PROTEÇÃO
  if (['Catalogo', 'CatalogoAtacado', 'ConfigurarSenha'].includes(currentPageName) || isAuthDisabled()) {
      console.log(`Página pública ou de configuração acessada: ${currentPageName} - SEM VERIFICAÇÃO DE LOGIN`);
      return; // Para aqui, não executa proteção
    }

    // Para outras páginas, executar proteção
    if (currentPageName) {
      verificarLoginEPonto();
    }
  }, [currentPageName, navigate]);

  // Logic for the theme
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
        setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      
      const effectiveTheme = theme === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme;

      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);

      localStorage.setItem('theme', theme);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
          if (theme === 'system') {
              const newEffectiveTheme = mediaQuery.matches ? 'dark' : 'light';
              root.classList.remove('light', 'dark');
              root.classList.add(newEffectiveTheme);
          }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // FIX: Render specific pages without the main layout
  const urlParams = new URLSearchParams(window.location.search);
  const isApiMode = urlParams.get('api') === 'json';

  if (['Catalogo', 'CatalogoAtacado'].includes(currentPageName)) {
    return <>{children}</>;
  }

  const getTipoPdv = () => {
    if (currentPageName === 'PDV') {
      const urlParams = new URLSearchParams(window.location.search);
      const tipo = urlParams.get('tipo') || 'varejo';
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
    }
    return null;
  };

  const tipoPdv = getTipoPdv();

  const togglePdvType = () => {
    const currentUrlParams = new URLSearchParams(window.location.search);
    const currentType = currentUrlParams.get('tipo') || 'varejo';
    const newType = currentType === 'varejo' ? 'atacado' : 'varejo';
    currentUrlParams.set('tipo', newType);
    // Use navigate to change URL params and trigger re-render of PDV page
    // Ensure that there are other params, they are preserved
    const newPath = `${window.location.pathname}?${currentUrlParams.toString()}`;
    navigate(newPath);
  };

  return (
    <div className="h-screen flex flex-col transition-colors duration-300" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      <style>{`
        :root {
          --bg-color: #e2e8f0;
          --text-color: #1e293b;
          --card-bg: #f1f5f9;
          --border-color: #cbd5e1;
          --input-bg: #f8fafc;
          --header-bg: #e2e8f0;
        }

        .dark {
          --bg-color: #111827;
          --text-color: #ffffff;
          --card-bg: #1f2937;
          --border-color: #374151;
          --input-bg: #374151;
          --header-bg: #1f2937;
        }
        
        body {
          background-color: var(--bg-color) !important;
          color: var(--text-color) !important;
        }
        
        /* Ocultar setas de input de número */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }

        /* Aplicar tema a todos os elementos */
        div, span, p, h1, h2, h3, h4, h5, h6, label {
          color: var(--text-color) !important;
        }
        
        /* Cards e containers - TEMA CLARO AJUSTADO */
        .light .bg-gray-50 {
          background-color: #e2e8f0 !important;
        }
        
        .light .bg-gray-100 {
          background-color: #cbd5e1 !important;
        }
        
        .bg-gray-200 {
          background-color: #94a3b8 !important;
        }
        
        .bg-white {
          background-color: var(--card-bg) !important;
        }
        
        .bg-background {
          background-color: var(--bg-color) !important;
        }
        
        .bg-card {
          background-color: var(--card-bg) !important;
        }
        
        /* Ajuste específico para os botões de ação do PDV no tema claro */
        .light .action-buttons-grid > button {
            background-color: #f1f5f9 !important; /* Fundo cinza claro para os botões */
        }
        .light .action-buttons-grid > button:hover {
            background-color: #e2e8f0 !important; /* Cor mais escura ao passar o mouse */
        }
        
        /* Inputs e form elements - EXCETO botões com cores específicas */
        input, select, textarea {
          background-color: var(--input-bg) !important;
          color: var(--text-color) !important;
          border-color: var(--border-color) !important;
        }
        
        /* CORREÇÃO ESPECÍFICA: Inputs de edição inline no tema escuro */
        .dark input[type="text"], 
        .dark input[type="number"] {
          background-color: #374151 !important;
          color: #ffffff !important;
          border-color: #6b7280 !important;
        }
        
        .dark input[type="text"]:focus, 
        .dark input[type="number"]:focus {
          background-color: #4b5563 !important;
          color: #ffffff !important;
          border-color: #9ca3af !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
        }

        /* Botões genéricos seguem o tema */
        button:not(.bg-green-600):not(.bg-blue-600):not(.bg-purple-600):not(.bg-orange-600):not(.bg-gray-600):not(.bg-cyan-600):not(.border-green-600):not(.border-blue-600):not(.border-purple-600):not(.border-orange-600):not(.border-gray-600):not(.border-cyan-600) {
          background-color: var(--input-bg) !important;
          color: var(--text-color) !important;
          border-color: var(--border-color) !important;
        }
        
        input::placeholder, textarea::placeholder {
          color: #94a3b8 !important;
        }
        
        /* Tabelas */
        table, th, td {
          background-color: var(--card-bg) !important;
          color: var(--text-color) !important;
          border-color: var(--border-color) !important;
        }
        
        .bg-gray-50 th {
          background-color: #f8fafc !important;
        }
        
        /* Bordas */
        .border, .border-b, .border-t, .border-l, .border-r {
          border-color: var(--border-color) !important;
        }
        
        /* RECIBOS/CUPONS - Fundo claro com texto preto sempre */
        .cupom-area, .recibo-area {
          background-color: #fef3c7 !important;
          color: #000000 !important;
        }
        
        .cupom-area *, .recibo-area * {
          color: #000000 !important;
        }
        
        .cupom-area p, .recibo-area p,
        .cupom-area span, .recibo-area span,
        .cupom-area div, .recibo-area div {
          color: #000000 !important;
        }
        
        /* Modais e dialogs */
        [role="dialog"], .dialog-content {
          background-color: var(--card-bg) !important;
          color: var(--text-color) !important;
        }
        
        /* Botões com cores específicas - PRESERVAR CORES */
        .bg-green-600 {
          background-color: #059669 !important;
          color: white !important;
        }
        
        .bg-green-600:hover {
          background-color: #047857 !important;
        }
        
        .bg-blue-600 {
          background-color: #2563eb !important;
          color: white !important;
        }
        
        .bg-blue-600:hover {
          background-color: #1d4ed8 !important;
        }
        
        .bg-purple-600 {
          background-color: #9333ea !important;
          color: white !important;
        }
        
        .bg-purple-600:hover {
          background-color: #7c3aed !important;
        }
        
        .bg-orange-600 {
          background-color: #ea580c !important;
          color: white !important;
        }
        
        .bg-orange-600:hover {
          background-color: #dc2626 !important;
        }
        
        .bg-gray-600 {
          background-color: #4b5563 !important;
          color: white !important;
        }
        
        .bg-gray-600:hover {
          background-color: #374151 !important;
        }
        
        .bg-cyan-600 {
          background-color: #0891b2 !important;
          color: white !important;
        }
        
        .bg-cyan-600:hover {
          background-color: #0e7490 !important;
        }
        
        .bg-red-600 {
          background-color: #dc2626 !important;
          color: white !important;
        }
        
        .bg-red-600:hover {
          background-color: #b91c1c !important;
        }
        
        /* Botões com bordas coloridas */
        .border-green-600 {
          border-color: #059669 !important;
          color: #059669 !important;
        }
        
        .border-green-600:hover {
          background-color: #ecfdf5 !important;
        }
        
        .border-blue-600 {
          border-color: #2563eb !important;
          color: #2563eb !important;
        }
        
        .border-blue-600:hover {
          background-color: #eff6ff !important;
        }
        
        .border-purple-600 {
          border-color: #9333ea !important;
          color: #9333ea !important;
        }
        
        .border-purple-600:hover {
          background-color: #faf5ff !important;
        }
        
        .border-orange-600 {
          border-color: #ea580c !important;
          color: #ea580c !important;
        }
        
        .border-orange-600:hover {
          background-color: #fff7ed !important;
        }
        
        .border-gray-600 {
          border-color: #4b5563 !important;
          color: #4b5563 !important;
        }
        
        .border-gray-600:hover {
          background-color: #f9fafb !important;
        }
        
        .border-cyan-600 {
          border-color: #0891b2 !important;
          color: #0891b2 !important;
        }
        
        .border-cyan-600:hover {
          background-color: #ecfeff !important;
        }
        
        /* Texto específico */
        .text-gray-500, .text-gray-600, .text-gray-700, .text-gray-800 {
          color: #64748b !important;
        }
        
        .text-muted-foreground {
          color: #64748b !important;
        }
        
        /* Cards específicos */
        .shadow, .shadow-lg, .shadow-inner {
          background-color: var(--card-bg) !important;
        }

        /* FIX: Cor do texto no hover em tema escuro - Removido bloco problemático */
        
        .force-dark-text {
            color: #1f2937 !important;
        }
        
        /* Ajustes específicos para o tema claro */
        .light {
          --bg-color: #e2e8f0;
          --card-bg: #f1f5f9;
          --header-bg: #e2e8f0;
        }
        
        /* Override para páginas principais */
        .min-h-screen {
          background-color: var(--bg-color) !important;
        }
        
        /* Ajuste para containers principais */
        .bg-gray-50.min-h-screen {
          background-color: var(--bg-color) !important;
        }
      `}</style>
      
      <header style={{ backgroundColor: 'var(--header-bg)', borderBottomColor: 'var(--border-color)' }} className="border-b px-2 md:px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white flex-shrink-0">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1998e308b_1000133280_d3377269cbb8de9edc1987eb5d5b980c-24_12_202411_46_41.png" 
                alt="Sabor de Minas - Pão D'Queijo & CIA" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>Sabor de Minas</h1>
              {tipoPdv && (
                <p className="text-sm font-semibold text-blue-400">PDV - {tipoPdv}</p>
              )}
            </div>
            {currentPageName === 'PDV' && (
              <div className="flex items-center gap-1 md:gap-2">
                <Link to={createPageUrl("ControlePonto")}>
                  <Button variant="ghost" size="icon" title="Controle de Ponto">
                    <Clock className="w-5 h-5 text-blue-500"/>
                  </Button>
                </Link>
                <ModalFechamentoCaixaPDV />
                <Button onClick={handleLogout} variant="ghost" size="icon" title="Trocar Operador (Logout)">
                    <LogOut className="w-5 h-5 text-red-500"/>
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeSwitcher theme={theme} setTheme={setTheme} />
            <div className="hidden md:block">
              <ClockDisplay />
            </div>
            {currentPageName === 'PDV' && <MenuAdministrativo />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0" style={{ backgroundColor: 'var(--bg-color)' }}>
        {children}
      </main>

      {/* Modal de Ponto Automático */}
      {showModalPonto && (
        <ModalPontoAutomatico
          isOpen={showModalPonto}
          tipo={tipoPonto}
          onClose={() => {
            setShowModalPonto(false);
            if (tipoPonto === 'saida') {
              handleLogoutAposRegistroPonto();
            }
          }}
          onRegistrado={() => {
            setShowModalPonto(false);
            if (tipoPonto === 'saida') {
              handleLogoutAposRegistroPonto();
            }
          }}
          onPular={() => {
            setShowModalPonto(false);
            if (tipoPonto === 'saida') {
              handleLogoutAposRegistroPonto();
            }
          }}
        />
      )}
    </div>
  );
}

