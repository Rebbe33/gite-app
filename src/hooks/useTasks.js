import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(giteId) {
  const [tasks, setTasks]               = useState([])
  const [logs, setLogs]                 = useState([])
  const [passage, setPassage]           = useState(null)
  const [passageCount, setPassageCount] = useState(0)
  const [loading, setLoading]           = useState(true)

  const fetchAll = useCallback(async () => {
    if (!giteId) { setLoading(false); return }
    setLoading(true)

    const [{ data: taskData }, { data: passageData }] = await Promise.all([
      supabase.from('gite_tasks').select('*').eq('gite_id', giteId).order('ordre'),
      supabase.from('gite_passages').select('*').eq('gite_id', giteId).order('numero', { ascending: false }),
    ])

    const allPassages = passageData || []
    const maxNum = allPassages.length > 0 ? allPassages[0].numero : 0
    setPassageCount(maxNum)
    setTasks(taskData || [])

    const open = allPassages.find(p => !p.cloture)
    setPassage(open || null)

    if (open) {
      const { data: logData } = await supabase
        .from('gite_task_logs')   // ← corrigé
        .select('*')
        .eq('gite_id', giteId)
        .eq('passage_numero', open.numero)
      setLogs(logData || [])
    } else {
      setLogs([])
    }

    setLoading(false)
  }, [giteId])

  useEffect(() => {
    fetchAll()
    if (!giteId) return
    const sub = supabase.channel(`tasks-${giteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_task_logs',
        filter: `gite_id=eq.${giteId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_passages',
        filter: `gite_id=eq.${giteId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gite_tasks',
        filter: `gite_id=eq.${giteId}` }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [giteId, fetchAll])

  const ensurePassage = async () => {
    if (passage) return passage
    const num = passageCount + 1
    const { data } = await supabase.from('gite_passages')
      .insert({ gite_id: giteId, numero: num, cloture: false })
      .select().single()
    setPassage(data)
    setPassageCount(num)
    return data
  }

  const toggleTask = async (taskId) => {
    const p = await ensurePassage()
    const existing = logs.find(l => l.task_id === taskId)
    if (existing) {
      const newDone = !existing.done
      await supabase.from('gite_task_logs')
        .update({ done: newDone, done_at: newDone ? new Date().toISOString() : null })
        .eq('id', existing.id)
      setLogs(prev => prev.map(l => l.id === existing.id ? { ...l, done: newDone } : l))
    } else {
      const { data } = await supabase.from('gite_task_logs')
        .insert({ gite_id: giteId, task_id: taskId, passage_numero: p.numero, done: true, done_at: new Date().toISOString() })
        .select().single()
      if (data) setLogs(prev => [...prev, data])
    }
  }

  const closePassage = async () => {
    if (!passage) return
    const num = passage.numero
    const doneLogs = logs.filter(l => l.done)
    if (doneLogs.length > 0) {
      await Promise.all(doneLogs.map(l =>
        supabase.from('gite_tasks').update({ last_done_passage: num }).eq('id', l.task_id)
      ))
    }
    await supabase.from('gite_passages').update({ cloture: true }).eq('id', passage.id)
    await fetchAll()
  }

  const isTaskDone = (taskId) => logs.some(l => l.task_id === taskId && l.done)

  const isDue = (task) => {
    const next = passageCount + 1
    const lastDone = task.last_done_passage ?? 0
    return (next - lastDone) >= task.freq
  }

  const importTasks = async (rawTasks) => {
    await supabase.from('gite_tasks').delete().eq('gite_id', giteId)
    const toInsert = rawTasks.map((t, i) => ({ ...t, gite_id: giteId, ordre: i, last_done_passage: 0 }))
    await supabase.from('gite_tasks').insert(toInsert)
    await fetchAll()
  }

  const addTask = async (task) => {
    await supabase.from('gite_tasks').insert({ ...task, gite_id: giteId, ordre: tasks.length, last_done_passage: 0 })
    await fetchAll()
  }

  const updateTask = async (id, updates) => {
    await supabase.from('gite_tasks').update(updates).eq('id', id)
    await fetchAll()
  }

  const deleteTask = async (id) => {
    await supabase.from('gite_tasks').delete().eq('id', id)
    await fetchAll()
  }

  return {
    tasks, logs, passage, passageCount, loading,
    toggleTask, closePassage, isTaskDone, isDue,
    importTasks, addTask, updateTask, deleteTask,
    refresh: fetchAll,
  }
}
