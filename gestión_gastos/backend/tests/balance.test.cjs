const assert = require('node:assert/strict');
const { test } = require('node:test');
const { problemaSaldo, resumenSaldo } = require('../dist/modules/balance/balance.rules');
const { gastoSchema } = require('../dist/modules/gastos/gasto.schema');
const { ingresoSchema } = require('../dist/modules/ingresos/ingreso.schema');
const { ahorroSchema } = require('../dist/modules/ahorros/ahorro.schema');
const movimiento = (tipo, monto, fecha = '2026-01-01') => ({ tipo, monto, fecha });
const libro = (...movimientos) => ({ inicial: 0, movimientos });

test('rechaza cero, negativos, infinitos, descripción vacía y fechas futuras en los tres módulos', () => {
  const valido = { monto: 1, descripcion: 'Prueba', fecha: '2020-01-01', categoriaId: 'f688f5d1-24e9-40b5-9e16-e675d744177b' };
  for (const schema of [gastoSchema, ingresoSchema, ahorroSchema]) {
    assert.equal(schema.safeParse(valido).success, true);
    for (const monto of [0, -1, 0.001, Infinity, NaN]) assert.equal(schema.safeParse({ ...valido, monto }).success, false);
    for (const descripcion of ['', '  ', undefined]) assert.equal(schema.safeParse({ ...valido, descripcion }).success, false);
    assert.equal(schema.safeParse({ ...valido, fecha: '2999-01-01' }).success, false);
  }
});
test('permite consumir exactamente el saldo, con centavos', () => {
  const antes = libro(movimiento('INGRESO', 0.3));
  const despues = libro(...antes.movimientos, movimiento('GASTO', 0.1), movimiento('GASTO', 0.2));
  assert.equal(problemaSaldo(antes, despues), null);
  assert.equal(resumenSaldo(despues).disponible, 0);
});
test('no permite gastar más ni editar un gasto para sobrepasar el saldo', () => {
  const antes = libro(movimiento('INGRESO', 100), movimiento('GASTO', 80));
  assert.match(problemaSaldo(antes, libro(...antes.movimientos, movimiento('GASTO', 21))), /saldo disponible/);
  assert.match(problemaSaldo(antes, libro(movimiento('INGRESO', 100), movimiento('GASTO', 101))), /saldo disponible/);
});
test('no permite eliminar o reducir ingresos utilizados', () => {
  const antes = libro(movimiento('INGRESO', 100), movimiento('GASTO', 80));
  assert.match(problemaSaldo(antes, libro(movimiento('GASTO', 80))), /saldo disponible/);
  assert.match(problemaSaldo(antes, libro(movimiento('INGRESO', 79), movimiento('GASTO', 80))), /saldo disponible/);
});
test('depositar reserva fondos y retirar no puede exceder el ahorro', () => {
  const antes = libro(movimiento('INGRESO', 100), movimiento('DEPOSITO', 60));
  assert.deepEqual(resumenSaldo(antes), { disponible: 40, ahorro: 60, deficitDisponible: 0, deficitAhorro: 0 });
  assert.match(problemaSaldo(antes, libro(...antes.movimientos, movimiento('GASTO', 41))), /saldo disponible/);
  assert.match(problemaSaldo(antes, libro(...antes.movimientos, movimiento('RETIRO', 61))), /el ahorro/);
  assert.equal(problemaSaldo(antes, libro(...antes.movimientos, movimiento('RETIRO', 60))), null);
});
test('impide borrar depósitos usados y retiros usados como fondos', () => {
  const antes = libro(movimiento('INGRESO', 100), movimiento('DEPOSITO', 100), movimiento('RETIRO', 50), movimiento('GASTO', 50));
  assert.match(problemaSaldo(antes, libro(...antes.movimientos.filter(m => m.tipo !== 'DEPOSITO'))), /el ahorro/);
  assert.match(problemaSaldo(antes, libro(...antes.movimientos.filter(m => m.tipo !== 'RETIRO'))), /saldo disponible/);
});
test('comprueba el historial: los fondos de febrero no cubren un gasto de enero', () => {
  const antes = libro(movimiento('INGRESO', 100, '2026-02-01'));
  assert.match(problemaSaldo(antes, libro(...antes.movimientos, movimiento('GASTO', 20, '2026-01-01'))), /2026-01-01/);
});
test('las cuentas iniciales aportan fondos y no se pueden borrar si se han consumido', () => {
  const antes = { inicial: 100, movimientos: [movimiento('GASTO', 100)] };
  assert.equal(resumenSaldo(antes).disponible, 0);
  assert.match(problemaSaldo(antes, { ...antes, inicial: 0 }), /saldo disponible/);
});
test('los descuadres anteriores se informan y permiten correcciones, nunca aumentos', () => {
  const antes = libro(movimiento('GASTO', 100));
  assert.equal(resumenSaldo(antes).deficitDisponible, 100);
  assert.equal(resumenSaldo(antes).disponible, 0);
  assert.equal(problemaSaldo(antes, libro(movimiento('GASTO', 90))), null);
  assert.match(problemaSaldo(antes, libro(movimiento('GASTO', 101))), /saldo disponible/);
});
