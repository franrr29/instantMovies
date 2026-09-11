import { app } from './app';
import { logger } from './shared/logger';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  logger.info(`server arrancado en el puerto ${PORT}`);
});
