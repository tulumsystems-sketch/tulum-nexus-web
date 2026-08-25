# Demo Fogón — 12 minutos

Caballo de Troya: mostrador + stock + pedidos (WhatsApp/delivery). No es un clon de Fudo: no hay mesas ni comandas.

Ramas: `feat/fogon-pedidos-demo` en API y web. **No mergear a main.**

## Crear el tenant (SuperAdmin)

El dueño carga esto a mano. No hay passwords en git.

1. Login SuperAdmin → **Nueva Empresa**
2. Configurar:
   - tenant: `fogon`
   - nombre: Fogón (o el que usen)
   - IVA 21
   - pagos: efectivo sí; MP/transferencia según tengan
   - clientes ON, stock ON, compras ON
   - **remitos OFF**
3. Activar feature **WHATSAPP_BOT** en el panel del tenant (para el POST del bot). El menú Pedidos funciona igual sin el bot.
4. Login con el admin de `fogon`.
5. Abrir caja.
6. Cargar ~12 productos (vacío, asado, milanesa, gaseosa…). El plato es el SKU: no hay recetas.

## Guion de 12 minutos

1. Login tenant `fogon`.
2. Abrir caja.
3. POS: venta de mostrador → baja stock. Canal `MOSTRADOR`, estado `PAGADA`.
4. Menú **Pedidos** (Cocina). Nuevo pedido delivery o WhatsApp a mano.
5. En la tarjeta: tiempo (“hace 4 min”), **Comanda** (imprime tel, dirección y notas).
6. Avanzar estados hasta entregado. Los entregados salen de Cocina; están en Historial.
7. Si entra un pedido nuevo mientras el tablero está abierto: badge + sonido corto.

## Bot externo

El bot **no** está abierto al mundo. Hace falta:

- Header `X-Bot-Secret` = `BOT_SHARED_SECRET` del entorno (Railway).
- Header `X-Tenant-ID` = `fogon`
- Feature `WHATSAPP_BOT` ON
- Caja abierta en ese comercio (descuenta stock igual que el POS)

```bash
curl -X POST https://<API>/api/external/bot/pedido \
  -H "Content-Type: application/json" \
  -H "X-Bot-Secret: <secreto>" \
  -H "X-Tenant-ID: fogon" \
  -d '{
    "clienteTelefono": "1140000000",
    "nombre": "Mesa takeaway",
    "direccion": "Av. Siempre Viva 123",
    "observaciones": "sin mayo, depto 3",
    "metodoPago": "EFECTIVO",
    "items": [{ "productoId": 1, "cantidad": 2 }]
  }'
```

Respuesta: `{ "id", "nro", "total", "canal", "estado", "telefono", "nombre", "direccion" }`.

No fuerza Mercado Pago. Si no mandás `metodoPago`, usa el primero habilitado del tenant.

## Qué decirle a Fogón mañana

- Hoy: stock, caja, venta de mostrador, pedidos de delivery/WhatsApp con estados reales.
- El WhatsApp “lindo” (número Business + conversación) es el caño: el Core ya recibe y lista.
- Después: kiosco como otra cara del mismo producto, no sucursales en esta demo.
- No prometan mesas, comandas ni PedidosYa.

## Qué falta para el bot con número real

- Número WhatsApp Business y proveedor (Meta / interlocutor).
- Setear `BOT_SHARED_SECRET` en Railway y dárselo al worker del bot.
- Worker que traduzca el chat a `POST /api/external/bot/pedido`.
- Catálogo cargado (IDs de producto reales).
