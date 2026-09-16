// Uses only a newly created temporary test user, then removes that user's data.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { prisma } = require('../dist/config/prisma');
const ingresos = require('../dist/modules/ingresos/ingreso.service');
const gastos = require('../dist/modules/gastos/gasto.service');
const ahorros = require('../dist/modules/ahorros/ahorro.service');
const { obtenerSaldo } = require('../dist/modules/balance/balance.service');

async function main() {
  const id = randomUUID();
  let creado = false;
  try {
    await prisma.usuario.create({ data: { id, nombre: 'Prueba temporal de saldo', email: `balance-${id}@example.invalid`, password: 'not-a-login-hash' } });
    creado = true;
    const categoria = await prisma.categoria.create({ data: { usuarioId: id, nombre: 'Prueba temporal' } });
    const data = monto => ({ monto, descripcion: 'Prueba temporal', categoriaId: categoria.id, fecha: new Date('2020-01-01T00:00:00Z') });
    const ingreso = await ingresos.crearIngreso(id, data(100));
    const resultados = await Promise.allSettled([gastos.crearGasto(id, data(70)), gastos.crearGasto(id, data(70))]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1, 'solo un gasto concurrente puede consumir los fondos');
    assert.equal(await prisma.gasto.count({ where: { usuarioId: id } }), 1, 'el gasto rechazado se revierte');
    await assert.rejects(ingresos.eliminarIngreso(id, ingreso.id), /negativo/);
    assert.equal(await prisma.ingreso.count({ where: { usuarioId: id } }), 1);
    const ahorro = await ahorros.crearAhorro(id, { ...data(30), tipo: 'DEPOSITO' });
    await assert.rejects(ahorros.crearAhorro(id, { ...data(31), tipo: 'RETIRO' }), /negativo/);
    const retiro = await ahorros.crearAhorro(id, { ...data(30), tipo: 'RETIRO' });
    await assert.rejects(ahorros.eliminarAhorro(id, ahorro.id), /negativo/);
    await gastos.crearGasto(id, data(30));
    await assert.rejects(ahorros.eliminarAhorro(id, retiro.id), /negativo/);
    assert.deepEqual(await obtenerSaldo(id), { disponible: 0, ahorro: 0, deficitDisponible: 0, deficitAhorro: 0 });
    console.log('OK: concurrencia, rollback, eliminación de ingresos, depósitos y retiros; saldo final 0.');
  } finally {
    if (creado) {
      await prisma.gasto.deleteMany({ where: { usuarioId: id } });
      await prisma.ahorro.deleteMany({ where: { usuarioId: id } });
      await prisma.ingreso.deleteMany({ where: { usuarioId: id } });
      await prisma.usuario.delete({ where: { id } });
    }
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[conexión]')); process.exitCode = 1; });
