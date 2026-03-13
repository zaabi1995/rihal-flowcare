const { Slot, ServiceType, Staff, Branch } = require('../models');
const { Op } = require('sequelize');
const { logAudit } = require('../middleware/audit');

async function getAvailableSlots({ branchId, serviceTypeId, date }) {
  const where = {
    branchId,
    serviceTypeId,
    date,
    isBooked: false,
    deletedAt: null,
  };

  return Slot.findAll({
    where,
    include: [
      { model: ServiceType, as: 'serviceType', attributes: ['name', 'durationMinutes'] },
      { model: Staff, as: 'staff', attributes: ['name'] },
    ],
    order: [['startTime', 'ASC']],
  });
}

async function listSlots({ user, includeDeleted, page = 1, pageSize = 20, search }) {
  const where = {};

  // only admin can see soft-deleted
  if (!includeDeleted || user.role !== 'admin') {
    where.deletedAt = null;
  }

  // scope by branch for managers
  if (user.role === 'manager') {
    where.branchId = user.branchId;
  }

  if (search) {
    // search by date string
    where.date = { [Op.eq]: search };
  }

  const offset = (page - 1) * pageSize;
  const { rows, count } = await Slot.findAndCountAll({
    where,
    include: [
      { model: ServiceType, as: 'serviceType', attributes: ['name'] },
      { model: Staff, as: 'staff', attributes: ['name'] },
      { model: Branch, as: 'branch', attributes: ['name'] },
    ],
    order: [['date', 'ASC'], ['startTime', 'ASC']],
    limit: pageSize,
    offset,
  });

  return {
    results: rows,
    total: count,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

async function createSlot(data, user) {
  // support bulk creation if data is an array
  const slots = Array.isArray(data) ? data : [data];
  const created = [];

  for (const slotData of slots) {
    // managers can only create slots in their branch
    if (user.role === 'manager' && slotData.branchId !== user.branchId) {
      throw Object.assign(new Error('You can only create slots in your own branch'), { status: 403 });
    }

    const slot = await Slot.create(slotData);
    created.push(slot);

    await logAudit({
      action: 'slot_created',
      actorId: user.id,
      actorRole: user.role,
      targetType: 'slot',
      targetId: slot.id,
      branchId: slotData.branchId,
      metadata: { date: slotData.date, startTime: slotData.startTime, endTime: slotData.endTime },
    });
  }

  return created.length === 1 ? created[0] : created;
}

async function updateSlot(id, data, user) {
  const slot = await Slot.findOne({ where: { id, deletedAt: null } });
  if (!slot) {
    throw Object.assign(new Error('Slot not found'), { status: 404 });
  }

  if (user.role === 'manager' && slot.branchId !== user.branchId) {
    throw Object.assign(new Error('You can only update slots in your own branch'), { status: 403 });
  }

  await slot.update(data);

  await logAudit({
    action: 'slot_updated',
    actorId: user.id,
    actorRole: user.role,
    targetType: 'slot',
    targetId: slot.id,
    branchId: slot.branchId,
    metadata: data,
  });

  return slot;
}

async function softDeleteSlot(id, user) {
  const slot = await Slot.findOne({ where: { id, deletedAt: null } });
  if (!slot) {
    throw Object.assign(new Error('Slot not found'), { status: 404 });
  }

  if (user.role === 'manager' && slot.branchId !== user.branchId) {
    throw Object.assign(new Error('You can only delete slots in your own branch'), { status: 403 });
  }

  await slot.update({ deletedAt: new Date() });

  await logAudit({
    action: 'slot_soft_deleted',
    actorId: user.id,
    actorRole: user.role,
    targetType: 'slot',
    targetId: slot.id,
    branchId: slot.branchId,
  });

  return { message: 'Slot deleted' };
}

module.exports = { getAvailableSlots, listSlots, createSlot, updateSlot, softDeleteSlot };
