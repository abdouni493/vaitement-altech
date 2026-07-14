import { create } from 'zustand'
import type { Expense } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_EXPENSES } from '@/data/seedData'

interface ExpenseState {
  expenses: Expense[]
  addExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Expense
  updateExpense: (id: string, data: Partial<Expense>) => void
  deleteExpense: (id: string) => void
}

export const useExpenseStore = create<ExpenseState>()((set) => ({
  expenses: INITIAL_EXPENSES,
  addExpense: (data) => {
    const expense: Expense = { ...data, id: uid('e'), createdAt: new Date().toISOString() }
    set((s) => ({ expenses: [expense, ...s.expenses] }))
    return expense
  },
  updateExpense: (id, data) =>
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...data } : e)) })),
  deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
}))
