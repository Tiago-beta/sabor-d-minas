import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import CachedImage from '../common/CachedImage';

export default function ModalRelatorioConsignacao({ isOpen, onClose, resumoData, vendedorNome, dataSaida }) {
    
    const handlePrint = () => {
        const printContent = document.getElementById('resumo-print-area');
        if (printContent) {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Relatório de Consignação</title>
                        <style>
                            @page {
                                margin: 0.5in;
                                size: A4;
                            }
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background: white;
                                color: black;
                            }
                            .print-header {
                                text-align: center;
                                margin-bottom: 20px;
                            }
                            .print-header h1 {
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 16px;
                            }
                            .print-header div {
                                display: flex;
                                justify-content: space-around;
                                margin-top: 16px;
                                font-size: 14px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #ccc;
                                padding: 8px;
                                text-align: left;
                            }
                            th {
                                background-color: #f5f5f5;
                                font-weight: bold;
                                text-align: center;
                            }
                            .text-center {
                                text-align: center;
                            }
                            .text-green {
                                color: #059669;
                                font-weight: bold;
                            }
                            tfoot td {
                                background-color: #f9f9f9;
                                font-weight: bold;
                            }
                            img {
                                max-width: 50px;
                                max-height: 50px;
                                object-fit: cover;
                            }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                    </body>
                    </html>
                `;
                
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                
                // Aguardar um pouco para garantir que o conteúdo seja carregado
                setTimeout(() => {
                    printWindow.print();
                    setTimeout(() => {
                        printWindow.close();
                    }, 1000);
                }, 500);
            }
        }
    };

    const dataFormatada = dataSaida ? new Date(dataSaida + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
    
    let totalSaida = 0;
    let totalRetorno = 0;
    let totalVendido = 0;

    resumoData.forEach(item => {
        totalSaida += item.saiu || 0;
        totalRetorno += item.voltou || 0;
        totalVendido += item.vendeu || 0;
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] print:max-w-full print:border-none print:shadow-none print:p-0">
                 <style>{`
                    /* Estilo personalizado para barra de rolagem */
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }
                    
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 4px;
                    }
                    
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #c1c1c1;
                        border-radius: 4px;
                    }
                    
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #a8a8a8;
                    }
                    
                    /* Dark mode scrollbar */
                    .dark .custom-scrollbar::-webkit-scrollbar-track {
                        background: #374151;
                    }
                    
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #6b7280;
                    }
                    
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #9ca3af;
                    }

                    @media print {
                        @page {
                            margin: 0.5in;
                            size: A4;
                        }
                        
                        html, body {
                            height: auto !important;
                            overflow: visible !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        
                        .printable-area, .printable-area * {
                            visibility: visible;
                        }
                        
                        .printable-area {
                            position: static !important;
                            transform: none !important;
                            left: auto !important;
                            top: auto !important;
                            right: auto !important;
                            bottom: auto !important;
                            width: 100% !important;
                            height: auto !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            overflow: visible !important;
                            max-height: none !important;
                            max-width: none !important;
                            box-shadow: none !important;
                            border: none !important;
                        }
                        
                        /* Esconder elementos do modal */
                        [data-radix-portal], 
                        [data-radix-popper-content-wrapper],
                        .fixed,
                        .absolute {
                            position: static !important;
                        }
                        
                        .printable-area, 
                        .printable-area table,
                        .printable-area thead,
                        .printable-area tbody,
                        .printable-area tfoot,
                        .printable-area tr,
                        .printable-area th,
                        .printable-area td,
                        .printable-area div,
                        .printable-area p,
                        .printable-area h1,
                        .printable-area strong {
                            background: #fff !important;
                            color: #000 !important;
                            border-color: #ccc !important;
                        }
                        
                        .printable-area .text-green-600 {
                            color: #059669 !important;
                        }
                        
                        .printable-area thead {
                            background-color: #eee !important;
                        }
                        
                        .printable-area tr {
                            page-break-inside: avoid;
                        }
                        
                        .print-header {
                            text-align: center;
                            margin-bottom: 20px;
                        }
                        
                        .printable-area table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                        }
                        
                        .printable-area th,
                        .printable-area td {
                            border: 1px solid #ccc !important;
                            padding: 8px !important;
                        }
                        
                        /* Mostrar totais apenas na impressão */
                        .printable-area tfoot {
                            display: table-footer-group !important;
                        }
                    }
                `}</style>

                <div className="printable-area print:p-0" id="resumo-print-area">
                    <div className="p-6 pb-2">
                        <div className="print-header">
                            <h1 className="text-2xl font-bold">Relatório de Consignação</h1>
                            <div className="flex justify-around mt-4 text-sm">
                                <p><strong>Vendedor:</strong> {vendedorNome}</p>
                                <p><strong>Data de Referência:</strong> {dataFormatada}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-6 max-h-[55vh] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-6 py-3 w-24 text-center">Imagem</th>
                                    <th scope="col" className="px-6 py-3 text-center">Código</th>
                                    <th scope="col" className="px-6 py-3 text-center">Descrição</th>
                                    <th scope="col" className="px-6 py-3 text-center">Saiu</th>
                                    <th scope="col" className="px-6 py-3 text-center">Voltou</th>
                                    <th scope="col" className="px-6 py-3 text-center text-green-600 font-bold">Vendeu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resumoData.map(item => (
                                    <tr key={item.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="p-4">
                                            <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                                                <CachedImage 
                                                    src={item.imagem_url} 
                                                    alt={item.descricao} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">
                                            {item.codigo}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                                            {item.descricao}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-lg">
                                            {item.saiu}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-lg">
                                            {item.voltou}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-lg text-green text-green-600">
                                            {item.vendeu}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                             <tfoot className="font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 print:table-footer-group hidden">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-base text-right">Totais</td>
                                    <td className="px-6 py-3 text-center text-lg">{totalSaida}</td>
                                    <td className="px-6 py-3 text-center text-lg">{totalRetorno}</td>
                                    <td className="px-6 py-3 text-center text-lg text-green text-green-600 font-bold">{totalVendido}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <DialogFooter className="print:hidden mt-6">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}