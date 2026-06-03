import { MedicationStatus, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { prisma } from '../../../infra/database/prisma';
import { NotFoundError, ConflictError } from '../../../shared/errors/AppError';
import { buildPaginationMeta, paginate } from '@pharma/utils';

interface MedicationImportRow {
  cum?: string;
  code?: string;
  name: string;
  laboratory?: string;
  presentation?: string;
  concentration?: string;
  status?: string;
}

export class MedicationService {
  async list(page = 1, limit = 20, search?: string, status?: MedicationStatus) {
    const { skip, take } = paginate(page, limit);
    const where: Prisma.MedicationWhereInput = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { cum: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { laboratory: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.medication.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.medication.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async search(query: string, limit = 10) {
    if (!query || query.length < 2) return [];

    const isCum = /^\d/.test(query);

    return prisma.medication.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        OR: isCum
          ? [{ cum: { startsWith: query, mode: 'insensitive' } }, { code: { startsWith: query, mode: 'insensitive' } }]
          : [{ name: { contains: query, mode: 'insensitive' } }],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async getByCum(cum: string) {
    const med = await prisma.medication.findFirst({
      where: { cum, deletedAt: null },
    });
    if (!med) throw new NotFoundError('Medication');
    return med;
  }

  private async findExisting(code: string, cum?: string | null) {
    if (cum?.trim()) {
      const byCum = await prisma.medication.findFirst({
        where: { cum: cum.trim(), deletedAt: null },
      });
      if (byCum) return byCum;
    }
    return prisma.medication.findFirst({
      where: { code: code.trim(), deletedAt: null },
    });
  }

  async create(input: {
    cum?: string;
    code: string;
    name: string;
    laboratory?: string;
    presentation?: string;
    concentration?: string;
    status?: MedicationStatus;
  }) {
    const code = input.code.trim();
    const cum = input.cum?.trim() || undefined;
    const existing = await this.findExisting(code, cum);

    if (existing) {
      return this.update(existing.id, {
        cum: cum ?? existing.cum ?? undefined,
        code,
        name: input.name.trim(),
        laboratory: input.laboratory?.trim() || undefined,
        presentation: input.presentation?.trim() || undefined,
        concentration: input.concentration?.trim() || undefined,
        status: input.status || 'ACTIVE',
      });
    }

    return prisma.medication.create({
      data: {
        cum,
        code,
        name: input.name.trim(),
        laboratory: input.laboratory?.trim() || undefined,
        presentation: input.presentation?.trim() || undefined,
        concentration: input.concentration?.trim() || undefined,
        status: input.status || 'ACTIVE',
      },
    });
  }

  async update(
    id: string,
    input: Partial<{
      cum: string;
      code: string;
      name: string;
      laboratory: string;
      presentation: string;
      concentration: string;
      status: MedicationStatus;
    }>
  ) {
    const existing = await prisma.medication.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('Medication');

    if (input.code && input.code.trim() !== existing.code) {
      const dup = await prisma.medication.findFirst({
        where: { code: input.code.trim(), deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictError(`Ya existe un medicamento con el código ${input.code.trim()}`);
    }

    if (input.cum && input.cum.trim() !== (existing.cum || '')) {
      const dup = await prisma.medication.findFirst({
        where: { cum: input.cum.trim(), deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictError(`Ya existe un medicamento con el CUM ${input.cum.trim()}`);
    }

    return prisma.medication.update({
      where: { id },
      data: {
        ...(input.cum !== undefined && { cum: input.cum.trim() || null }),
        ...(input.code !== undefined && { code: input.code.trim() }),
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.laboratory !== undefined && { laboratory: input.laboratory.trim() || null }),
        ...(input.presentation !== undefined && { presentation: input.presentation.trim() || null }),
        ...(input.concentration !== undefined && { concentration: input.concentration.trim() || null }),
        ...(input.status !== undefined && { status: input.status }),
        deletedAt: null,
      },
    });
  }

  async bulkImport(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const normalized = this.normalizeRow(row);
        if (!normalized.name) {
          errors++;
          continue;
        }

        const code = normalized.code || normalized.cum || `MED-${Date.now()}-${inserted}`;
        const existing = normalized.cum
          ? await prisma.medication.findFirst({ where: { cum: normalized.cum } })
          : await prisma.medication.findFirst({ where: { code } });

        if (existing) {
          await prisma.medication.update({
            where: { id: existing.id },
            data: {
              name: normalized.name,
              laboratory: normalized.laboratory,
              presentation: normalized.presentation,
              concentration: normalized.concentration,
              status: normalized.status === 'INACTIVO' || normalized.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
              deletedAt: null,
            },
          });
          updated++;
        } else {
          await prisma.medication.create({
            data: {
              cum: normalized.cum,
              code,
              name: normalized.name,
              laboratory: normalized.laboratory,
              presentation: normalized.presentation,
              concentration: normalized.concentration,
              status: normalized.status === 'INACTIVO' || normalized.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            },
          });
          inserted++;
        }
      } catch {
        errors++;
      }
    }

    return { inserted, updated, errors, total: rows.length };
  }

  private normalizeRow(row: Record<string, string>): MedicationImportRow {
    const keys = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), String(v || '').trim()])
    );
    return {
      cum: keys.cum || keys['código cum'] || keys['codigo cum'],
      code: keys.code || keys.codigo || keys['código'],
      name: keys.name || keys.nombre || keys['nombre medicamento'] || keys.medicamento,
      laboratory: keys.laboratory || keys.laboratorio,
      presentation: keys.presentation || keys.presentacion || keys['presentación'],
      concentration: keys.concentration || keys.concentracion || keys['concentración'],
      status: keys.status || keys.estado,
    };
  }
}

export const medicationService = new MedicationService();
