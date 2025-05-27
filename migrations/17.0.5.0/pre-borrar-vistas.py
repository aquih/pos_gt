import logging
from odoo.upgrade import util

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    util.records.remove_view(cr, xml_id="pos_gt.pos_gt_view_pos_pos_form")
    _logger.info("Vistas viejas borradas")