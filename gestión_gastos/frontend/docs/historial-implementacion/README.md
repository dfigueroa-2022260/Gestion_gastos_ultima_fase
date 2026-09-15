# Historial de implementación

Estos cuatro archivos son scripts auxiliares de una sola ejecución usados durante cambios anteriores. No son módulos funcionales ni dependencias de la aplicación. Se conservan juntos como documentación histórica porque implement.cjs también lee implement.py y los scripts mezclan cambios de frontend y backend.

- implement.py: preparación de validaciones y archivos compartidos.
- implement.cjs: aplicación de cambios iniciales en formularios, validaciones y componentes.
- implement-more.cjs: ampliaciones de sesión, filtros, metas y planificación financiera.
- polish.cjs: ajustes posteriores de estilos, gráficas, fechas y validaciones.

Sus cambios ya están incorporados en frontend/src y backend/src, con las migraciones en backend/prisma/migrations. El desarrollo actual debe hacerse directamente en esos módulos.

No volver a ejecutar estos scripts: contienen reemplazos para versiones anteriores del código y pueden duplicar o sobrescribir cambios actuales. Se mantienen sin modificaciones para preservar el historial; sus rutas corresponden a su ubicación original en la raíz.

No están incluidos en los comandos de inicio, compilación ni pruebas de package.json. Se sigue usando pnpm para trabajar con cada módulo.
