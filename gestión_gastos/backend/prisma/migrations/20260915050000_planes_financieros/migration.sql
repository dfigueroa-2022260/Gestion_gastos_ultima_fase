CREATE TABLE "planes_financieros" (
 "id" TEXT NOT NULL, "tipo" TEXT NOT NULL, "nombre" TEXT NOT NULL,
 "monto" DECIMAL(10,2) NOT NULL CHECK ("monto" > 0), "fecha" TIMESTAMP(3),
 "usuarioId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "planes_financieros_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "planes_financieros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
