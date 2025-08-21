// Versão desconectada: todas as entidades são coleções em memória sem Base44.
export const AUTH_DISABLED = true;

function buildMemoryCollection(name) {
	const store = [];
	return {
		list: async () => [...store],
		filter: async () => [...store],
		get: async (id) => store.find(i => i.id === id) || null,
		create: async (data) => { const obj = { id: Date.now().toString(), ...data }; store.push(obj); return obj; },
		update: async (id, data) => { const idx = store.findIndex(i => i.id === id); if (idx>-1) { store[idx] = { ...store[idx], ...data }; return store[idx]; } return null; },
		delete: async (id) => { const idx = store.findIndex(i => i.id === id); if (idx>-1) store.splice(idx,1); return true; },
	};
}
export const Produto = buildMemoryCollection('Produto');
export const Venda = buildMemoryCollection('Venda');
export const Kit = buildMemoryCollection('Kit');
export const KitItem = buildMemoryCollection('KitItem');
export const Consignacao = buildMemoryCollection('Consignacao');
export const ConsignacaoItem = buildMemoryCollection('ConsignacaoItem');
export const Recebimento = buildMemoryCollection('Recebimento');
export const RecebimentoItem = buildMemoryCollection('RecebimentoItem');
export const Cliente = buildMemoryCollection('Cliente');
export const Despesa = buildMemoryCollection('Despesa');
export const PedidoOnline = buildMemoryCollection('PedidoOnline');
export const Bairro = buildMemoryCollection('Bairro');
export const EntregaMotoboy = buildMemoryCollection('EntregaMotoboy');
export const VendedorExterno = buildMemoryCollection('VendedorExterno');
export const ValeVendedor = buildMemoryCollection('ValeVendedor');
export const CadastroVendedor = buildMemoryCollection('CadastroVendedor');
export const FechamentoCaixa = buildMemoryCollection('FechamentoCaixa');
export const AjusteFinanceiro = buildMemoryCollection('AjusteFinanceiro');
export const PontoFuncionario = buildMemoryCollection('PontoFuncionario');
export const Adiantamento = buildMemoryCollection('Adiantamento');
export const Feriado = buildMemoryCollection('Feriado');
export const MotoboyFechamentoOverride = buildMemoryCollection('MotoboyFechamentoOverride');



// auth sdk:
export const isAuthDisabled = () => true;

const mockUser = {
	id: 'local-user',
	operador_nome: 'OPERADOR',
	full_name: 'OPERADOR',
	is_gerente: true,
	primeiro_login: false,
	segunda_senha: '1234'
};
export const User = {
	me: async () => mockUser,
	login: async () => mockUser,
	loginWithRedirect: async () => mockUser,
	logout: async () => {}
};