const express = require('express');
const router = express.Router();
const superAdminController = require('./super.controller');
const { isSuperAdmin, isAnySuperAdmin } = require('../../middleware/auth');

router.get('/agencies', isAnySuperAdmin, superAdminController.getAgencies);
router.put('/agencies/:id', isAnySuperAdmin, superAdminController.updateAgency);
router.put('/users/:userId/password', isAnySuperAdmin, superAdminController.changeUserPassword);

router.post('/agencies', isSuperAdmin, superAdminController.createAgency);
router.delete('/agencies/:id', isSuperAdmin, superAdminController.deleteAgency);
router.post('/change-credentials', isSuperAdmin, superAdminController.changeSuperAdminCredentials);

router.get('/admins', isSuperAdmin, superAdminController.getManagementUsers);
router.post('/admins', isSuperAdmin, superAdminController.createSupportAdmin);
router.delete('/admins/:id', isSuperAdmin, superAdminController.deleteSupportAdmin);


module.exports = router;