#!/usr/bin/env node
/**
 * Verifica cuántos medicamentos tiene una dispensación en la BD.
 * Uso: node scripts/verify-dispensacion.mjs 10020
 *      node scripts/verify-dispensacion.mjs 1010091313 10020
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [cedula, nroDisp] = process.argv.slice(2);

async function main() {
  const where = { deletedAt: null };
  if (nroDisp) {
    where.documentNumber = nroDisp;
    if (cedula) where.patient = { documentId: cedula };
  } else if (cedula) {
    where.patient = { documentId: cedula };
  } else {
    console.error('Uso: node scripts/verify-dispensacion.mjs <NroDispensacion>');
    console.error('     node scripts/verify-dispensacion.mjs <Cedula> <NroDispensacion>');
    process.exit(1);
  }

  const deliveries = await prisma.delivery.findMany({
    where,
    include: {
      patient: { select: { documentId: true, firstName: true, lastName: true } },
      items: {
        where: { deletedAt: null },
        include: { medication: { select: { code: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (!deliveries.length) {
    console.log('No se encontraron entregas.');
    process.exit(0);
  }

  for (const d of deliveries) {
    const name =
      d.patient.lastName === '.'
        ? d.patient.firstName
        : `${d.patient.firstName} ${d.patient.lastName}`;
    console.log('\n---');
    console.log(`Paciente: ${name} (CC ${d.patient.documentId})`);
    console.log(`Dispensación: ${d.documentNumber} | Estado: ${d.status} | ID: ${d.id}`);
    console.log(`Medicamentos (${d.items.length}):`);
    for (const item of d.items) {
      console.log(`  - ${item.medication.code} | ${item.medication.name} × ${item.quantity}`);
    }
  }

  const lastImport = await prisma.excelImport.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      fileName: true,
      status: true,
      insertedCount: true,
      updatedCount: true,
      errorCount: true,
      errors: true,
      completedAt: true,
    },
  });
  if (lastImport) {
    console.log('\n=== Última importación ===');
    console.log(lastImport);
    if (lastImport.errorCount > 0 && lastImport.errors) {
      console.log('Errores por fila:', JSON.stringify(lastImport.errors, null, 2));
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
