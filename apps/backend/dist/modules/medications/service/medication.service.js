"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.medicationService = exports.MedicationService = void 0;
const XLSX = __importStar(require("xlsx"));
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
const utils_1 = require("@pharma/utils");
class MedicationService {
    async list(page = 1, limit = 20, search, status) {
        const { skip, take } = (0, utils_1.paginate)(page, limit);
        const where = {
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
            prisma_1.prisma.medication.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
            prisma_1.prisma.medication.count({ where }),
        ]);
        return { data, meta: (0, utils_1.buildPaginationMeta)(total, page, limit) };
    }
    async search(query, limit = 10) {
        if (!query || query.length < 2)
            return [];
        const isCum = /^\d/.test(query);
        return prisma_1.prisma.medication.findMany({
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
    async getByCum(cum) {
        const med = await prisma_1.prisma.medication.findFirst({
            where: { cum, deletedAt: null },
        });
        if (!med)
            throw new AppError_1.NotFoundError('Medication');
        return med;
    }
    async findExisting(code, cum) {
        if (cum?.trim()) {
            const byCum = await prisma_1.prisma.medication.findFirst({
                where: { cum: cum.trim(), deletedAt: null },
            });
            if (byCum)
                return byCum;
        }
        return prisma_1.prisma.medication.findFirst({
            where: { code: code.trim(), deletedAt: null },
        });
    }
    async create(input) {
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
        return prisma_1.prisma.medication.create({
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
    async update(id, input) {
        const existing = await prisma_1.prisma.medication.findFirst({ where: { id, deletedAt: null } });
        if (!existing)
            throw new AppError_1.NotFoundError('Medication');
        if (input.code && input.code.trim() !== existing.code) {
            const dup = await prisma_1.prisma.medication.findFirst({
                where: { code: input.code.trim(), deletedAt: null, id: { not: id } },
            });
            if (dup)
                throw new AppError_1.ConflictError(`Ya existe un medicamento con el código ${input.code.trim()}`);
        }
        if (input.cum && input.cum.trim() !== (existing.cum || '')) {
            const dup = await prisma_1.prisma.medication.findFirst({
                where: { cum: input.cum.trim(), deletedAt: null, id: { not: id } },
            });
            if (dup)
                throw new AppError_1.ConflictError(`Ya existe un medicamento con el CUM ${input.cum.trim()}`);
        }
        return prisma_1.prisma.medication.update({
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
    async bulkImport(buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
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
                    ? await prisma_1.prisma.medication.findFirst({ where: { cum: normalized.cum } })
                    : await prisma_1.prisma.medication.findFirst({ where: { code } });
                if (existing) {
                    await prisma_1.prisma.medication.update({
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
                }
                else {
                    await prisma_1.prisma.medication.create({
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
            }
            catch {
                errors++;
            }
        }
        return { inserted, updated, errors, total: rows.length };
    }
    normalizeRow(row) {
        const keys = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), String(v || '').trim()]));
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
exports.MedicationService = MedicationService;
exports.medicationService = new MedicationService();
