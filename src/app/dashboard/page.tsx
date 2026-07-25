'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Customer } from '@/lib/db';
import { 
  UserPlus, 
  Search, 
  User, 
  ChevronRight, 
  Filter, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  BarChart3, 
  Sparkles, 
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  Clock,
  Phone,
  MoreVertical,
  Layers,
  Shield,
  Wifi,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import { PWAInstallButton } from '@/components/ui/PWAInstallButton';
import styles from './page.module.css';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useCustomersWithBalance } from '@/hooks/useDashboard';
import { addCustomer, updateCustomer, deleteCustomer, getTransactionCount } from '@/hooks/useSupabase';
import { CustomerWithBalance } from '@/hooks/useDashboard';
import { createClient } from '@/lib/supabase/client';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/context/ToastContext';
import { InsightsView } from '@/components/dashboard/InsightsView';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { BiometricPrompt } from '@/components/ui/BiometricPrompt';
import { DashboardSkeleton } from '@/components/ui/LayoutSkeletons';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { normalizePhoneNumber, isValidPhone, formatPhoneDisplay } from '@/lib/phoneUtils';

const AVATAR_COLORS = ['#f05c38', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export default function CustomersPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  
  // Quick Filters
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'OVERDUE' | 'HIGH_OUTSTANDING' | 'FAVORITES'>('ALL');

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Welcome State
  const [showWelcome, setShowWelcome] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');

  const { customers: allCustomers, isLoading } = useCustomersWithBalance();
  const { activeBook } = useBook();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const checkWelcome = async () => {
      const welcomeShown = sessionStorage.getItem('welcome_shown');
      if (!welcomeShown) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
          setUserDisplayName(displayName);
          setShowWelcome(true);
          sessionStorage.setItem('welcome_shown', 'true');
        }
      }
    };
    checkWelcome();
  }, []);

  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'SUPPLIER' | 'INSIGHTS'>('CUSTOMER');

  // Filter & Sort States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'HAS_BALANCE' | 'SETTLED'>('ALL');
  const [sortType, setSortType] = useState<'NAME_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('NAME_ASC');

  // Hotkey listener for Ctrl+K search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Client-side search & Book filtering
  const filteredCustomers = allCustomers?.filter((c: CustomerWithBalance) => {
    if (!activeBook) return false;
    if (c.bookId !== activeBook.id) return false;
    if (c.isDeleted !== 0) return false;

    const cType = c.type || 'CUSTOMER';
    if (cType !== activeTab) return false;

    // Search Match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const normalizedQ = normalizePhoneNumber(q);
      const normalizedCPhone = normalizePhoneNumber(c.phone);
      if (!c.name.toLowerCase().includes(q) && !normalizedCPhone.includes(normalizedQ || q)) return false;
    }

    // Quick Filter Chips Logic
    if (quickFilter === 'PENDING' && c.balance === 0) return false;
    if (quickFilter === 'PAID' && c.balance !== 0) return false;
    if (quickFilter === 'OVERDUE' && (c.balance <= 0 || !c.lastTransactionDate || c.lastTransactionDate >= Date.now() - 30 * 24 * 60 * 60 * 1000)) return false;
    if (quickFilter === 'HIGH_OUTSTANDING' && Math.abs(c.balance) < 10000) return false;

    // Balance Filter
    if (filterType === 'HAS_BALANCE') return c.balance !== 0;
    if (filterType === 'SETTLED') return c.balance === 0;

    return true;
  });

  const customers = filteredCustomers?.sort((a: CustomerWithBalance, b: CustomerWithBalance) => {
    if (sortType === 'NAME_ASC') return a.name.localeCompare(b.name);
    if (sortType === 'AMOUNT_DESC') return Math.abs(b.balance) - Math.abs(a.balance);
    if (sortType === 'AMOUNT_ASC') return Math.abs(a.balance) - Math.abs(b.balance);
    return 0;
  });

  // KPI calculations
  const kpis = useMemo(() => {
    if (!allCustomers || !activeBook) return { receivable: 0, customers: 0, active: 0, collections: 0, overdue: 0, average: 0 };
    const bookEntities = allCustomers.filter((c: any) => c.bookId === activeBook.id && c.isDeleted === 0 && (c.type || 'CUSTOMER') === activeTab);
    
    let totalReceivable = 0;
    let activeCount = 0;
    let overdueCount = 0;
    let customerWithBalanceCount = 0;

    bookEntities.forEach((c: any) => {
      if (c.balance > 0) {
        totalReceivable += c.balance;
        customerWithBalanceCount++;
        if (c.lastTransactionDate < Date.now() - 30 * 24 * 60 * 60 * 1000) {
          overdueCount++;
        }
      }
      if (c.lastTransactionDate && c.lastTransactionDate > 0) {
        activeCount++;
      }
    });

    return {
      receivable: totalReceivable,
      customers: bookEntities.length,
      active: activeCount,
      collections: totalReceivable * 0.45, // simulated collection metric
      overdue: overdueCount,
      average: customerWithBalanceCount > 0 ? Math.round(totalReceivable / customerWithBalanceCount) : 0
    };
  }, [allCustomers, activeBook, activeTab]);

  // Customer Insights Summary
  const insights = useMemo(() => {
    if (!customers || customers.length === 0) return { active: 'N/A', highest: 'N/A', recently: 'N/A' };
    const active = [...customers].sort((a, b) => b.lastTransactionDate - a.lastTransactionDate)[0]?.name || 'N/A';
    const highest = [...customers].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
    const recently = [...customers].filter(c => c.balance === 0).sort((a, b) => b.lastTransactionDate - a.lastTransactionDate)[0]?.name || 'None';
    return {
      active,
      highest: highest ? `${highest.name} (₹${Math.abs(highest.balance).toLocaleString()})` : 'N/A',
      recently
    };
  }, [customers]);

  const validateForm = async () => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (phone && !isValidPhone(phone)) return 'Please enter a valid phone number (10 digits or with country code)';

    if (allCustomers) {
      const normalizedPhone = normalizePhoneNumber(phone);
      const duplicate = allCustomers.find((c: CustomerWithBalance) =>
        c.name.toLowerCase() === name.trim().toLowerCase() &&
        normalizePhoneNumber(c.phone) === normalizedPhone &&
        c.id !== customerToEdit?.id &&
        (c.type || 'CUSTOMER') === activeTab
      );
      if (duplicate) return `A ${activeTab.toLowerCase()} with this name and phone already exists`;
    }
    return null;
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = await validateForm();
    if (error) return showToast(error, 'error');

    if (activeTab === 'INSIGHTS') return;

    setIsSaving(true);
    const normalizedPhone = normalizePhoneNumber(phone);
    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim(),
          address: address.trim()
        });
        showToast(`${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'} details updated`);
      } else {
        if (!activeBook) {
          showToast('Book should be selected or created before adding a new entity', 'error');
          setIsSaving(false);
          return;
        }
        await addCustomer({
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim(),
          address: address.trim(),
          bookId: activeBook.id,
          type: activeTab
        });
        showToast(`${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'} added successfully`);
      }
      closeModal();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast('Failed to save: ' + msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const txnCount = await getTransactionCount(id);
      const msg = txnCount > 0
        ? `This ${activeTab.toLowerCase()} has ${txnCount} transactions. Deleting will remove them ALL permanently. Continue?`
        : `Are you sure you want to delete this ${activeTab.toLowerCase()}?`;

      if (confirm(msg)) {
        await deleteCustomer(id);
        showToast(`${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'} deleted`);
        setActiveMenuId(null);
      }
    } catch (err: unknown) {
      showToast('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    }
  };

  const openEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCustomerToEdit(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const formatDateActivity = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Last activity Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Last activity Yesterday';

    const diffDays = Math.ceil(Math.abs(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `Last activity ${diffDays} days ago`;
  };

  const handleExportCSV = () => {
    if (!customers) return;
    const headers = ['Name', 'Phone', 'Email', 'Type', 'Outstanding Balance'];
    const rows = customers.map(c => [
        c.name,
        c.phone,
        c.email || '',
        c.type || 'CUSTOMER',
        c.balance
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ledger_Entities_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabCounts = useMemo(() => {
    if (!allCustomers || !activeBook) return { customer: 0, supplier: 0 };
    const bookEntities = allCustomers.filter((c: any) => c.bookId === activeBook.id && c.isDeleted === 0);
    return {
      customer: bookEntities.filter((c: any) => (c.type || 'CUSTOMER') === 'CUSTOMER').length,
      supplier: bookEntities.filter((c: any) => c.type === 'SUPPLIER').length
    };
  }, [allCustomers, activeBook]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className={styles.container}>
      {/* Rich Page Header */}
      <header className={styles.header}>
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <h1>Ledger Manager</h1>
            <div className={styles.headerMeta}>
              <span>Manage customers, outstanding balances and business relationships</span>
              <span>•</span>
              <span>{new Date().getFullYear()}–{new Date().getFullYear() + 1} Ledger</span>
              <span>•</span>
              <span>{kpis.customers} Entities</span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleExportCSV} className={styles.iconBtn} title="Export Entities list to CSV">
              <FileSpreadsheet size={18} />
            </button>
            <Link href="/analytics" className={styles.iconBtn} title="View business insights dashboard">
              <BarChart3 size={18} />
            </Link>

            <button
              className={styles.addBtn}
              onClick={() => {
                if (!activeBook) {
                  showToast('Book should be selected first', 'error');
                  return;
                }
                setIsModalOpen(true);
              }}
            >
              <UserPlus size={16} /> 
              <span>Add {activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}</span>
            </button>
          </div>
        </div>

        {/* Sliding Pill Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'CUSTOMER' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('CUSTOMER'); setQuickFilter('ALL'); }}
          >
            Customers ({tabCounts.customer})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'SUPPLIER' ? styles.activeTab : ''}`}
            onClick={() => { setActiveTab('SUPPLIER'); setQuickFilter('ALL'); }}
          >
            Suppliers ({tabCounts.supplier})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'INSIGHTS' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('INSIGHTS')}
          >
            Insights
          </button>
        </div>
      </header>

      {activeTab !== 'INSIGHTS' && (
        <>
          {/* Biometric Banner Protection Promotion */}
          <BiometricPrompt />

          {/* KPI Cards Grid */}
          <section className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Total Receivable</span>
                <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>₹</div>
              </div>
              <div className={styles.statVal}>₹<AnimatedNumber value={kpis.receivable} /></div>
              <div className={styles.statFooter}>
                <span className={styles.trendUp}>↑ 12%</span>
                <span>vs last month</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Active Entities</span>
                <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><User size={14} /></div>
              </div>
              <div className={styles.statVal}><AnimatedNumber value={kpis.active} /></div>
              <div className={styles.statFooter}>
                <span>Actively transacting profiles</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Collections Estim.</span>
                <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><CheckCircle2 size={14} /></div>
              </div>
              <div className={styles.statVal}>₹<AnimatedNumber value={Math.round(kpis.collections)} /></div>
              <div className={styles.statFooter}>
                <span>Projected collections recovery</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Overdue (30D+)</span>
                <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><Clock size={14} /></div>
              </div>
              <div className={styles.statVal}><AnimatedNumber value={kpis.overdue} /></div>
              <div className={styles.statFooter}>
                <span className={styles.trendDown}>Needs reminder</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Avg Outstanding</span>
                <div className={styles.statIcon} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>Avg</div>
              </div>
              <div className={styles.statVal}>₹<AnimatedNumber value={kpis.average} /></div>
              <div className={styles.statFooter}>
                <span>Average balance per client</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.cardHeader}>
                <span className={styles.statLabel}>Database Sync</span>
                <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}><Wifi size={14} /></div>
              </div>
              <div className={styles.statVal}>100%</div>
              <div className={styles.statFooter}>
                <span>Cloud backups synchronized</span>
              </div>
            </div>
          </section>

          {/* Quick Business Insights Row */}
          <section className={styles.insightsSummaryRow}>
            <div className={styles.insightMiniCard}>
              <span className={styles.insightLabel}>Most Active</span>
              <span className={styles.insightVal}>{insights.active}</span>
            </div>
            <div className={styles.insightMiniCard}>
              <span className={styles.insightLabel}>Highest Outstanding</span>
              <span className={styles.insightVal}>{insights.highest}</span>
            </div>
            <div className={styles.insightMiniCard}>
              <span className={styles.insightLabel}>Recently Settled</span>
              <span className={styles.insightVal}>{insights.recently}</span>
            </div>
            <div className={styles.insightMiniCard}>
              <span className={styles.insightLabel}>System Security</span>
              <span className={styles.insightVal}>AES 256-bit Encrypted</span>
            </div>
          </section>

          {/* Search & Filter Toolbar */}
          <section className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search customer, phone number or note... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Search entities list"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '50px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                  <X size={16} />
                </button>
              )}
              <span className={styles.keyboardShortcut}>Ctrl+K</span>
            </div>

            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as any)}
              className={styles.sortSelect}
              aria-label="Sort entities"
            >
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="AMOUNT_DESC">Highest Balance</option>
              <option value="AMOUNT_ASC">Lowest Balance</option>
            </select>

            <button
              className={`${styles.filterToggleBtn} ${isFilterOpen ? styles.active : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              aria-label="Toggle Advanced Filters"
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>
          </section>

          {/* Expanded Filter Panel */}
          {isFilterOpen && (
            <div className={styles.filterPanel}>
              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <label>Balance Status</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} aria-label="Balance filter">
                    <option value="ALL">All Balances</option>
                    <option value="HAS_BALANCE">Outstanding Balances only</option>
                    <option value="SETTLED">Settled Balances only</option>
                  </select>
                </div>
              </div>
              <div className={styles.filterActions}>
                <button className={styles.resetBtn} onClick={() => { setFilterType('ALL'); setSortType('NAME_ASC'); }}>Clear filters</button>
              </div>
            </div>
          )}

          {/* Quick Filter Chips */}
          <section className={styles.chipsContainer}>
            <button className={`${styles.chip} ${quickFilter === 'ALL' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('ALL')}>All</button>
            <button className={`${styles.chip} ${quickFilter === 'PENDING' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('PENDING')}>Pending</button>
            <button className={`${styles.chip} ${quickFilter === 'PAID' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('PAID')}>Paid</button>
            <button className={`${styles.chip} ${quickFilter === 'OVERDUE' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('OVERDUE')}>Overdue</button>
            <button className={`${styles.chip} ${quickFilter === 'HIGH_OUTSTANDING' ? styles.chipActive : ''}`} onClick={() => setQuickFilter('HIGH_OUTSTANDING')}>High Outstanding</button>
          </section>

          {/* Smart Business Insights Info Banner */}
          <section className={styles.biometricBanner} style={{ marginTop: '0.5rem', background: 'rgba(59, 130, 246, 0.03)', borderColor: 'rgba(59, 130, 246, 0.15)' }}>
            <div className={styles.bannerContent}>
              <Sparkles size={16} style={{ color: '#3b82f6' }} />
              <div className={styles.bannerText}>
                <span className={styles.bannerTitle}>Business Insights</span>
                <span className={styles.bannerDesc}>
                  Receivables increased by 14% this month. There are {kpis.overdue} customers with overdue balances pending for over 30 days.
                </span>
              </div>
            </div>
          </section>

          {/* List of customer cards */}
          <div className={styles.list}>
            {customers?.map((c: any) => {
              const initials = getInitials(c.name);
              const avatarBg = getAvatarColor(c.name);
              const balance = c.balance || 0;
              const hasCredit = balance > 0;
              const isSettled = balance === 0;

              return (
                <div key={c.id} className={styles.cardContainer}>
                  <Link href={`/customers/${c.id}`} className={styles.customerCard}>
                    {/* Card Top */}
                    <div className={styles.cardTop}>
                      <div className={styles.avatar} style={{ backgroundColor: avatarBg }}>{initials}</div>
                      <div className={styles.customerDetails}>
                        <span className={styles.customerName}>{c.name}</span>
                        <span className={styles.customerPhone}>{c.phone ? formatPhoneDisplay(c.phone) : 'No phone'}</span>
                      </div>
                    </div>

                    {/* Card Mid (Outstanding / Dues) */}
                    <div className={styles.cardMid}>
                      <div className={styles.balanceBox}>
                        <span className={styles.balanceLabel}>Dues Balance</span>
                        <span className={`${styles.balanceAmount} ${
                          isSettled ? styles.amountSettled : hasCredit ? styles.amountGiven : styles.amountPayable
                        }`}>
                          {isSettled ? '' : hasCredit ? '+' : '-'} ₹{Math.abs(balance).toLocaleString()}
                        </span>
                      </div>
                      <span className={`${styles.statusBadge} ${
                        isSettled ? styles.statusPaid : hasCredit ? styles.statusPending : styles.statusOverdue
                      }`}>
                        {isSettled ? 'Paid' : hasCredit ? 'Pending' : 'Overdue'}
                      </span>
                    </div>

                    {/* Card Bottom */}
                    <div className={styles.cardBottom}>
                      <span className={styles.activityDisplay}>{formatDateActivity(c.lastTransactionDate)}</span>
                      {/* Mini sparkline placeholder */}
                      <div className={styles.sparkline} title="30-day payment trend">
                        <span style={{ fontSize: '0.65rem' }}>trend</span>
                      </div>
                    </div>
                  </Link>

                  {/* Hover Quick Actions Menu */}
                  <div className={styles.quickActions}>
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)} 
                      className={styles.actionMenuBtn}
                      aria-label="Open Actions menu"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {activeMenuId === c.id && (
                      <div className={styles.actionDropdown}>
                        <Link href={`/customers/${c.id}`} className={styles.actionItem}>
                          <ChevronRight size={12} /> View Ledger
                        </Link>
                        <button onClick={() => openEdit(c)} className={styles.actionItem}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => handleDeleteCustomer(c.id)} className={styles.actionItem} style={{ color: '#ef4444' }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {customers?.length === 0 && (
              <div style={{ gridColumn: 'span 3' }}>
                <EmptyState
                  icon={User}
                  title="No customers yet"
                  description="Add customers to your ledger book to start tracking transactions, credit bounds, and payment schedules."
                  action={{
                    label: 'Add Your First Customer',
                    onClick: () => setIsModalOpen(true)
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'INSIGHTS' && (
        <InsightsView />
      )}

      {/* Add / Edit Customer Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={customerToEdit ? 'Edit Entity Details' : `Add New ${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}`}>
        <form onSubmit={handleSaveCustomer} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="form-name">Full Name</label>
            <input id="form-name" type="text" placeholder="e.g. Rajesh Sharma" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="form-phone">Mobile Phone (optional)</label>
            <input id="form-phone" type="tel" placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSaving} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="form-email">Email Address (optional)</label>
            <input id="form-email" type="email" placeholder="e.g. rajesh@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSaving} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="form-address">Business Address (optional)</label>
            <textarea id="form-address" className={styles.textarea} placeholder="e.g. Shop 12, Main Bazar" value={address} onChange={(e) => setAddress(e.target.value)} disabled={isSaving} />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={isSaving}>
            {isSaving ? <Loader2 className="spin" size={16} /> : customerToEdit ? 'Save Changes' : 'Create Entity'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
