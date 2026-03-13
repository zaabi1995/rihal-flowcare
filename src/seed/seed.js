require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Branch, ServiceType, Staff, Customer, Slot, StaffService } = require('../models');
const seedData = require('./data.json');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    // sync tables (won't drop existing data)
    await sequelize.sync();

    // -- Branches --
    const branches = [];
    for (const b of seedData.branches) {
      const [branch] = await Branch.findOrCreate({
        where: { name: b.name },
        defaults: b,
      });
      branches.push(branch);
    }
    console.log(`Branches: ${branches.length}`);

    // -- Services (same 4 services for each branch) --
    const allServices = {};
    for (const branch of branches) {
      allServices[branch.id] = [];
      for (const s of seedData.services) {
        const [service] = await ServiceType.findOrCreate({
          where: { name: s.name, branchId: branch.id },
          defaults: { ...s, branchId: branch.id },
        });
        allServices[branch.id].push(service);
      }
    }
    console.log('Services seeded');

    // -- Admin --
    const hashedAdminPass = await bcrypt.hash(seedData.admin.password, 10);
    const [admin] = await Staff.findOrCreate({
      where: { email: seedData.admin.email },
      defaults: {
        ...seedData.admin,
        password: hashedAdminPass,
        branchId: null,
      },
    });
    console.log(`Admin: ${admin.email}`);

    // -- Staff (2 staff + 1 manager per branch) --
    const staffMembers = [
      // Muscat branch
      { name: 'Dr. Sara Al Zadjali', email: 'sara@flowcare.om', role: 'manager', branchIndex: 0 },
      { name: 'Dr. Rashid Al Habsi', email: 'rashid@flowcare.om', role: 'staff', branchIndex: 0 },
      { name: 'Nurse Aisha Al Mamari', email: 'aisha@flowcare.om', role: 'staff', branchIndex: 0 },
      // Salalah branch
      { name: 'Dr. Yusuf Al Mashani', email: 'yusuf@flowcare.om', role: 'manager', branchIndex: 1 },
      { name: 'Dr. Huda Al Shanfari', email: 'huda@flowcare.om', role: 'staff', branchIndex: 1 },
      { name: 'Nurse Omar Al Kathiri', email: 'omar@flowcare.om', role: 'staff', branchIndex: 1 },
    ];

    const staffHash = await bcrypt.hash('staff123', 10);
    const createdStaff = [];
    for (const s of staffMembers) {
      const [staff] = await Staff.findOrCreate({
        where: { email: s.email },
        defaults: {
          name: s.name,
          email: s.email,
          password: staffHash,
          role: s.role,
          branchId: branches[s.branchIndex].id,
        },
      });
      createdStaff.push({ ...staff.toJSON(), branchIndex: s.branchIndex });
    }
    console.log(`Staff: ${createdStaff.length}`);

    // assign staff to services (each staff gets 2 service types)
    for (const staff of createdStaff) {
      if (staff.role === 'manager') continue; // managers don't need service assignments
      const branchServices = allServices[staff.branchId];
      if (!branchServices) continue;

      // assign first two services to first staff, last two to second
      const idx = createdStaff.filter(s => s.branchId === staff.branchId && s.role === 'staff').indexOf(
        createdStaff.find(s => s.id === staff.id)
      );
      const serviceSlice = idx === 0
        ? branchServices.slice(0, 2)
        : branchServices.slice(2, 4);

      for (const svc of serviceSlice) {
        await StaffService.findOrCreate({
          where: { staffId: staff.id, serviceTypeId: svc.id },
        });
      }
    }
    console.log('Staff service assignments done');

    // -- Customers --
    const customerHash = await bcrypt.hash('pass123', 10);
    for (const c of seedData.customers) {
      await Customer.findOrCreate({
        where: { email: c.email },
        defaults: {
          ...c,
          password: customerHash,
          idImage: 'uploads/seed-id-placeholder.jpg', // placeholder for seeded customers
        },
      });
    }
    console.log(`Customers: ${seedData.customers.length}`);

    // -- Slots (12+ across next 5 days) --
    const today = new Date();
    let slotCount = 0;

    for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      for (const branch of branches) {
        const branchServices = allServices[branch.id];
        const branchStaff = createdStaff.filter(s => s.branchId === branch.id && s.role === 'staff');

        // create slots at 09:00, 10:00, 11:00 for first service with first staff member
        const times = [
          { start: '09:00', end: '09:30' },
          { start: '10:00', end: '10:30' },
          { start: '11:00', end: '11:30' },
        ];

        // only create 3 slots per branch per day for the first service
        if (dayOffset <= 3) {
          for (const t of times) {
            const [slot, created] = await Slot.findOrCreate({
              where: {
                branchId: branch.id,
                date: dateStr,
                startTime: t.start,
                serviceTypeId: branchServices[0].id,
              },
              defaults: {
                branchId: branch.id,
                serviceTypeId: branchServices[0].id,
                staffId: branchStaff[0] ? branchStaff[0].id : null,
                date: dateStr,
                startTime: t.start,
                endTime: t.end,
              },
            });
            if (created) slotCount++;
          }
        }

        // afternoon slot for dental
        if (dayOffset <= 4 && branchServices[1]) {
          const [slot, created] = await Slot.findOrCreate({
            where: {
              branchId: branch.id,
              date: dateStr,
              startTime: '14:00',
              serviceTypeId: branchServices[1].id,
            },
            defaults: {
              branchId: branch.id,
              serviceTypeId: branchServices[1].id,
              staffId: branchStaff[1] ? branchStaff[1].id : null,
              date: dateStr,
              startTime: '14:00',
              endTime: '14:45',
            },
          });
          if (created) slotCount++;
        }
      }
    }
    console.log(`Slots created: ${slotCount}`);

    console.log('\nSeed completed successfully!');
    console.log('Default admin login: admin / admin123');
    console.log('Staff password: staff123');
    console.log('Customer password: pass123');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
