'use client';

import { useState } from 'react';
import { Download, Calendar, FileText, RefreshCw, ChevronRight } from 'lucide-react';
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

    const [reportType, setReportType] = useState<ReportType>('DETAILED');
    const [duration, setDuration] = useState<'ALL' | 'MONTH' | 'LAST_MONTH' | 'FY' | 'CUSTOM'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [step, setStep] = useState<1 | 2>(1);

    const resetState = () => {
        setReportType('DETAILED');
        setDuration('ALL');
        setStartDate('');
        setEndDate('');
        setStep(1);
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
                title={`Generate Report - Step ${step} of 2`}
            >
                <div className={styles.modalContent}>
                    {step === 1 && (
                        <div className={styles.section}>
                            <h3 className={styles.stepTitle}>Select Time Period</h3>
                            <p className={styles.stepDesc}>Choose the duration for which you want to generate the statement.</p>

                            <div className={styles.pillGrid}>
                                <button className={duration === 'ALL' ? styles.activePill : ''} onClick={() => setDuration('ALL')}>
                                    <Calendar size={14} /> Full History
                                </button>
                                <button className={duration === 'MONTH' ? styles.activePill : ''} onClick={() => setDuration('MONTH')}>
                                    <Calendar size={14} /> This Month
                                </button>
                                <button className={duration === 'LAST_MONTH' ? styles.activePill : ''} onClick={() => setDuration('LAST_MONTH')}>
                                    <Calendar size={14} /> Last Month
                                </button>
                                <button className={duration === 'FY' ? styles.activePill : ''} onClick={() => setDuration('FY')}>
                                    <Calendar size={14} /> Financial Year
                                </button>
                                <button className={duration === 'CUSTOM' ? styles.activePill : ''} onClick={() => setDuration('CUSTOM')}>
                                    <Calendar size={14} /> Custom Date
                                </button>
                            </div>

                            {duration === 'CUSTOM' && (
                                <div className={styles.dateInputs}>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    <span>to</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            )}

                            <div className={styles.footer}>
                                <button className={styles.cancelBtn} onClick={resetState}>Cancel</button>
                                <button className={styles.generateBtn} onClick={() => setStep(2)}>
                                    Next Step <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.section}>
                            <h3 className={styles.stepTitle}>Choose Report Style</h3>
                            <p className={styles.stepDesc}>Detailed view shows every entry, while summaries group by period.</p>

                            <div className={styles.optionList}>
                                <ReportOption
                                    type="DETAILED"
                                    title="Standard Ledger (Detailed)"
                                    desc="Full chronological list of all individual entries."
                                />
                                <ReportOption
                                    type="SUMMARY_DAY"
                                    title="Day-wise Totals"
                                    desc="Daily summation of given and received amounts."
                                />
                                <ReportOption
                                    type="SUMMARY_MONTH"
                                    title="Monthly Analysis"
                                    desc="Aggregation of transactions grouped by month."
                                />
                                <ReportOption
                                    type="SUMMARY_QUARTER"
                                    title="Quarterly Review"
                                    desc="Financial overview for 3-month cycles (Q1-Q4)."
                                />
                                <ReportOption
                                    type="SUMMARY_FY"
                                    title="Annual Fiscal Report"
                                    desc="High-level performance for the entire financial year."
                                />
                            </div>

                            <div className={styles.footer}>
                                <button className={styles.cancelBtn} onClick={() => setStep(1)}>Back</button>
                                <button className={styles.generateBtn} onClick={handleDownload} disabled={isGenerating}>
                                    {isGenerating ? <RefreshCw size={18} className="spin" /> : <><Download size={18} /> Generate PDF</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
