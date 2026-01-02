'use client';

import { useState } from 'react';
import { db, generateId, now, Customer } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { UserPlus, Search, User, ChevronRight, Filter, Edit2, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import { useBook } from '@/context/BookContext';
import styles from './page.module.css';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

export default function CustomersPage() {
  const { activeBook } = useBook();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const customers = useLiveQuery(
    async () => {
      if (!activeBook) return [];
      const all = await db.customers
        .where('bookId')
        .equals(activeBook.id)
        .and(c => c.isDeleted === 0)
        .reverse()
        .sortBy('updatedAt');

      if (!searchQuery) return all;

      const q = searchQuery.toLowerCase();
      return all.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    },
    [searchQuery, activeBook?.id]
  );

  const validateForm = async () => {
    if (name.trim().length < 3) return 'Name must be at least 3 characters';
    if (phone && !/^\d{0,10}$/.test(phone)) return 'Phone number must be digits only and max 10 characters';

    // Check for duplicates
    const duplicate = await db.customers
      .where({ bookId: activeBook?.id, isDeleted: 0 })
      .filter(c =>
        c.name.toLowerCase() === name.trim().toLowerCase() &&
        c.phone === phone.trim() &&
        c.id !== customerToEdit?.id
      )
      .first();

    if (duplicate) return 'A customer with this name and phone already exists in this ledger';

    return null;
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    const error = await validateForm();
    if (error) return alert(error);

    setIsSaving(true);
    try {
      const customerId = customerToEdit?.id || generateId();
      await db.customers.put({
        id: customerId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        bookId: activeBook.id,
        createdAt: customerToEdit?.createdAt || now(),
        updatedAt: now(),
        isDeleted: 0
      });
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const txnCount = await db.transactions.where('customerId').equals(id).and(t => t.isDeleted === 0).count();
    const msg = txnCount > 0
      ? `This customer has ${txnCount} active transactions. Deleting the customer will soft-delete everything. Continue?`
      : 'Are you sure you want to delete this customer?';

    if (confirm(msg)) {
      await db.customers.update(id, { isDeleted: 1, updatedAt: now() });
      // Soft delete all transactions for this customer too
      await db.transactions.where('customerId').equals(id).modify({ isDeleted: 1, updatedAt: now() });
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
            <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
              <UserPlus size={18} /> Add Customer
            </button>
          </div>
        </div>
      </header>

      <div className={styles.searchBar}>
        <div className={styles.searchContainer}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className={styles.filterBtn}><Filter size={20} /></button>
      </div>

      <div className={styles.list}>
        {!customers ? (
          <div className={styles.loading}>Loading...</div>
        ) : customers.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><User size={48} /></div>
            <h3>No Customers Found</h3>
            <p>Add your first customer to start recording transactions.</p>
            <button className={styles.primaryBtn} onClick={() => setIsModalOpen(true)}>Add Customer</button>
          </div>
        ) : (
          customers.map((customer, index) => (
            <div key={customer.id} className={styles.cardContainer}>
              <Link
                href={`/customers/${customer.id}`}
                className={`${styles.customerCard} staggered-reveal`}
                style={{ '--i': index } as React.CSSProperties}
              >
                <div className={styles.avatar}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.info}>
                  <h3>{customer.name}</h3>
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
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={customerToEdit ? 'Edit Customer' : 'Add New Customer'}
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
            {isSaving ? <RefreshCw size={18} className="spin" /> : (customerToEdit ? 'Update Details' : 'Create Customer')}
          </button>
        </form>
      </Modal>
    </div>
  );
}
