import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  { code: 'users.read', name: 'Ver usuarios', module: 'users' },
  { code: 'users.write', name: 'Gestionar usuarios', module: 'users' },
  { code: 'roles.read', name: 'Ver roles', module: 'roles' },
  { code: 'patients.read', name: 'Ver pacientes', module: 'patients' },
  { code: 'patients.write', name: 'Gestionar pacientes', module: 'patients' },
  { code: 'deliveries.read', name: 'Ver entregas', module: 'deliveries' },
  { code: 'deliveries.write', name: 'Gestionar entregas', module: 'deliveries' },
  { code: 'assignments.write', name: 'Asignar entregas', module: 'assignments' },
  { code: 'excel.import', name: 'Importar Excel', module: 'excel' },
  { code: 'excel.read', name: 'Ver importaciones Excel', module: 'excel' },
  { code: 'excel.delete', name: 'Eliminar importaciones Excel', module: 'excel' },
  { code: 'excel.reprocess', name: 'Reprocesar importaciones Excel', module: 'excel' },
  { code: 'system.reset_queue', name: 'Reiniciar cola de pendientes', module: 'system' },
  { code: 'calls.read', name: 'Ver llamadas', module: 'calls' },
  { code: 'calls.write', name: 'Registrar llamadas', module: 'calls' },
  { code: 'calls.assign', name: 'Asignar llamadas a operadores', module: 'calls' },
  { code: 'medications.read', name: 'Ver medicamentos maestros', module: 'medications' },
  { code: 'medications.write', name: 'Gestionar medicamentos maestros', module: 'medications' },
  { code: 'medications.import', name: 'Importar medicamentos masivo', module: 'medications' },
  { code: 'reports.export', name: 'Exportar reportes', module: 'reports' },
  { code: 'couriers.read', name: 'Panel de domiciliarios', module: 'couriers' },
  { code: 'incidents.write', name: 'Reportar incidencias', module: 'incidents' },
  { code: 'dashboard.read', name: 'Ver dashboard', module: 'dashboard' },
  { code: 'courier.app', name: 'App domiciliario', module: 'mobile' },
  { code: 'audit.read', name: 'Auditoría solo lectura', module: 'audit' },
  { code: 'route_municipalities.read', name: 'Ver municipios de ruta', module: 'intermunicipal' },
  { code: 'route_municipalities.write', name: 'Gestionar municipios de ruta', module: 'intermunicipal' },
  { code: 'intermunicipal_routes.read', name: 'Ver rutas intermunicipales', module: 'intermunicipal' },
  { code: 'intermunicipal_routes.write', name: 'Gestionar rutas intermunicipales', module: 'intermunicipal' },
  { code: 'intermunicipal_routes.add_deliveries', name: 'Agregar entregas a rutas intermunicipales', module: 'intermunicipal' },
];

const roles = [
  { name: 'ADMIN', description: 'Administrador del sistema', permissions: permissions.map((p) => p.code) },
  {
    name: 'SUPERVISOR',
    description: 'Supervisor de operaciones',
    permissions: [
      'patients.read', 'patients.write',
      'deliveries.read', 'deliveries.write',
      'assignments.write',
      'couriers.read',
      'excel.import', 'excel.read', 'excel.delete', 'excel.reprocess',
      'dashboard.read', 'calls.read', 'calls.write', 'calls.assign',
      'reports.export',
      'intermunicipal_routes.read', 'intermunicipal_routes.write',
      'intermunicipal_routes.add_deliveries',
    ],
  },
  {
    name: 'OPERATOR',
    description: 'Operador de call center',
    permissions: [
      'calls.read',
      'calls.write',
      'patients.read',
      'patients.write',
      'deliveries.read',
    ],
  },
  {
    name: 'DOMICILIARIO',
    description: 'Domiciliario de entregas',
    permissions: ['deliveries.read', 'courier.app', 'incidents.write'],
  },
  {
    name: 'AUDITOR',
    description: 'Auditor solo lectura',
    permissions: [
      'audit.read',
      'patients.read', 'deliveries.read',
      'calls.read', 'dashboard.read', 'excel.read',
      'intermunicipal_routes.read', 'couriers.read',
    ],
  },
];

async function syncRolePermissions(roleId: string, permissionCodes: string[]) {
  const perms = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  for (const perm of perms) {
    await prisma.rolePermission.create({ data: { roleId, permissionId: perm.id } });
  }
}

