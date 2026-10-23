This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Conectar con Firestore

El dashboard consulta `GET /api/sensores?range=1h`, `GET /api/sensores?range=24h` o `GET /api/sensores?range=7d`. El historial y los conteos de alertas se limitan al período elegido (hasta 60, 1440 o 10080 resúmenes). La semana queda seleccionada por defecto y requiere actualización manual para evitar lecturas repetidas de muchos documentos; los períodos más breves se actualizan automáticamente cada minuto. Para habilitarlo localmente, crea `.env.local` en esta carpeta con las credenciales de una cuenta de servicio de Firebase:

```env
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=tu-cuenta-de-servicio
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
DEVICE_ID=invernadero-01
```

`DEVICE_ID` debe coincidir con el identificador que usa el dispositivo. Reinicia el servidor después de crear o cambiar el archivo. No subas `.env.local` ni las credenciales a GitHub.

La lectura del dashboard es pública y devuelve resúmenes de temperatura, humedad y estado del dispositivo, conteos agregados y hasta ocho alertas recientes con sus motivos para el período elegido. No publica el resto de los campos del evento. El `POST /api/sensores` que utiliza el dispositivo sigue protegido con `DEVICE_SECRET_TOKEN`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
