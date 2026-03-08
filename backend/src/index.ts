import app from './app';
import { env } from './utils/env';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT} in ${env.NODE_ENV} mode`);
});
