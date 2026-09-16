import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { LibroSaldo, problemaSaldo, resumenSaldo } from './balance.rules';

export async function leerLibro(tx: Prisma.TransactionClient, usuarioId: string, hasta?: string): Promise<LibroSaldo> {
  const where = { usuarioId, ...(hasta ? { fecha: { lt: new Date(new Date(hasta + 'T00:00:00Z').getTime() + 86400000) } } : {}) };
  const [cuentas, ingresos, gastos, ahorros] = await Promise.all([
    tx.planFinanciero.findMany({ where: { usuarioId, tipo: 'CUENTA' }, select: { monto: true } }),
    tx.ingreso.findMany({ where, select: { fecha: true, monto: true } }),
    tx.gasto.findMany({ where, select: { fecha: true, monto: true } }),
    tx.ahorro.findMany({ where, select: { fecha: true, monto: true, tipo: true } }),
  ]);
  return {
    inicial: cuentas.reduce((s, c) => s + Number(c.monto), 0),
    movimientos: [
      ...ingresos.map(m => ({ fecha: m.fecha.toISOString().slice(0, 10), monto: Number(m.monto), tipo: 'INGRESO' as const })),
      ...gastos.map(m => ({ fecha: m.fecha.toISOString().slice(0, 10), monto: Number(m.monto), tipo: 'GASTO' as const })),
      ...ahorros.map(m => ({ fecha: m.fecha.toISOString().slice(0, 10), monto: Number(m.monto), tipo: m.tipo })),
    ],
  };
}

export function conSaldoValidado<T>(usuarioId: string, accion: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    // All financial writers lock the same user row, including edits/deletes.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
    const antes = await leerLibro(tx, usuarioId);
    const resultado = await accion(tx);
    const problema = problemaSaldo(antes, await leerLibro(tx, usuarioId));
    if (problema) throw new AppError(problema, 422);
    return resultado;
  });
}

export function obtenerSaldo(usuarioId: string, hasta?: string) {
  return prisma.$transaction(async tx => resumenSaldo(await leerLibro(tx, usuarioId, hasta ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }))), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
}
