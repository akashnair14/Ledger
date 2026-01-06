'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/db';
import { UserPlus, Search, User, ChevronRight, Filter, Edit2, Trash2, RefreshCw, BarChart3, Sparkles, CheckCircle2 } from 'lucide-react';
import { PWAInstallButton } from '@/components/ui/PWAInstallButton';
import styles from './page.module.css';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useCustomersWithBalance } from '@/hooks/useDashboard';
import { addCustomer, updateCustomer, deleteCustomer, getTransactionCount } from '@/hooks/useSupabase';
import { createClient } from '@/lib/supabase/client';
import { useBook } from '@/context/BookContext';
import { useToast } from '@/context/ToastContext';
import { InsightsView } from '@/components/dashboard/InsightsView';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CustomersPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

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

  // Client-side search & Book filtering
  const customers = allCustomers?.filter(c => {
    // Book Filter - must match active book
    if (!activeBook) return false;
    if (c.bookId !== activeBook.id) return false;

    // Type Filter
    const cType = c.type || 'CUSTOMER'; // Default for old data
    if (cType !== activeTab) return false;

    // Search Match
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const validateForm = async () => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (phone && !/^\d{0,10}$/.test(phone)) return 'Phone number must be digits only and max 10 characters';

    // Check for duplicates
    if (allCustomers) {
      const duplicate = allCustomers.find(c =>
        c.name.toLowerCase() === name.trim().toLowerCase() &&
        c.phone === phone.trim() &&
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
    if (error) return alert(error);

    if (activeTab === 'INSIGHTS') return;

    setIsSaving(true);
    try {
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim()
        });
        showToast(`${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'} details updated`);
      } else {
        if (!activeBook) {
          alert('book should be selected or created before adding new entity');
          setIsSaving(false);
          return;
        }
        await addCustomer({
          name: name.trim(),
          phone: phone.trim(),
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
      const msg = (err as any)?.message || (err instanceof Error ? err.message : 'Unknown error');
      alert('Failed to save: ' + msg);
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
      }
    } catch (err: unknown) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const openEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCustomerToEdit(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.topBar}>
          <h1>Ledger Manager</h1>
          <div className={styles.headerActions}>
            <Link href="/analytics" className={styles.iconBtn} title="View Analytics">
              <BarChart3 size={20} />
            </Link>

            {activeTab === 'CUSTOMER' && (
              <button
                className={styles.addBtn}
                onClick={() => {
                  if (!activeBook) {
                    alert('Book should be selected first');
                    return;
                  }
                  setIsModalOpen(true);
                }}
              >
                <UserPlus size={18} /> Add Customer
              </button>
            )}

            {activeTab === 'SUPPLIER' && (
              <button
                className={styles.addBtn}
                onClick={() => {
                  if (!activeBook) {
                    alert('Book should be selected first');
                    return;
                  }
                  setIsModalOpen(true);
                }}
              >
                <UserPlus size={18} /> Add Supplier
              </button>
            )}

          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'CUSTOMER' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('CUSTOMER')}
          >
            Customers
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'SUPPLIER' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('SUPPLIER')}
          >
            Suppliers
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'INSIGHTS' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('INSIGHTS')}
          >
            Insights
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <PWAInstallButton />

        {activeTab === 'INSIGHTS' ? (
          <InsightsView />
        ) : (
          <>
            <div className={styles.searchBar}>
              <div className={styles.searchContainer}>
                <Search size={20} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab === 'CUSTOMER' ? 'customers' : 'suppliers'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className={styles.filterBtn}><Filter size={20} /></button>
            </div>

            <div className={styles.list}>
              {isLoading ? (
                <div className={styles.loading}>Loading...</div>
              ) : !customers || !customers.length ? (
                <EmptyState
                  icon={activeTab === 'CUSTOMER' ? User : UserPlus}
                  title={`No ${activeTab === 'CUSTOMER' ? 'Customers' : 'Suppliers'} Found`}
                  description={`Add your first ${activeTab.toLowerCase()} to keep track of balances.`}
                  action={{
                    label: `Add ${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}`,
                    onClick: () => {
                      if (!activeBook) {
                        alert('Book should be selected first');
                        return;
                      }
                      setIsModalOpen(true);
                    }
                  }}
                />
              ) : (
                <AnimatePresence>
                  {customers.map((customer, index) => (
                    <motion.div
                      key={customer.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      className={styles.cardContainer}
                    >
                      <Link
                        href={`/customers/${customer.id}`}
                        className={styles.customerCard}
                      >
                        <div className={styles.avatar}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.info}>
                          <div className={styles.nameRow}>
                            <h3>{customer.name}</h3>
                            <span className={`${styles.balanceBadge} ${customer.balance === 0
                              ? styles.neutralVar
                              : (activeTab === 'CUSTOMER'
                                ? (customer.balance > 0 ? styles.positiveVar : styles.negativeVar)
                                : (customer.balance > 0 ? styles.negativeVar : styles.positiveVar)
                              )
                              }`}>
                              {customer.balance === 0 ? '₹0' : (customer.balance > 0 ? '₹' + customer.balance.toLocaleString() : '₹' + Math.abs(customer.balance).toLocaleString())}
                            </span>
                          </div>
                          <p>{customer.phone}</p>
                        </div>
                        <div className={styles.customerMeta}>
                          <ChevronRight size={20} className={styles.chevron} />
                        </div>
                      </Link>
                      <div className={styles.cardActions}>
                        <button onClick={() => openEdit(customer)}><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteCustomer(customer.id)}><Trash2 size={16} /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </main>

      {/* Customer Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={customerToEdit ? `Edit ${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}` : `Add New ${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}`}
      >
        <form onSubmit={handleSaveCustomer} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe (min 3 chars)"
              required
              autoFocus
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Phone Number (Optional - Max 10 digits)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="e.g. 9876543210"
              maxLength={10}
              inputMode="tel"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Email Address (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Address (Optional)</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address here..."
              className={styles.textarea}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={isSaving}>
            {isSaving ? <RefreshCw size={18} className="spin" /> : (customerToEdit ? 'Update Details' : `Create ${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}`)}
          </button>
        </form>
      </Modal>

      {/* Welcome Message Modal */}
      <Modal
        isOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
        title=""
      >
        <div className={styles.welcomeContent}>
          <div className={styles.welcomeIconBox}>
            <Sparkles size={40} />
          </div>
          <div className={styles.welcomeText}>
            <h2>Welcome Back, {userDisplayName}!</h2>
            <p>Your financial records are synchronized and ready. Let&apos;s manage your ledger with precision.</p>
          </div>
          <div className={styles.welcomeActions}>
            <button className={styles.startBtn} onClick={() => setShowWelcome(false)}>
              Get Started <ChevronRight size={20} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', color: 'var(--success)', fontWeight: 'bold', fontSize: '0.8rem' }}>
            <CheckCircle2 size={16} /> Secure Ledger Session Active
          </div>
        </div>
      </Modal>
    </div >
  );
}
