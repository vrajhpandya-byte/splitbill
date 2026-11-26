import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight, ArrowRight, Bell, CalendarDays, Check,
  ChevronDown, CircleHelp, Compass, CreditCard, Ellipsis, Filter, LayoutDashboard,
  Link2, LogOut, Menu, Plus, Receipt, Search, Settings, ShoppingBag, Sparkles, Trash2,
  TrendingUp, UserMinus, UserPlus, Users, Wallet, X, Utensils, CarFront, BedDouble, Pencil, type LucideIcon,
} from 'lucide-react'
import { useGroups } from './hooks/useGroups'
import {
  calculateBalances, calculateSettlementPlan, formatCurrency, getExpenseTotal,
  splitByPercentage, splitEqually, splitWithAmounts,
} from './utils/calculations'
import type { Expense, ExpenseCategory, Group, GroupType, Member, Page, SettlementSuggestion, SplitType } from './types'

const categoryIcons: Record<ExpenseCategory, LucideIcon> = {
  Food: Utensils, Stay: BedDouble, Transport: CarFront, Shopping: ShoppingBag,
  Activities: Sparkles, Bills: Receipt, Other: Ellipsis,
}
const categoryColors: Record<ExpenseCategory, string> = {
  Food: 'mint', Stay: 'peach', Transport: 'blue', Shopping: 'lavender',
  Activities: 'yellow', Bills: 'slate', Other: 'mint',
}
const ACTIVE_GROUP_STORAGE_KEY = 'splitbill-demo-active-group-v1'
const navItems: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'groups', label: 'Your groups', icon: Users },
  { id: 'balances', label: 'Balances', icon: ArrowLeftRight },
  { id: 'activity', label: 'Expense history', icon: Receipt },
]

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function Avatar({ member, size = 'normal' }: { member: Member; size?: 'normal' | 'small' }) {
  return <span className={`avatar ${size === 'small' ? 'avatar-small' : ''}`} style={{ backgroundColor: member.color }} title={member.name}>{initials(member.name)}</span>
}

function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        <div className="modal-heading"><h2 id="modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {children}
      </section>
    </div>
  )
}

