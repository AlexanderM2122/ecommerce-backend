const router = require('express').Router();
const archivos = require('../controllers/archivos.controller');
const Authorize = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', Authorize('Administrador'), archivos.getAll);

router.get('/:id', archivos.get);

router.get('/:id/detalle', Authorize('Administrador'), archivos.getDetalle);

router.post('/', Authorize('Administrador'), upload.single('file'), archivos.create);

router.put('/:id', Authorize('Administrador'), upload.single('file'), archivos.update);

router.delete('/:id', Authorize('Administrador'), archivos.delete);

module.exports = router;
