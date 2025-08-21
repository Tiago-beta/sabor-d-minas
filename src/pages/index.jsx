import Layout from "./Layout.jsx";

import PDV from "./PDV";

import Produtos from "./Produtos";

import Relatorios from "./Relatorios";

import Senhas from "./Senhas";

import Gerencia from "./Gerencia";

import Compras from "./Compras";

import Estoque from "./Estoque";

import Kits from "./Kits";

import RegistroVendas from "./RegistroVendas";

import Consignacao from "./Consignacao";

import Recebimentos from "./Recebimentos";

import Catalogo from "./Catalogo";

import Clientes from "./Clientes";

import Motoboy from "./Motoboy";

import Saldo from "./Saldo";

import CatalogoAtacado from "./CatalogoAtacado";

import TesteAPI from "./TesteAPI";

import VendedorExterno from "./VendedorExterno";

import CadastroVendedores from "./CadastroVendedores";

import FechamentoCaixa from "./FechamentoCaixa";

import ConfigurarSenha from "./ConfigurarSenha";

import APrazo from "./APrazo";

import ControlePonto from "./ControlePonto";

import RH from "./RH";

import Limpeza from "./Limpeza";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    PDV: PDV,
    
    Produtos: Produtos,
    
    Relatorios: Relatorios,
    
    Senhas: Senhas,
    
    Gerencia: Gerencia,
    
    Compras: Compras,
    
    Estoque: Estoque,
    
    Kits: Kits,
    
    RegistroVendas: RegistroVendas,
    
    Consignacao: Consignacao,
    
    Recebimentos: Recebimentos,
    
    Catalogo: Catalogo,
    
    Clientes: Clientes,
    
    Motoboy: Motoboy,
    
    Saldo: Saldo,
    
    CatalogoAtacado: CatalogoAtacado,
    
    TesteAPI: TesteAPI,
    
    VendedorExterno: VendedorExterno,
    
    CadastroVendedores: CadastroVendedores,
    
    FechamentoCaixa: FechamentoCaixa,
    
    ConfigurarSenha: ConfigurarSenha,
    
    APrazo: APrazo,
    
    ControlePonto: ControlePonto,
    
    RH: RH,
    
    Limpeza: Limpeza,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<PDV />} />
                
                
                <Route path="/PDV" element={<PDV />} />
                
                <Route path="/Produtos" element={<Produtos />} />
                
                <Route path="/Relatorios" element={<Relatorios />} />
                
                <Route path="/Senhas" element={<Senhas />} />
                
                <Route path="/Gerencia" element={<Gerencia />} />
                
                <Route path="/Compras" element={<Compras />} />
                
                <Route path="/Estoque" element={<Estoque />} />
                
                <Route path="/Kits" element={<Kits />} />
                
                <Route path="/RegistroVendas" element={<RegistroVendas />} />
                
                <Route path="/Consignacao" element={<Consignacao />} />
                
                <Route path="/Recebimentos" element={<Recebimentos />} />
                
                <Route path="/Catalogo" element={<Catalogo />} />
                
                <Route path="/Clientes" element={<Clientes />} />
                
                <Route path="/Motoboy" element={<Motoboy />} />
                
                <Route path="/Saldo" element={<Saldo />} />
                
                <Route path="/CatalogoAtacado" element={<CatalogoAtacado />} />
                
                <Route path="/TesteAPI" element={<TesteAPI />} />
                
                <Route path="/VendedorExterno" element={<VendedorExterno />} />
                
                <Route path="/CadastroVendedores" element={<CadastroVendedores />} />
                
                <Route path="/FechamentoCaixa" element={<FechamentoCaixa />} />
                
                <Route path="/ConfigurarSenha" element={<ConfigurarSenha />} />
                
                <Route path="/APrazo" element={<APrazo />} />
                
                <Route path="/ControlePonto" element={<ControlePonto />} />
                
                <Route path="/RH" element={<RH />} />
                
                <Route path="/Limpeza" element={<Limpeza />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}