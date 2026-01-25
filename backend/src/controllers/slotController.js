import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const createSlot = async (req, res) => {
  try {
    const mentorId = req.user.id
    const { start, end } = req.body
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' })
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s) || isNaN(e) || s >= e) return res.status(400).json({ error: 'Invalid start/end' })

    const slot = await prisma.slot.create({ data: { mentorId, start: s, end: e } })
    res.status(201).json({ message: 'Slot created', slot })
  } catch (err) {
    console.error('Create slot error:', err)
    res.status(500).json({ error: 'Failed to create slot' })
  }
}

export const listSlots = async (req, res) => {
  try {
    const { mentorId } = req.query
    const where = { status: 'OPEN' }
    if (mentorId) where.mentorId = Number(mentorId)
    const slots = await prisma.slot.findMany({ where, orderBy: { start: 'asc' } })
    res.json({ slots })
  } catch (err) {
    console.error('List slots error:', err)
    res.status(500).json({ error: 'Failed to list slots' })
  }
}

export const bookSlot = async (req, res) => {
  try {
    const menteeId = req.user.id
    const { slotId } = req.body
    if (!slotId) return res.status(400).json({ error: 'slotId required' })

    const slot = await prisma.slot.findUnique({ where: { id: slotId } })
    if (!slot) return res.status(404).json({ error: 'Slot not found' })
    if (slot.status !== 'OPEN') return res.status(400).json({ error: 'Slot not available' })

    // create booking and update slot status
    const booking = await prisma.booking.create({ data: { slotId: slot.id, menteeId } })
    await prisma.slot.update({ where: { id: slot.id }, data: { status: 'BOOKED' } })

    res.status(201).json({ message: 'Slot booked', booking })
  } catch (err) {
    console.error('Book slot error:', err)
    res.status(500).json({ error: 'Failed to book slot' })
  }
}
