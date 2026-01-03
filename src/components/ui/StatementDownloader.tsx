'use client';

import { useState } from 'react';
import { Download, Calendar, FileText, RefreshCw, X, ChevronRight, PieChart } from 'lucide-react';
import { exportToPDF, ReportType } from '@/lib/export/generate';
import { Transaction } from '@/lib/db';
import { Modal } from '@/components/ui/Modal';
import styles from './StatementDownloader.module.css';

interface StatementDownloaderProps {
    customerName: string;
    transactions: Transaction[];
}

export const StatementDownloader = ({ customerName, transactions }: StatementDownloaderProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Report Configuration State
    const [reportType, setReportType] = useState<ReportType>('DETAILED');
    const [duration, setDuration] = useState<'ALL' | 'MONTH' | 'LAST_MONTH' | 'FY' | 'CUSTOM'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const resetState = () => {
        setReportType('DETAILED');
        setDuration('ALL');
        setStartDate('');
        setEndDate('');
        setIsOpen(false);
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            let start: Date | undefined;
            let end: Date | undefined;
            const now = new Date();

            if (duration === 'MONTH') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (duration === 'LAST_MONTH') {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            } else if (duration === 'FY') {
                const currentMonth = now.getMonth();
                const startYear = currentMonth >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                start = new Date(startYear, 3, 1); // April 1st
                end = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st
            } else if (duration === 'CUSTOM') {
                if (!startDate || !endDate) {
                    alert('Please select both start and end dates');
                    setIsGenerating(false);
                    return;
                }
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59);
            }
            // For ALL, start and end remain undefined, which is correct.

            await exportToPDF(customerName, transactions, start, end, reportType);
            resetState();
        } catch (error) {
            console.error(error);
            alert('An error occurred while generating the report.');
        } finally {
            setIsGenerating(false);
        }
    };

    const ReportOption = ({ type, title, desc }: { type: ReportType, title: string, desc: string }) => (
        <div
            className={`${styles.reportOption} ${reportType === type ? styles.activeOption : ''}`}
            onClick={() => setReportType(type)}
        >
            <div className={styles.radioOuter}>
                {reportType === type && <div className={styles.radioInner} />}
            </div>
            <div className={styles.optionContent}>
                <span className={styles.optionTitle}>{title}</span>
                <span className={styles.optionDesc}>{desc}</span>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            <button className={styles.mainBtn} onClick={() => setIsOpen(true)} disabled={isGenerating}>
                {isGenerating ? (
                    <>
                        <RefreshCw size={18} className="spin" />
                        <span>Generating...</span>
                    </>
                ) : (
                    <>
                        <FileText size={18} />
                        <span>Generate Report</span>
                    </>
                )}
            </button>

            <Modal
                isOpen={isOpen}
                onClose={resetState}
                title="Generate Report"
            >
                <div className={styles.modalContent}>
                    {/* Duration Section */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>Report Duration</label>
                        <div className={styles.pillGrid}>
                            <button className={duration === 'ALL' ? styles.activePill : ''} onClick={() => setDuration('ALL')}>All Time</button>
                            <button className={duration === 'MONTH' ? styles.activePill : ''} onClick={() => setDuration('MONTH')}>This Month</button>
                            <button className={duration === 'LAST_MONTH' ? styles.activePill : ''} onClick={() => setDuration('LAST_MONTH')}>Last Month</button>
                            <button className={duration === 'FY' ? styles.activePill : ''} onClick={() => setDuration('FY')}>Financial Year</button>
                            <button className={duration === 'CUSTOM' ? styles.activePill : ''} onClick={() => setDuration('CUSTOM')}>Custom</button>
                        </div>

                        {duration === 'CUSTOM' && (
                            <div className={styles.dateInputs}>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span>to</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        )}
                    </div>

                    {/* Report Type Section */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>Report Type</label>
                        <div className={styles.optionList}>
                            <ReportOption
                                type="DETAILED"
                                title="All Entries (Detailed)"
                                desc="List of all individual transactions with full details."
                            />
                            <ReportOption
                                type="SUMMARY_DAY"
                                title="Day-wise Summary"
                                desc="Total given & received aggregated by day."
                            />
                            <ReportOption
                                type="SUMMARY_MONTH"
                                title="Monthly Summary"
                                desc="Income & expense summary grouped by month."
                            />
                            <ReportOption
                                type="SUMMARY_QUARTER"
                                title="Quarterly Summary"
                                desc="Financial performance grouped by quarters (Q1-Q4)."
                            />
                            <ReportOption
                                type="SUMMARY_FY"
                                title="Financial Year Summary"
                                desc="Yearly performance based on Apr-Mar cycle."
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className={styles.footer}>
                        <button className={styles.cancelBtn} onClick={resetState}>Cancel</button>
                        <button className={styles.generateBtn} onClick={handleDownload} disabled={isGenerating}>
                            {isGenerating ? <RefreshCw size={18} className="spin" /> : <><Download size={18} /> Generate PDF</>}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
