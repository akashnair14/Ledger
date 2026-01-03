import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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

export async function exportToPDF(customerName: string, transactions: Transaction[], startDate?: Date, endDate?: Date, reportType: ReportType = 'DETAILED') {
    try {
        const doc = new jsPDF();

        // 1. Filter by date if provided
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

        // 2. Fetch Branding
        const bizName = (await db.settings.get('business_name'))?.value || 'Ledger Manager';
        const bizAddr = (await db.settings.get('business_address'))?.value || '';
        const bizLogo = (await db.settings.get('business_logo'))?.value || '';

        // Header Section
        if (bizLogo) {
            try {
                doc.addImage(bizLogo, 'PNG', 14, 10, 30, 30);
            } catch (e) {
                console.warn('Logo failed to load', e);
                // Don't crash on logo failure
            }
        }

        doc.setFontSize(22);
        doc.setTextColor(10, 15, 29); // var(--primary-rgb)
        doc.text(bizName, bizLogo ? 50 : 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        if (bizAddr) {
            const splitAddr = doc.splitTextToSize(bizAddr, 100);
            doc.text(splitAddr, bizLogo ? 50 : 14, 28);
        }

        doc.setDrawColor(200);
        doc.line(14, 45, 196, 45);

        // 3. Report Title & Info
        doc.setFontSize(14);
        doc.setTextColor(0);

        const titleMap: Record<ReportType, string> = {
            'DETAILED': 'Detailed Account Statement',
            'SUMMARY_DAY': 'Day-wise Transaction Summary',
            'SUMMARY_MONTH': 'Monthly Transaction Summary',
            'SUMMARY_QUARTER': 'Quarterly Transaction Summary',
            'SUMMARY_FY': 'Financial Year Summary'
        };

        doc.text(`${titleMap[reportType]}: ${customerName}`, 14, 55);
        doc.setFontSize(10);

        const periodText = startDate && endDate
            ? `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
            : 'Period: All Transactions';

        doc.text(periodText, 14, 62);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 62);

        // 4. Data Processing & Aggregation
        let tableHead: string[][] = [];
        let tableBody: (string | number)[][] = [];
        let colStyles: any = {};

        if (reportType === 'DETAILED') {
            tableHead = [['Date', 'Mode', 'Given (Debit)', 'Received (Credit)', 'Notes']];
            tableBody = filtered.map(t => [
                new Date(t.date).toLocaleDateString(),
                t.paymentMode === 'OTHER' ? (t.customPaymentMode || 'Other') : t.paymentMode,
                t.type === 'CREDIT' ? t.amount.toLocaleString() : '',
                t.type === 'PAYMENT' ? t.amount.toLocaleString() : '',
                t.note || '-'
            ]);
            colStyles = { 2: { halign: 'right' }, 3: { halign: 'right' } };
        } else {
            // Aggregation Logic
            const groups: Record<string, { label: string, given: number, received: number, count: number, sortKey: number }> = {};

            filtered.forEach(t => {
                const date = new Date(t.date);
                if (isNaN(date.getTime())) return; // Skip invalid dates

                let key = '';
                let label = '';
                let sortKey = date.getTime();

                try {
                    if (reportType === 'SUMMARY_DAY') {
                        key = date.toISOString().split('T')[0];
                        label = date.toLocaleDateString();
                    } else if (reportType === 'SUMMARY_MONTH') {
                        key = `${date.getFullYear()}-${date.getMonth()}`;
                        label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                        sortKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
                    } else if (reportType === 'SUMMARY_QUARTER') {
                        const q = Math.floor(date.getMonth() / 3) + 1;
                        key = `${date.getFullYear()}-Q${q}`;
                        label = `Q${q} ${date.getFullYear()}`;
                        sortKey = new Date(date.getFullYear(), (q - 1) * 3, 1).getTime();
                    } else if (reportType === 'SUMMARY_FY') {
                        const month = date.getMonth();
                        const year = date.getFullYear();
                        const fyStart = month >= 3 ? year : year - 1;
                        key = `FY-${fyStart}`;
                        label = `FY ${fyStart}-${fyStart + 1}`;
                        sortKey = fyStart;
                    }
                } catch (e) {
                    // Fallback or skip
                    return;
                }

                if (!groups[key]) {
                    groups[key] = { label, given: 0, received: 0, count: 0, sortKey };
                }

                if (t.type === 'CREDIT') groups[key].given += (Number(t.amount) || 0);
                else groups[key].received += (Number(t.amount) || 0);
                groups[key].count++;
            });

            // Convert to array and sort
            const sortedGroups = Object.values(groups).sort((a, b) => a.sortKey - b.sortKey);

            tableHead = [['Period / Date', 'Transactions', 'Total Given', 'Total Received', 'Net Balance']];
            tableBody = sortedGroups.map(g => {
                const net = g.given - g.received; // Net Debt (Positive = You get, Negative = You give)
                return [
                    g.label,
                    g.count,
                    g.given.toLocaleString(),
                    g.received.toLocaleString(),
                    `${net >= 0 ? 'Dr' : 'Cr'} ${Math.abs(net).toLocaleString()}`
                ];
            });
            colStyles = { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } };
        }

        // 5. Render Table
        (doc as any).autoTable({
            startY: 70,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [10, 15, 29], textColor: 255, fontSize: 10, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: colStyles,
            margin: { top: 70 }
        });

        // 6. Final Summary Footer
        // Use a safe accessor for finalY
        const lastTable = (doc as any).lastAutoTable;
        let finalY = 150;
        if (lastTable && lastTable.finalY) {
            finalY = lastTable.finalY + 10;
        }

        const totalCredit = filtered.filter(t => t.type === 'CREDIT').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const totalPayment = filtered.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const netBalance = totalCredit - totalPayment;

        doc.setFontSize(10);
        doc.text('Overall Summary', 140, finalY);
        doc.line(140, finalY + 2, 196, finalY + 2);

        doc.text('Total Given:', 140, finalY + 10);
        doc.text(`+ ₹${totalCredit.toLocaleString()}`, 196, finalY + 10, { align: 'right' });

        doc.text('Total Received:', 140, finalY + 18);
        doc.text(`- ₹${totalPayment.toLocaleString()}`, 196, finalY + 18, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Net Balance:', 140, finalY + 28);
        doc.setTextColor(netBalance > 0 ? 127 : 6, netBalance > 0 ? 29 : 95, netBalance > 0 ? 29 : 70);
        doc.text(`${netBalance >= 0 ? 'To Receiver' : 'To Pay'} ₹${Math.abs(netBalance).toLocaleString()}`, 196, finalY + 28, { align: 'right' });

        doc.save(`${customerName}_${reportType.toLowerCase()}_report.pdf`);
    } catch (error) {
        console.error('PDF Generation Failed:', error);
        alert('Failed to generate PDF. Please try again.');
        throw error;
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
