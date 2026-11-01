require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const villageRoutes = require('./routes/villageRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/aldea', villageRoutes);
app.use('/api/catalogo', catalogRoutes);

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser JSON válido' });
  }
  return next(error);
});

// Manejo de rutas no encontradas
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PUERTO = process.env.PORT || 4000;

conectarDB().then(() => {
  app.listen(PUERTO,'0.0.0.0', () => console.log(`Servidor escuchando en puerto ${PUERTO}`));
});
