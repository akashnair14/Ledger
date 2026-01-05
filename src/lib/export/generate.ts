import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Customer, Transaction, db } from '../db';

export type ReportType = 'DETAILED' | 'SUMMARY_DAY' | 'SUMMARY_MONTH' | 'SUMMARY_QUARTER' | 'SUMMARY_FY';

export async function exportToCSV(customers: Customer[], transactions: Transaction[], variant: 'STANDARD' | 'TALLY' = 'STANDARD') {
    const data = transactions.map(t => {
        const customer = customers.find(c => c.id === t.customerId);
        if (variant === 'TALLY') {
            return {
                Date: new Date(t.date).toLocaleDateString('en-GB'),
                Particulars: customer?.name || 'Unknown',
                VchType: t.type === 'CREDIT' ? 'Sales' : 'Receipt',
                VchNo: t.invoiceNumber || '',
                Debit: t.type === 'CREDIT' ? t.amount : '',
                Credit: t.type === 'PAYMENT' ? t.amount : '',
                Narration: t.note || ''
            };
        }
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
    downloadFile(csv, `ledger_export_${variant.toLowerCase()}.csv`, 'text/csv');
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

export async function generateVoucher(customer: Customer, t: Transaction, balance: number) {
    const doc = new jsPDF();
    await attachBranding(doc);

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Voucher ID: ${t.id.slice(0, 8).toUpperCase()}`, 14, 55);
    doc.text(`Date: ${new Date(t.date).toLocaleString('en-IN')}`, 14, 62);

    doc.setFontSize(10);
    doc.text('Customer Details:', 140, 55);
    doc.setFontSize(12);
    doc.text(customer.name, 140, 62);
    doc.text(customer.phone, 140, 68);

    autoTable(doc, {
        startY: 80,
        head: [['Description', 'Type', 'Mode', 'Amount']],
        body: [[
            t.note || (t.type === 'CREDIT' ? 'Credit Given' : 'Payment Received'),
            t.type === 'CREDIT' ? 'DEBIT' : 'CREDIT',
            t.paymentMode === 'OTHER' ? (t.customPaymentMode || 'Other') : t.paymentMode,
            `INR ${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(14);
    doc.text('Net Balance Status:', 14, finalY);
    doc.text(`${balance >= 0 ? 'DUE' : 'REFUNDABLE'}: INR ${Math.abs(balance).toLocaleString('en-IN')}`, 14, finalY + 10);

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Generated via LedgerManager PWA - Secured & Reliable', 105, 285, { align: 'center' });

    doc.save(`Voucher_${t.id.slice(0, 8)}.pdf`);
}

async function attachBranding(doc: jsPDF) {
    const bizName = (await db.settings.get('business_name'))?.value as string || 'Ledger Manager';
    const bizAddr = (await db.settings.get('business_address'))?.value as string || '';
    const bizLogo = (await db.settings.get('business_logo'))?.value as string || '';

    if (bizLogo) {
        try {
            doc.addImage(bizLogo, 'PNG', 14, 10, 30, 30);
        } catch { }
    }

    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text(bizName, bizLogo ? 50 : 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    if (bizAddr) {
        const splitAddr = doc.splitTextToSize(bizAddr, 100);
        doc.text(splitAddr, bizLogo ? 50 : 14, 28);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 45, 196, 45);
}

export async function exportToPDF(customerName: string, transactions: Transaction[], startDate?: Date, endDate?: Date, reportType: ReportType = 'DETAILED') {
    try {
        const doc = new jsPDF();
        await attachBranding(doc);

        let filtered = transactions;
        if (startDate || endDate) {
            filtered = transactions.filter(t => {
                const d = new Date(t.date);
                if (startDate && d < startDate) return false;
                if (endDate && d > endDate) return false;
                return true;
            });
        }

        if (filtered.length === 0) {
            alert('No transactions found for the selected period.');
            return;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        const titleMap: Record<ReportType, string> = {
            'DETAILED': 'Detailed Account Statement',
            'SUMMARY_DAY': 'Day-wise Summary',
            'SUMMARY_MONTH': 'Monthly Summary',
            'SUMMARY_QUARTER': 'Quarterly Summary',
            'SUMMARY_FY': 'Financial Year Summary'
        };

        doc.text(`${titleMap[reportType]}: ${customerName}`, 14, 55);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 62);

        let tableHead: string[][] = [];
        let tableBody: (string | number)[][] = [];

        if (reportType === 'DETAILED') {
            tableHead = [['Date', 'Mode', 'Debit (Given)', 'Credit (Received)', 'Notes']];
            tableBody = filtered.map(t => [
                new Date(t.date).toLocaleDateString(),
                t.paymentMode,
                t.type === 'CREDIT' ? t.amount.toLocaleString() : '',
                t.type === 'PAYMENT' ? t.amount.toLocaleString() : '',
                t.note || '-'
            ]);
        } else {
            tableHead = [['Period', 'Debit (Given)', 'Credit (Received)', 'Net Balance']];
            const groups: Record<string, { debit: number, credit: number }> = {};

            filtered.forEach(t => {
                const date = new Date(t.date);
                let key = '';

                if (reportType === 'SUMMARY_DAY') {
                    key = date.toLocaleDateString();
                } else if (reportType === 'SUMMARY_MONTH') {
                    key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                } else if (reportType === 'SUMMARY_QUARTER') {
                    const month = date.getMonth(); // 0-indexed
                    const year = date.getFullYear();
                    // Financial Quarter (Apr-Mar cycle)
                    // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
                    if (month >= 3 && month <= 5) key = `Q1 (Apr-Jun) ${year}`;
                    else if (month >= 6 && month <= 8) key = `Q2 (Jul-Sep) ${year}`;
                    else if (month >= 9 && month <= 11) key = `Q3 (Oct-Dec) ${year}`;
                    else key = `Q4 (Jan-Mar) ${year}`;
                } else if (reportType === 'SUMMARY_FY') {
                    const year = date.getFullYear();
                    const month = date.getMonth();
                    const fy = month >= 3 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
                    key = `FY ${fy}`;
                }

                if (!groups[key]) groups[key] = { debit: 0, credit: 0 };
                if (t.type === 'CREDIT') groups[key].debit += t.amount;
                else groups[key].credit += t.amount;
            });

            tableBody = Object.entries(groups).map(([period, data]) => [
                period,
                data.debit.toLocaleString(),
                data.credit.toLocaleString(),
                (data.debit - data.credit).toLocaleString()
            ]);
        }

        autoTable(doc, {
            startY: 70,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [10, 15, 29] }
        });

        doc.save(`${customerName}_statement.pdf`);
    } catch (error) {
        console.error(error);
        alert('PDF Generation Failed');
    }
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
