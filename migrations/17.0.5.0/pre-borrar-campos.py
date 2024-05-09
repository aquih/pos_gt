import logging
from odoo.upgrade import util

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    util.remove_field(cr, 'pos_gt.extra', 'type')
    _logger.info("Campos borrados")