import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Customer, Transaction } from '../db';

export async function exportToCSV(customers: Customer[], transactions: Transaction[]) {
    const data = transactions.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        return {
            Date: new Date(t.date).toLocaleDateString(),
            Customer: customer?.name || 'Unknown',
            Type: t.type,
            Amount: t.amount,
            Tags: (t.tags || []).join(', '),
            Note: t.note || ''
        };
    });

    const csv = Papa.unparse(data);
    downloadFile(csv, 'ledger_export.csv', 'text/csv');
}

export async function exportToJSON(customers: Customer[], transactions: Transaction[]) {
    const data = { customers, transactions, exportedAt: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), 'ledger_backup.json', 'application/json');
}

export async function exportToExcel(customers: Customer[], transactions: Transaction[]) {
    const data = transactions.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        return {
            Date: new Date(t.date).toLocaleDateString(),
            Customer: customer?.name || 'Unknown',
            Type: t.type,
            Amount: t.amount,
            Tags: (t.tags || []).join(', '),
            Note: t.note || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "ledger_export.xlsx");
}

export async function exportToPDF(customerName: string, transactions: Transaction[]) {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Ledger Report: ${customerName}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.amount.toLocaleString(),
        t.note || ''
    ]);

    (doc as any).autoTable({
        startY: 35,
        head: [['Date', 'Type', 'Amount', 'Note']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] } // Primary color
    });

    doc.save(`${customerName}_ledger.pdf`);
}

function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
