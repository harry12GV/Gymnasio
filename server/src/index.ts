import 'dotenv/config';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 4000);

// Red de seguridad: un error async no capturado (ej. fallo de conexión a la BD)
// no debe tumbar el proceso. La petición en curso responde 500 vía el error
// handler de Express y el servidor sigue vivo.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const app = createApp();

app.listen(PORT, () => {
  console.log(`🏋️  NEW START GYM API corriendo en http://localhost:${PORT}`);
  console.log(`📚 Swagger: http://localhost:${PORT}/api/docs`);
});
