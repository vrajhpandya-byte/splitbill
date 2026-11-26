import { useEffect, useState } from 'react'
import { demoGroups } from '../data/demo'
import type { Group } from '../types'

const STORAGE_KEY = 'splitbill-demo-groups-v1'

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) as Group[] : demoGroups
    } catch (error) {
      console.error('Could not load saved demo data.', error)
      return demoGroups
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
    } catch (error) {
      console.error('Could not save demo data to this browser.', error)
    }
  }, [groups])

  const resetDemo = () => {
    setGroups(demoGroups)
    localStorage.removeItem(STORAGE_KEY)
  }

  return { groups, setGroups, resetDemo }
}