function App() {
  const { groups, setGroups, resetDemo } = useGroups()
  const [activeGroupId, setActiveGroupId] = useState(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_GROUP_STORAGE_KEY)
      return savedId && groups.some((group) => group.id === savedId) ? savedId : groups[0]?.id ?? ''
    } catch (error) {
      console.error('Could not load the active demo group.', error)
      return groups[0]?.id ?? ''
    }
  })
  const [page, setPage] = useState<Page>('overview')
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [joiningGroup, setJoiningGroup] = useState<Group | null>(null)
  const [inviteUnavailable, setInviteUnavailable] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [toast, setToast] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [memberFilter, setMemberFilter] = useState('All members')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const lastSettlementActionAt = useRef(0)

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0]
  const balances = useMemo(() => activeGroup
    ? calculateBalances(activeGroup.expenses, activeGroup.settlements)
    : {}, [activeGroup])
  const settlementPlan = useMemo(() => calculateSettlementPlan(balances), [balances])
  const filteredExpenses = useMemo(() => {
    if (!activeGroup) return []
    return [...activeGroup.expenses]
      .filter((expense) => categoryFilter === 'All categories' || expense.category === categoryFilter)
      .filter((expense) => memberFilter === 'All members' || expense.payerId === memberFilter || memberFilter in expense.shares)
      .filter((expense) => !dateFrom || expense.date >= dateFrom)
      .filter((expense) => !dateTo || expense.date <= dateTo)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [activeGroup, categoryFilter, memberFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!groups.some((group) => group.id === activeGroupId)) return
    try {
      localStorage.setItem(ACTIVE_GROUP_STORAGE_KEY, activeGroupId)
    } catch (error) {
      console.error('Could not save the active demo group.', error)
    }
  }, [activeGroupId, groups])

  useEffect(() => {
    const inviteCode = window.location.pathname.match(/^\/join\/([^/]+)\/?$/)?.[1]
    if (!inviteCode) return
    const invitedGroup = groups.find((group) => group.inviteCode === decodeURIComponent(inviteCode))
    if (invitedGroup) {
      setJoiningGroup(invitedGroup)
      setActiveGroupId(invitedGroup.id)
    } else {
      setInviteUnavailable(true)
    }
  }, [groups])

  if (!activeGroup) {
    return <main className="empty-start"><span className="brand-mark"><Wallet size={23} /></span><h1>Your next trip, minus the math.</h1><p>Create your first group to start sharing expenses.</p><button className="button button-primary" onClick={() => setShowGroupModal(true)}><Plus size={17} /> Create a group</button>{showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} onCreate={(group) => { setGroups([group]); setActiveGroupId(group.id); setShowGroupModal(false) }} />}</main>
  }

  const addExpense = () => { setEditingExpense(null); setShowExpenseModal(true) }
  const openEditExpense = (expense: Expense) => { setEditingExpense(expense); setShowExpenseModal(true) }
  const saveExpense = (expense: Expense) => {
    setGroups((previous) => previous.map((group) => group.id !== activeGroup.id ? group : {
      ...group,
      expenses: editingExpense
        ? group.expenses.map((item) => item.id === expense.id ? expense : item)
        : [expense, ...group.expenses],
    }))
    setShowExpenseModal(false)
    setEditingExpense(null)
    setToast(editingExpense ? 'Expense updated' : 'Expense added to your group')
  }
  const deleteExpense = (expense: Expense) => {
    if (!window.confirm(`Delete “${expense.description}”? This cannot be undone.`)) return
    setGroups((previous) => previous.map((group) => group.id === activeGroup.id
      ? { ...group, expenses: group.expenses.filter((item) => item.id !== expense.id) }
      : group))
    setToast('Expense deleted')
  }
  const createGroup = (group: Group) => {
    setGroups((previous) => [...previous, group])
    setActiveGroupId(group.id)
    setPage('overview')
    setShowGroupModal(false)
    setToast(`${group.name} is ready to go`)
  }
  const copyInvite = async (group: Group) => {
    const url = `${window.location.origin}/join/${group.inviteCode}`
    try {
      await navigator.clipboard.writeText(url)
      setToast('Invite link copied — send it to your group')
    } catch (error) {
      console.error('Could not copy invite link.', error)
      window.prompt('Copy your invite link', url)
    }
  }
  const completeSettlement = (suggestion: SettlementSuggestion, clickCount = 1) => {
    const now = Date.now()
    if (clickCount > 1 || now - lastSettlementActionAt.current < 500) return
    const isCurrentSuggestion = settlementPlan.some((item) =>
      item.fromMemberId === suggestion.fromMemberId
      && item.toMemberId === suggestion.toMemberId
      && Math.round(item.amount * 100) === Math.round(suggestion.amount * 100))
    if (!isCurrentSuggestion) return

    lastSettlementActionAt.current = now
    const settlement = {
      id: crypto.randomUUID(),
      fromMemberId: suggestion.fromMemberId,
      toMemberId: suggestion.toMemberId,
      amount: suggestion.amount,
      completedAt: new Date().toISOString(),
    }
    setGroups((previous) => previous.map((group) => group.id !== activeGroup.id ? group : {
      ...group,
      settlements: calculateSettlementPlan(calculateBalances(group.expenses, group.settlements)).some((item) =>
        item.fromMemberId === suggestion.fromMemberId
        && item.toMemberId === suggestion.toMemberId
        && Math.round(item.amount * 100) === Math.round(suggestion.amount * 100))
        ? [...group.settlements, settlement]
        : group.settlements,
    }))
    setToast('Payment marked as settled')
  }
  const addGroupMember = (group: Group, name: string) => {
    if (group.members.some((member) => member.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setToast('A member with that name is already in this group')
      return
    }
    const colors = ['#b5c9ad', '#e9c2a8', '#bbc8df', '#dfb9c9', '#d2c8a9', '#b6d4ce', '#d2c1e3']
    const member: Member = { id: crypto.randomUUID(), name, color: colors[group.members.length % colors.length] }
    setGroups((previous) => previous.map((item) => item.id === group.id ? { ...item, members: [...item.members, member] } : item))
    setToast(`${name} added to ${group.name}`)
  }
  const removeGroupMember = (group: Group, member: Member) => {
    if (member.id === group.members[0]?.id) {
      setToast('The group owner cannot be removed')
      return
    }
    const hasHistory = group.expenses.some((expense) => expense.payerId === member.id || member.id in expense.shares)
      || group.settlements.some((settlement) => settlement.fromMemberId === member.id || settlement.toMemberId === member.id)
    if (hasHistory) {
      setToast('Remove this member’s expenses and settlements before removing them')
      return
    }
    if (!window.confirm(`Remove ${member.name} from ${group.name}?`)) return
    setGroups((previous) => previous.map((item) => item.id === group.id
      ? { ...item, members: item.members.filter((candidate) => candidate.id !== member.id) }
      : item))
    setToast(`${member.name} removed from ${group.name}`)
  }
  const joinGroup = (group: Group, name: string) => {
    const colors = ['#b5c9ad', '#e9c2a8', '#bbc8df', '#dfb9c9', '#d2c8a9', '#b6d4ce', '#d2c1e3']
    const member: Member = { id: crypto.randomUUID(), name, color: colors[group.members.length % colors.length] }
    setGroups((previous) => previous.map((item) => item.id === group.id ? { ...item, members: [...item.members, member] } : item))
    setActiveGroupId(group.id)
    setPage('overview')
    setJoiningGroup(null)
    window.history.replaceState(null, '', '/')
    setToast(`Welcome to ${group.name}`)
  }
  const dismissUnavailableInvite = () => {
    setInviteUnavailable(false)
    window.history.replaceState(null, '', '/')
  }
  const switchPage = (nextPage: Page) => { setPage(nextPage); setMobileMenuOpen(false) }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); switchPage('overview') }}>
          <span className="brand-mark"><Wallet size={22} strokeWidth={2.2} /></span><span className="brand-name">split<span>bill</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch" onClick={() => setPage('groups')}>
          <span className="workspace-icon"><Compass size={17} /></span><span className="workspace-text"><strong>Weekend crew</strong><small>Personal space</small></span><ChevronDown size={15} />
        </button>
        <div className="side-nav">
          <div className="nav-caption">MENU</div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => switchPage(id)} className={`nav-link ${page === id ? 'nav-active' : ''}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'balances' && settlementPlan.length > 0 && <span className="nav-dot" />}
            </button>
          ))}
          <div className="nav-caption groups-caption">YOUR GROUPS <button aria-label="Create group" onClick={() => setShowGroupModal(true)}><Plus size={15} /></button></div>
          {groups.slice(0, 4).map((group) => (
            <button key={group.id} className={`group-nav-link ${group.id === activeGroup.id ? 'group-nav-active' : ''}`} onClick={() => { setActiveGroupId(group.id); switchPage('overview') }}>
              <span className={`group-dot group-dot-${group.type.toLowerCase()}`} /><span>{group.name}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={16} /></span><strong>Good trips, less math.</strong><p>Invite your favorite people and keep every little cost together.</p><button onClick={() => copyInvite(activeGroup)}>Invite your crew <ArrowRight size={14} /></button></div>
          <button className={`nav-link ${page === 'settings' ? 'nav-active' : ''}`} onClick={() => switchPage('settings')}><Settings size={18} /><span>Settings</span></button>
          <div className="profile-row"><span className="profile-avatar">MC</span><span className="profile-name"><strong>Maya Chen</strong><small>Demo account</small></span><Ellipsis size={18} /></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>My workspace</span><span className="breadcrumb-slash">/</span><strong>{pageTitle(page, activeGroup)}</strong></div>
          <div className="topbar-actions"><span className="demo-pill"><span /> DEMO MODE</span><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><span className="top-avatar">MC</span></div>
        </header>

        <div className="content-area">
          {page === 'overview' && <OverviewPage group={activeGroup} balances={balances} settlementPlan={settlementPlan} onAddExpense={addExpense} onSeeAll={() => switchPage('activity')} onSettle={() => switchPage('balances')} onInvite={() => copyInvite(activeGroup)} onManageMembers={() => setShowMembersModal(true)} />}
          {page === 'groups' && <GroupsPage groups={groups} activeId={activeGroup.id} onSelect={(id) => { setActiveGroupId(id); setPage('overview') }} onCreate={() => setShowGroupModal(true)} onInvite={copyInvite} />}
          {page === 'balances' && <BalancesPage group={activeGroup} balances={balances} plan={settlementPlan} onComplete={completeSettlement} />}
          {page === 'activity' && <ActivityPage group={activeGroup} expenses={filteredExpenses} categoryFilter={categoryFilter} memberFilter={memberFilter} dateFrom={dateFrom} dateTo={dateTo} setCategoryFilter={setCategoryFilter} setMemberFilter={setMemberFilter} setDateFrom={setDateFrom} setDateTo={setDateTo} onAdd={addExpense} onEdit={openEditExpense} onDelete={deleteExpense} />}
          {page === 'settings' && <SettingsPage onReset={() => { if (window.confirm('Reset all local demo changes and restore the original sample groups?')) { resetDemo(); setActiveGroupId('group-coast'); setToast('Demo data restored') } }} />}
          <footer className="page-footer"><span>Made for the memories, not the math.</span><span><CircleHelp size={13} /> Need a hand?</span></footer>
        </div>
      </main>
      <nav className="mobile-nav">
        {navItems.slice(0, 4).map(({ id, label, icon: Icon }) => <button key={id} className={page === id ? 'mobile-nav-active' : ''} onClick={() => switchPage(id)}><Icon size={19} /><span>{id === 'overview' ? 'Home' : id === 'activity' ? 'Activity' : label}</span></button>)}
      </nav>
      {showGroupModal && <GroupModal onClose={() => setShowGroupModal(false)} onCreate={createGroup} />}
      {showExpenseModal && <ExpenseModal key={editingExpense?.id ?? 'new-expense'} group={activeGroup} initialExpense={editingExpense} onClose={() => { setShowExpenseModal(false); setEditingExpense(null) }} onSave={saveExpense} />}
      {showMembersModal && <MembersModal group={activeGroup} onClose={() => setShowMembersModal(false)} onAdd={(name) => addGroupMember(activeGroup, name)} onRemove={(member) => removeGroupMember(activeGroup, member)} />}
      {joiningGroup && <JoinGroupModal group={joiningGroup} onClose={() => { setJoiningGroup(null); window.history.replaceState(null, '', '/') }} onJoin={(name) => joinGroup(joiningGroup, name)} />}
      {inviteUnavailable && <Modal title="This invite is not available here" subtitle="Demo groups are saved in the browser that created them, so this link can only be joined from that same browser. Connect Supabase to enable secure invites across devices." onClose={dismissUnavailableInvite}><div className="form-actions"><button className="button button-primary" onClick={dismissUnavailableInvite}>Back to SplitBill</button></div></Modal>}
      {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </div>
  )
}

function pageTitle(page: Page, group: Group) {
  if (page === 'overview') return group.name
  if (page === 'groups') return 'Your groups'
  if (page === 'balances') return 'Balances & settle up'
  if (page === 'activity') return 'Expense history'
  return 'Settings'
}

function OverviewPage({ group, balances, settlementPlan, onAddExpense, onSeeAll, onSettle, onInvite, onManageMembers }: {
  group: Group; balances: Record<string, number>; settlementPlan: SettlementSuggestion[]
  onAddExpense: () => void; onSeeAll: () => void; onSettle: () => void; onInvite: () => void; onManageMembers: () => void
}) {
  const total = getExpenseTotal(group.expenses)
  const spentByMember = group.members.map((member) => ({
    member, amount: group.expenses.reduce((sum, expense) => sum + (expense.shares[member.id] ?? 0), 0),
  })).sort((a, b) => b.amount - a.amount)
  const categoryTotals = group.expenses.reduce((result, expense) => {
    result[expense.category] = (result[expense.category] ?? 0) + expense.amount
    return result
  }, {} as Partial<Record<ExpenseCategory, number>>)
  const categories = Object.entries(categoryTotals).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  const recent = [...group.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const outstanding = settlementPlan.reduce((sum, item) => sum + item.amount, 0)
  const dateRange = group.startDate ? `${new Date(`${group.startDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${group.endDate ? ` – ${new Date(`${group.endDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` : 'A little time together'

  return (
    <>
      <section className="welcome-row">
        <div><p className="eyebrow"><span className="eyebrow-dot" /> YOUR GROUP, AT A GLANCE</p><h1>Good times, <em>fair splits.</em></h1><p className="welcome-copy">Here’s how things are looking with your crew.</p></div>
        <button className="button button-primary" onClick={onAddExpense}><Plus size={17} /> Add an expense</button>
      </section>
      <section className="trip-banner">
        <div className="trip-art"><span className="sun-disc" /><span className="trip-mountain mountain-back" /><span className="trip-mountain mountain-front" /><span className="trip-wave wave-one" /><span className="trip-wave wave-two" /><span className="trip-art-label">TAKE THE<br />SCENIC ROUTE</span><span className="trip-art-sparkle">✳</span></div>
        <div className="trip-info"><div className="trip-type"><span className={`trip-type-dot group-dot-${group.type.toLowerCase()}`} />{group.type.toUpperCase()} GROUP</div><h2>{group.name}</h2><p>{group.description || 'Good company, shared adventures.'}</p><div className="trip-meta"><span><CalendarDays size={15} />{dateRange}</span><span><Users size={15} />{group.members.length} friends</span></div></div>
        <div className="trip-people"><div className="avatar-stack">{group.members.slice(0, 4).map((member) => <Avatar key={member.id} member={member} />)}{group.members.length > 4 && <span className="avatar avatar-more">+{group.members.length - 4}</span>}</div><button className="invite-button" onClick={onInvite}><Plus size={14} /> Invite friends</button></div>
        <span className="trip-index">01 <span>/</span> 03</span>
      </section>
      <section className="stats-grid">
        <article className="stat-card"><div className="stat-heading"><span className="stat-icon mint"><Wallet size={17} /></span><span>Total shared spending</span><Ellipsis size={17} /></div><div className="stat-value">{formatCurrency(total, group.currency)}</div><div className="stat-foot"><span className="stat-foot-icon"><TrendingUp size={13} /></span>Across {group.expenses.length} shared expenses</div><div className="sparkline sparkline-green"><svg viewBox="0 0 124 30" preserveAspectRatio="none"><path d="M1 22 C17 19 18 23 30 18 S49 15 57 19 S73 10 82 15 S96 5 105 10 S116 8 123 2" /></svg></div></article>
        <article className="stat-card"><div className="stat-heading"><span className="stat-icon peach"><ArrowLeftRight size={17} /></span><span>Still to settle</span><Ellipsis size={17} /></div><div className="stat-value">{formatCurrency(outstanding, group.currency)}</div><div className="stat-foot"><span className="neutral-dot" />{settlementPlan.length} {settlementPlan.length === 1 ? 'payment' : 'payments'} to square up</div><div className="sparkline sparkline-peach"><svg viewBox="0 0 124 30" preserveAspectRatio="none"><path d="M1 8 C12 9 19 16 28 13 S46 22 56 18 S73 22 83 14 S96 24 105 18 S117 21 123 9" /></svg></div></article>
        <article className="stat-card"><div className="stat-heading"><span className="stat-icon blue"><Users size={17} /></span><span>In your group</span><Ellipsis size={17} /></div><div className="stat-value">{group.members.length}<small> people</small></div><div className="stat-foot"><span className="member-mini-stack">{group.members.slice(0, 3).map((member) => <Avatar key={member.id} member={member} size="small" />)}</span>All sharing the good stuff</div><div className="stat-decoration"><span /><span /><span /></div></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">THE LATEST</p><h3>Recent expenses</h3></div><button className="text-button" onClick={onSeeAll}>See all <ArrowRight size={15} /></button></div>
          {recent.length ? <div className="recent-list">{recent.map((expense) => <ExpenseRow key={expense.id} expense={expense} group={group} compact />)}</div> : <EmptyState title="Nothing split just yet" copy="Add your first shared expense to get started." action={onAddExpense} />}
        </article>
        <article className="panel spending-panel"><div className="panel-heading"><div><p className="eyebrow">WHERE IT WENT</p><h3>Spending breakdown</h3></div><span className="period-pill">ALL TIME <ChevronDown size={13} /></span></div>
          {categories.length ? <><div className="category-chart">{categories.slice(0, 5).map(([category, amount]) => {
            const label = category as ExpenseCategory
            const Icon = categoryIcons[label]
            return <div className="category-line" key={category}><span className={`category-icon ${categoryColors[label]}`}><Icon size={15} /></span><span className="category-name">{category}</span><div className="category-track"><span className={`category-fill fill-${categoryColors[label]}`} style={{ width: `${Math.max(4, (Number(amount) / Math.max(total, 1)) * 100)}%` }} /></div><strong>{formatCurrency(Number(amount), group.currency)}</strong></div>
          })}</div><div className="chart-total"><span>{group.expenses.length} expenses so far</span><strong>{formatCurrency(total, group.currency)}</strong></div></> : <EmptyState title="Your spending, at a glance" copy="Your categories will show up here." action={onAddExpense} />}
        </article>
      </section>
      <section className="panel member-panel"><div className="panel-heading"><div><p className="eyebrow">EVERYONE’S SHARE</p><h3>Group members</h3></div><div className="member-panel-actions"><span className="member-count">{group.members.length} MEMBERS</span><button className="text-button" onClick={onManageMembers}>Manage</button></div></div>
        {spentByMember.length ? <div className="member-grid">{spentByMember.map(({ member, amount }) => <div className="member-card" key={member.id}><Avatar member={member} /><div className="member-info"><strong>{member.name}</strong><span>Personal share</span></div><strong className="member-amount">{formatCurrency(amount, group.currency)}</strong><span className={`balance-tag ${(balances[member.id] ?? 0) >= 0 ? 'balance-positive' : 'balance-negative'}`}>{(balances[member.id] ?? 0) >= 0 ? 'gets back' : 'owes'} {formatCurrency(Math.abs(balances[member.id] ?? 0), group.currency)}</span></div>)}</div> : <EmptyState title="Invite someone to your group" copy="Expenses and balances are shared with your crew." action={onInvite} />}
      </section>
      {settlementPlan.length > 0 && <section className="settle-nudge"><span className="nudge-icon"><Sparkles size={18} /></span><div><strong>A little housekeeping?</strong><span>Your group has {formatCurrency(outstanding, group.currency)} left to settle up.</span></div><button className="button button-soft" onClick={onSettle}>See who owes who <ArrowRight size={15} /></button></section>}
    </>
  )
}

function ExpenseRow({ expense, group, compact = false, onEdit, onDelete }: { expense: Expense; group: Group; compact?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  const Icon = categoryIcons[expense.category] ?? Ellipsis
  const payer = group.members.find((member) => member.id === expense.payerId)
  const date = new Date(`${expense.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return <div className={`expense-row ${compact ? 'expense-row-compact' : ''}`}><span className={`expense-icon category-icon ${categoryColors[expense.category]}`}><Icon size={17} /></span><div className="expense-description"><strong>{expense.description}</strong><span>{date} <i>·</i> Paid by {payer?.name.split(' ')[0] ?? 'a friend'}</span></div><div className="expense-participants">{Object.keys(expense.shares).slice(0, 4).map((id) => { const member = group.members.find((item) => item.id === id); return member ? <Avatar key={id} member={member} size="small" /> : null })}</div><strong className="expense-total">{formatCurrency(expense.amount, group.currency)}</strong>{!compact && <div className="expense-row-actions"><button title="Edit expense" aria-label="Edit expense" onClick={onEdit}><Pencil size={15} /></button><button title="Delete expense" aria-label="Delete expense" onClick={onDelete}><Trash2 size={15} /></button></div>}</div>
}

function GroupsPage({ groups, activeId, onSelect, onCreate, onInvite }: { groups: Group[]; activeId: string; onSelect: (id: string) => void; onCreate: () => void; onInvite: (group: Group) => void }) {
  return <><section className="page-heading-row"><div><p className="eyebrow"><span className="eyebrow-dot" /> YOUR PEOPLE, ALL TOGETHER</p><h1>Your groups</h1><p className="welcome-copy">The little costs that make the big memories.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={17} /> New group</button></section>
    {groups.length ? <section className="groups-grid">{groups.map((group, index) => <article className={`group-card group-card-${index % 3}`} key={group.id}><div className="group-card-top"><span className={`group-type-pill group-type-${group.type.toLowerCase()}`}>{group.type}</span><button className="group-invite-action" onClick={() => onInvite(group)} title="Copy invite link"><Link2 size={16} /></button></div><h2>{group.name}</h2><p>{group.description || 'A shared space for the good stuff.'}</p><div className="group-card-members"><div className="avatar-stack">{group.members.slice(0, 4).map((member) => <Avatar key={member.id} member={member} />)}</div><span>{group.members.length} friends</span></div><div className="group-card-bottom"><div><small>SHARED SPENDING</small><strong>{formatCurrency(getExpenseTotal(group.expenses), group.currency)}</strong></div><button className={`button ${group.id === activeId ? 'button-outline' : 'button-dark'}`} onClick={() => onSelect(group.id)}>{group.id === activeId ? 'Currently viewing' : 'Open group'}{group.id !== activeId && <ArrowRight size={14} />}</button></div></article>)}</section> : <EmptyState title="Every good group starts somewhere" copy="Make a group, invite your people, and share the little costs." action={onCreate} />}
    <section className="invite-banner"><div className="invite-banner-art"><span>✳</span><span>✳</span><span>✳</span></div><div><h3>The more, the merrier.</h3><p>Everyone in the group can add expenses and see exactly where things stand.</p></div><button className="button button-primary" onClick={() => onInvite(groups.find((group) => group.id === activeId) ?? groups[0])}><Link2 size={16} /> Share an invite link</button></section>
  </>
}

function BalancesPage({ group, balances, plan, onComplete }: { group: Group; balances: Record<string, number>; plan: SettlementSuggestion[]; onComplete: (suggestion: SettlementSuggestion, clickCount: number) => void }) {
  const total = getExpenseTotal(group.expenses)
  const settledCount = group.settlements.length
  return <><section className="page-heading-row"><div><p className="eyebrow"><span className="eyebrow-dot" /> EVERYONE’S SQUARE</p><h1>Balances & settle up</h1><p className="welcome-copy">A clear, kind way to figure out who owes whom.</p></div><span className="currency-badge">{group.currency} · {group.name}</span></section>
    <section className="balance-summary"><div className="balance-summary-art"><span>◠</span><span>✳</span></div><div><p className="eyebrow">THE GROUP TOTAL</p><h2>{formatCurrency(total, group.currency)}</h2><p>{group.expenses.length} expenses · {group.members.length} friends · every cent accounted for.</p></div><div className="zero-balance"><span><Check size={14} /></span> Balanced to the cent</div></section>
    <section className="balances-layout"><article className="panel balances-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR GROUP, CLEAR AS DAY</p><h3>Everyone’s balance</h3></div><span className="member-count">{group.members.length} MEMBERS</span></div><div className="balance-member-list">{group.members.map((member) => {
      const balance = balances[member.id] ?? 0
      return <div className="balance-member-row" key={member.id}><Avatar member={member} /><div className="member-info"><strong>{member.name}</strong><span>{balance > 0.005 ? 'Should receive' : balance < -0.005 ? 'Owes the group' : 'All settled up'}</span></div><strong className={`balance-amount ${balance > 0.005 ? 'amount-positive' : balance < -0.005 ? 'amount-negative' : ''}`}>{balance > 0.005 ? '+' : ''}{formatCurrency(balance, group.currency)}</strong></div>
    })}</div></article>
    <article className="panel settle-panel"><div className="panel-heading"><div><p className="eyebrow">THE FEWEST TRANSFERS</p><h3>Suggested payments</h3></div><span className="smart-badge"><Sparkles size={13} /> SMART SPLIT</span></div>
      {plan.length ? <><p className="settle-explainer">Here’s the simplest way to get everyone square. Mark each payment once it’s made.</p><div className="settlement-list">{plan.map((suggestion, index) => {
        const from = group.members.find((member) => member.id === suggestion.fromMemberId)
        const to = group.members.find((member) => member.id === suggestion.toMemberId)
        return <div className="settlement-card" key={`${suggestion.fromMemberId}-${suggestion.toMemberId}-${index}`}><div className="settlement-people"><div className="settlement-person">{from && <Avatar member={from} size="small" />}<span>{from?.name.split(' ')[0]}</span></div><ArrowRight size={15} className="settle-arrow" /><div className="settlement-person">{to && <Avatar member={to} size="small" />}<span>{to?.name.split(' ')[0]}</span></div></div><strong>{formatCurrency(suggestion.amount, group.currency)}</strong><button className="settle-check" onClick={(event) => onComplete(suggestion, event.detail)} aria-label={`Mark ${from?.name} paying ${to?.name} as complete`} title="Mark as paid"><Check size={15} /></button></div>
      })}</div><div className="settle-plan-total"><span>{plan.length} {plan.length === 1 ? 'payment' : 'payments'} to go</span><strong>{formatCurrency(plan.reduce((sum, item) => sum + item.amount, 0), group.currency)}</strong></div></> : <div className="all-settled"><span><Check size={20} /></span><strong>You’re all square.</strong><p>No payments needed. Enjoy that feeling.</p></div>}
    </article></section>
    {settledCount > 0 && <section className="panel settlement-history"><div className="panel-heading"><div><p className="eyebrow">DONE AND DUSTED</p><h3>Completed payments</h3></div><span className="member-count">{settledCount} SETTLED</span></div>{group.settlements.slice().reverse().map((settlement) => { const from = group.members.find((member) => member.id === settlement.fromMemberId); const to = group.members.find((member) => member.id === settlement.toMemberId); return <div className="history-row" key={settlement.id}><span className="history-check"><Check size={14} /></span><span><strong>{from?.name}</strong> paid <strong>{to?.name}</strong></span><strong>{formatCurrency(settlement.amount, group.currency)}</strong><small>{new Date(settlement.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></div> })}</section>}
  </>
}

function ActivityPage({ group, expenses, categoryFilter, memberFilter, dateFrom, dateTo, setCategoryFilter, setMemberFilter, setDateFrom, setDateTo, onAdd, onEdit, onDelete }: {
  group: Group; expenses: Expense[]; categoryFilter: string; memberFilter: string; dateFrom: string; dateTo: string
  setCategoryFilter: (value: string) => void; setMemberFilter: (value: string) => void
  setDateFrom: (value: string) => void; setDateTo: (value: string) => void
  onAdd: () => void; onEdit: (expense: Expense) => void; onDelete: (expense: Expense) => void
}) {
  const allCategories: ExpenseCategory[] = ['Food', 'Stay', 'Transport', 'Shopping', 'Activities', 'Bills', 'Other']
  return <><section className="page-heading-row"><div><p className="eyebrow"><span className="eyebrow-dot" /> EVERY LITTLE THING, ACCOUNTED FOR</p><h1>Expense history</h1><p className="welcome-copy">All the shared moments (and receipts) in one place.</p></div><button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add an expense</button></section>
    <section className="panel activity-panel"><div className="activity-toolbar"><div><h3>{group.name}</h3><span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} shown</span></div><div className="filters"><label className="filter-select"><Filter size={14} /><select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{allCategories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={13} /></label><label className="filter-select"><Users size={14} /><select aria-label="Filter by member" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}><option value="All members">All members</option>{group.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><ChevronDown size={13} /></label></div></div>
      <div className="date-filters"><span>DATE RANGE</span><label><CalendarDays size={14} /><input type="date" aria-label="From date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><span className="date-to">to</span><label><CalendarDays size={14} /><input type="date" aria-label="To date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>{(dateFrom || dateTo || categoryFilter !== 'All categories' || memberFilter !== 'All members') && <button className="clear-filters" onClick={() => { setCategoryFilter('All categories'); setMemberFilter('All members'); setDateFrom(''); setDateTo('') }}>Clear filters <X size={13} /></button>}</div>
      {expenses.length ? <div className="expense-table"><div className="expense-table-head"><span>EXPENSE</span><span>SHARED WITH</span><span>AMOUNT</span><span>ACTIONS</span></div>{expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} group={group} onEdit={() => onEdit(expense)} onDelete={() => onDelete(expense)} />)}</div> : <EmptyState title="No expenses match those filters" copy="Try a different search, or add a new expense." action={onAdd} />}
    </section>
  </>
}

function SettingsPage({ onReset }: { onReset: () => void }) {
  return <><section className="page-heading-row"><div><p className="eyebrow"><span className="eyebrow-dot" /> MAKE YOURSELF AT HOME</p><h1>Settings</h1><p className="welcome-copy">A few details about this little corner of SplitBill.</p></div></section>
    <section className="settings-grid"><article className="panel setting-card"><span className="setting-icon"><Users size={19} /></span><div><h3>Your profile</h3><p>Demo account · Maya Chen</p><p className="setting-detail">You’re exploring SplitBill in demo mode. No account or payment details are required.</p></div></article>
      <article className="panel setting-card"><span className="setting-icon setting-icon-blue"><CreditCard size={19} /></span><div><h3>Data & privacy</h3><p>Your demo groups are stored locally in this browser.</p><p className="setting-detail">Demo information stays separate from a real Supabase project. No sensitive credentials are included.</p></div></article>
      <article className="panel setting-card setting-reset"><span className="setting-icon setting-icon-peach"><LogOut size={19} /></span><div><h3>Start fresh</h3><p>Restore the original groups and sample expenses.</p><button className="button button-outline" onClick={onReset}>Reset demo data</button></div></article>
    </section>
    <section className="settings-note"><Sparkles size={17} /><span>Ready for your real groups? Set up Supabase by following the project’s README.</span></section>
  </>
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Search size={20} /></span><strong>{title}</strong><p>{copy}</p><button className="text-button" onClick={action}>Let’s do it <ArrowRight size={14} /></button></div>
}

function GroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (group: Group) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GroupType>('Trip')
  const [currency, setCurrency] = useState('USD')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [members, setMembers] = useState('')
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) { setError('Give your group a name to get started.'); return }
    if (startDate && endDate && endDate < startDate) { setError('The end date must be after the start date.'); return }
    const names = ['Maya Chen', ...members.split(',').map((member) => member.trim()).filter(Boolean)]
    const colors = ['#b5c9ad', '#e9c2a8', '#bbc8df', '#dfb9c9', '#d2c8a9', '#b6d4ce', '#d2c1e3']
    const group: Group = {
      id: crypto.randomUUID(), name: name.trim(), description: description.trim(), type, currency,
      ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}),
      inviteCode: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 6)}`,
      members: [...new Set(names)].map((memberName, index) => ({ id: crypto.randomUUID(), name: memberName, color: colors[index % colors.length] })),
      expenses: [], settlements: [], createdAt: new Date().toISOString(),
    }
    onCreate(group)
  }
  return <Modal title="Start a new group" subtitle="Good company, shared adventures. Let’s make it official." onClose={onClose}>
    <form className="form-stack" onSubmit={submit}><label>Group name<input autoFocus placeholder="e.g. Big Sur getaway" value={name} onChange={(event) => setName(event.target.value)} required /></label><label>A little about it <span className="optional">OPTIONAL</span><input placeholder="A week by the coast with my favorite people" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <div className="form-two-col"><label>Group type<select value={type} onChange={(event) => setType(event.target.value as GroupType)}>{(['Trip', 'Home', 'Couple', 'Friends', 'Other'] as GroupType[]).map((item) => <option key={item}>{item}</option>)}</select></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{[['USD', 'USD — US Dollar'], ['CAD', 'CAD — Canadian Dollar'], ['EUR', 'EUR — Euro'], ['GBP', 'GBP — British Pound'], ['AUD', 'AUD — Australian Dollar'], ['INR', 'INR — Indian Rupee'], ['JPY', 'JPY — Japanese Yen']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {type === 'Trip' && <div className="form-two-col"><label>From <span className="optional">OPTIONAL</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Through <span className="optional">OPTIONAL</span><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>}
      <label>Friends to add <span className="optional">OPTIONAL</span><input placeholder="Jamie, Oliver, Sam" value={members} onChange={(event) => setMembers(event.target.value)} /><small>Separate names with commas. You can invite more people later.</small></label>
      {error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Plus size={16} /> Create your group</button></div>
    </form>
  </Modal>
}

function JoinGroupModal({ group, onClose, onJoin }: { group: Group; onClose: () => void; onJoin: (name: string) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) { setError('Add your name to join the group.'); return }
    if (group.members.some((member) => member.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      setError('Someone in this group already has that name.')
      return
    }
    onJoin(cleanName)
  }
  return <Modal title={`Join ${group.name}`} subtitle={`${group.description || 'A shared space for the good stuff.'} Add your name to see the group expenses and balances.`} onClose={onClose}>
    <form className="form-stack" onSubmit={submit}><div className="invite-join-members"><div className="avatar-stack">{group.members.slice(0, 5).map((member) => <Avatar key={member.id} member={member} />)}</div><span>{group.members.length} {group.members.length === 1 ? 'friend' : 'friends'} in this group</span></div><label>Your name<input autoFocus placeholder="e.g. Alex Morgan" value={name} onChange={(event) => setName(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Not now</button><button className="button button-primary" type="submit"><Users size={15} /> Join group</button></div></form>
  </Modal>
}

function MembersModal({ group, onClose, onAdd, onRemove }: {
  group: Group
  onClose: () => void
  onAdd: (name: string) => void
  onRemove: (member: Member) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) { setError('Enter a name to add a group member.'); return }
    if (group.members.some((member) => member.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      setError('A member with that name is already in this group.')
      return
    }
    onAdd(cleanName)
    setName('')
    setError('')
  }
  const hasHistory = (member: Member) => group.expenses.some((expense) =>
    expense.payerId === member.id || member.id in expense.shares)
    || group.settlements.some((settlement) => settlement.fromMemberId === member.id || settlement.toMemberId === member.id)

  return <Modal title="Manage group members" subtitle={`Add friends to ${group.name}. Members with expense or settlement history must stay in the group so balances remain accurate.`} onClose={onClose}>
    <div className="managed-member-list">{group.members.map((member, index) => {
      const protectedMember = index === 0
      const hasMemberHistory = hasHistory(member)
      return <div className="managed-member-row" key={member.id}>
        <Avatar member={member} />
        <div className="member-info"><strong>{member.name}</strong><span>{protectedMember ? 'Group owner' : hasMemberHistory ? 'Has expense history' : 'No expense history'}</span></div>
        <button className="remove-member-button" type="button" disabled={protectedMember || hasMemberHistory} title={protectedMember ? 'The group owner cannot be removed' : hasMemberHistory ? 'Remove this member’s expenses and settlements first' : `Remove ${member.name}`} onClick={() => onRemove(member)}><UserMinus size={15} /> Remove</button>
      </div>
    })}</div>
    <form className="form-stack member-add-form" onSubmit={submit}><label>Add a friend<input autoFocus placeholder="e.g. Alex Morgan" value={name} onChange={(event) => setName(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Done</button><button className="button button-primary" type="submit"><UserPlus size={15} /> Add member</button></div></form>
  </Modal>
}

function ExpenseModal({ group, initialExpense, onClose, onSave }: { group: Group; initialExpense: Expense | null; onClose: () => void; onSave: (expense: Expense) => void }) {
  const [description, setDescription] = useState(initialExpense?.description ?? '')
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '')
  const [category, setCategory] = useState<ExpenseCategory>(initialExpense?.category ?? 'Food')
  const [payerId, setPayerId] = useState(initialExpense?.payerId ?? group.members[0]?.id ?? '')
  const [date, setDate] = useState(initialExpense?.date ?? new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState(initialExpense?.notes ?? '')
  const [splitType, setSplitType] = useState<SplitType>(initialExpense?.splitType ?? 'equal')
  const [participantIds, setParticipantIds] = useState<string[]>(initialExpense ? Object.keys(initialExpense.shares) : group.members.map((member) => member.id))
  const [customShares, setCustomShares] = useState<Record<string, string>>(() => {
    const splitValues = initialExpense?.splitValues
      ?? (initialExpense?.splitType === 'custom' ? initialExpense.shares
        : initialExpense?.splitType === 'percentage' && initialExpense.amount > 0
          ? Object.fromEntries(Object.entries(initialExpense.shares).map(([id, share]) => [id, share / initialExpense.amount * 100]))
          : {})
    return Object.fromEntries(Object.entries(splitValues).map(([id, value]) => [id, String(value)]))
  })
  const [error, setError] = useState('')
  const numericAmount = Number(amount) || 0

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((previous) => previous.includes(memberId) ? previous.filter((id) => id !== memberId) : [...previous, memberId])
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (!description.trim()) throw new Error('Add a short description for this expense.')
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Enter an amount greater than zero.')
      if (!participantIds.length) throw new Error('Choose at least one person to split with.')
      const shares = splitType === 'equal'
        ? splitEqually(numericAmount, participantIds)
        : splitType === 'custom'
          ? splitWithAmounts(numericAmount, Object.fromEntries(participantIds.map((id) => [id, Number(customShares[id] ?? 0)])))
          : splitByPercentage(numericAmount, Object.fromEntries(participantIds.map((id) => [id, Number(customShares[id] ?? 0)])))
      onSave({
        id: initialExpense?.id ?? crypto.randomUUID(),
        description: description.trim(),
        amount: numericAmount,
        category,
        payerId,
        date,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        shares,
        splitType,
        ...(splitType === 'equal' ? {} : {
          splitValues: Object.fromEntries(participantIds.map((id) => [id, Number(customShares[id] ?? 0)])),
        }),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this expense.')
    }
  }
  return <Modal title={initialExpense ? 'Edit expense' : 'Add an expense'} subtitle={`Keep the little details together in ${group.name}.`} onClose={onClose} wide>
    <form className="form-stack expense-form" onSubmit={submit}>
      <div className="form-expense-top"><label>What was it for?<input autoFocus placeholder="e.g. Dinner by the water" value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>How much?<div className="money-input"><span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: group.currency }).formatToParts(0).find((part) => part.type === 'currency')?.value}</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div></label></div>
      <div className="form-three-col"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{(['Food', 'Stay', 'Transport', 'Shopping', 'Activities', 'Bills', 'Other'] as ExpenseCategory[]).map((item) => <option key={item}>{item}</option>)}</select></label><label>Paid by<select value={payerId} onChange={(event) => setPayerId(event.target.value)}>{group.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      <div className="participant-section"><div className="participant-heading"><span>Who shared this?</span><small>{participantIds.length} OF {group.members.length} INCLUDED</small></div><div className="participant-list">{group.members.map((member) => <button type="button" key={member.id} className={`participant-chip ${participantIds.includes(member.id) ? 'participant-selected' : ''}`} onClick={() => toggleParticipant(member.id)}><Avatar member={member} size="small" /><span>{member.name.split(' ')[0]}</span>{participantIds.includes(member.id) && <Check size={13} />}</button>)}</div></div>
      <div className="split-mode-row"><span>Split type</span>{(['equal', 'custom', 'percentage'] as SplitType[]).map((mode) => <button type="button" className={`split-mode ${splitType === mode ? 'split-mode-active' : ''}`} key={mode} onClick={() => { setSplitType(mode); setCustomShares(Object.fromEntries(participantIds.map((id) => [id, '']))) }}>{mode === 'equal' ? 'Equally' : mode === 'custom' ? 'Custom amounts' : 'Percentages'}</button>)}</div>
      {splitType === 'equal' ? <div className="split-preview"><div><span>Each person pays</span><strong>{formatCurrency(participantIds.length ? numericAmount / participantIds.length : 0, group.currency)}</strong></div><small>Any extra cents are split fairly, one cent at a time.</small></div> : <div className="custom-split-grid">{group.members.filter((member) => participantIds.includes(member.id)).map((member) => <label key={member.id}><span><Avatar member={member} size="small" />{member.name.split(' ')[0]}</span><div className="share-input"><input aria-label={`${member.name} ${splitType}`} type="number" min="0" step={splitType === 'percentage' ? '0.01' : '0.01'} placeholder="0" value={customShares[member.id] ?? ''} onChange={(event) => setCustomShares((previous) => ({ ...previous, [member.id]: event.target.value }))} /><span>{splitType === 'percentage' ? '%' : group.currency}</span></div></label>)}<p className="custom-share-total">{splitType === 'percentage' ? 'Total must equal 100%' : `Total must equal ${formatCurrency(numericAmount, group.currency)}`}</p></div>}
      <label>Notes <span className="optional">OPTIONAL</span><input placeholder="Add a note or receipt detail" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <p className="form-error">{error}</p>}<div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} /> {initialExpense ? 'Save changes' : 'Add expense'}</button></div>
    </form>
  </Modal>
}

export default App