async function main() {
  console.log('Seeding database...');

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, module: perm.module },
      create: perm,
    });
  }

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: { name: roleData.name, description: roleData.description, isSystem: true },
    });
    await syncRolePermissions(role.id, roleData.permissions);
  }

  // Migrar rol COURIER legacy a DOMICILIARIO y ocultarlo del sistema
  const legacyCourier = await prisma.role.findUnique({ where: { name: 'COURIER' } });
  const domiciliarioRole = await prisma.role.findUnique({ where: { name: 'DOMICILIARIO' } });
  if (legacyCourier && domiciliarioRole) {
    await prisma.user.updateMany({ where: { roleId: legacyCourier.id }, data: { roleId: domiciliarioRole.id } });
    await prisma.role.update({
      where: { id: legacyCourier.id },
      data: { deletedAt: new Date() },
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const domRole = await prisma.role.findUnique({ where: { name: 'DOMICILIARIO' } });
  const operatorRole = await prisma.role.findUnique({ where: { name: 'OPERATOR' } });
  const supervisorRole = await prisma.role.findUnique({ where: { name: 'SUPERVISOR' } });
  const auditorRole = await prisma.role.findUnique({ where: { name: 'AUDITOR' } });

  await prisma.user.upsert({
    where: { email: 'admin@pharma.local' },
    update: {},
    create: {
      email: 'admin@pharma.local',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      firstName: 'Admin',
      lastName: 'Sistema',
      roleId: adminRole!.id,
    },
  });

  const courierUser = await prisma.user.upsert({
    where: { email: 'courier@pharma.local' },
    update: { roleId: domRole!.id, operationalType: 'DOMICILIARIO' },
    create: {
      email: 'courier@pharma.local',
      passwordHash: await bcrypt.hash('Courier123!', 12),
      firstName: 'Carlos',
      lastName: 'Domiciliario',
      phone: '3001234567',
      roleId: domRole!.id,
      operationalType: 'DOMICILIARIO',
    },
  });

  await prisma.courier.upsert({
    where: { userId: courierUser.id },
    update: { zone: 'Norte' },
    create: { userId: courierUser.id, code: 'DOM-001', vehicleType: 'MOTO', zone: 'Norte' },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@pharma.local' },
    update: {},
    create: {
      email: 'operator@pharma.local',
      passwordHash: await bcrypt.hash('Operator123!', 12),
      firstName: 'Ana',
      lastName: 'Operadora',
      roleId: operatorRole!.id,
    },
  });

  await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {},
    create: { userId: operatorUser.id, code: 'OP-001' },
  });

  const sampleMeds = [
    { cum: '19962-001', code: 'MED-001', name: 'Acetaminofén 500mg', laboratory: 'Genfar', presentation: 'Tableta', concentration: '500mg' },
    { cum: '19962-002', code: 'MED-002', name: 'Losartán 50mg', laboratory: 'MK', presentation: 'Tableta', concentration: '50mg' },
    { cum: '19962-003', code: 'MED-003', name: 'Metformina 850mg', laboratory: 'La Santé', presentation: 'Tableta', concentration: '850mg' },
  ];
  for (const med of sampleMeds) {
    await prisma.medication.upsert({
      where: { code: med.code },
      update: { cum: med.cum, name: med.name, laboratory: med.laboratory, presentation: med.presentation, concentration: med.concentration },
      create: med,
    });
  }

  await prisma.user.upsert({
    where: { email: 'supervisor@pharma.local' },
    update: {},
    create: {
      email: 'supervisor@pharma.local',
      passwordHash: await bcrypt.hash('Supervisor123!', 12),
      firstName: 'Laura',
      lastName: 'Supervisora',
      roleId: supervisorRole!.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'auditor@pharma.local' },
    update: {},
    create: {
      email: 'auditor@pharma.local',
      passwordHash: await bcrypt.hash('Auditor123!', 12),
      firstName: 'Pedro',
      lastName: 'Auditor',
      roleId: auditorRole!.id,
    },
  });

  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@pharma.local' },
    update: { roleId: domRole!.id, operationalType: 'CONDUCTOR_RUTA' },
    create: {
      email: 'driver@pharma.local',
      passwordHash: await bcrypt.hash('Driver123!', 12),
      firstName: 'Jorge',
      lastName: 'Conductor',
      phone: '3009876543',
      roleId: domRole!.id,
      operationalType: 'CONDUCTOR_RUTA',
    },
  });

  await prisma.courier.upsert({
    where: { userId: driverUser.id },
    update: { zone: 'Intermunicipal' },
    create: { userId: driverUser.id, code: 'RUT-001', vehicleType: 'CAMIONETA', zone: 'Intermunicipal' },
  });

  const municipalities = [
    'Piendamó', 'Morales', 'Cajibío', 'Silvia', 'Totoró', 'Timbío', 'El Tambo',
  ];
  for (const name of municipalities) {
    await prisma.routeMunicipality.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, code: name.toUpperCase().replace(/\s+/g, '_').slice(0, 20) },
    });
  }

  console.log('Seed completed');
  console.log('Admin: admin@pharma.local / Admin123!');
  console.log('Supervisor: supervisor@pharma.local / Supervisor123!');
  console.log('Operator: operator@pharma.local / Operator123!');
  console.log('Domiciliario: courier@pharma.local / Courier123!');
  console.log('Conductor ruta: driver@pharma.local / Driver123!');
  console.log('Auditor: auditor@pharma.local / Auditor123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
