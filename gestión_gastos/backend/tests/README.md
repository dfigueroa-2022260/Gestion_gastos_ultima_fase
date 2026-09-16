# Validación de saldos

Desde `backend`:

```powershell
pnpm run build
pnpm run test:balance
pnpm run test:balance:integration
```

La prueba de integración usa la base configurada en `.env`, crea un usuario temporal y elimina sus datos al terminar. Comprueba dos gastos concurrentes, reversión de operaciones rechazadas y eliminación de ingresos, depósitos o retiros ya utilizados.

## Reglas

- Disponible = fondos iniciales de cuentas + ingresos - gastos - depósitos de ahorro + retiros.
- Ahorro = depósitos - retiros.
- Los presupuestos y gastos próximos no son movimientos realizados ni aportan fondos.
- Crear, modificar o eliminar un movimiento verifica los saldos al cierre de cada fecha. Los movimientos de un mismo día se consideran conjuntamente.
- Todas las escrituras financieras bloquean la fila del usuario dentro de una transacción; la validación y la escritura se confirman juntas.
- Los descuadres anteriores pueden corregirse, pero no empeorar. La consulta devuelve los fondos disponibles y el faltante por separado; la interfaz muestra un aviso, sin borrar registros anteriores.
- El saldo consultado incluye el historial anterior a la fecha final. Un filtro que muestre únicamente gastos no convierte ese gasto del período en un saldo negativo.

No se requiere una migración adicional para esta validación: utiliza los modelos existentes de movimientos y planes financieros.
