import logging
from odoo.upgrade import util

_logger = logging.getLogger(__name__)


def migrate(cr, version):
    util.records.remove_view(cr, xml_id="pos_gt.pos_gt_view_pos_pos_form")
    util.records.remove_view(cr, xml_id="pos_gt.pos_gt_extra_tree_view")
    util.records.remove_view(cr, xml_id="pos_gt.pos_gt_extra_form_view")
    util.records.remove_view(cr, xml_id="pos_gt.pos_gt_invoice_form")
    util.records.remove_view(cr, xml_id="pos_gt.res_users_form_view_gt")
    util.records.remove_view(cr, xml_id="pos_gt.product_template_form_view_pos_gt")
    util.records.remove_view(cr, xml_id="pos_gt.product_template_form_view_pos_gt")
    util.records.remove_view(cr, xml_id="pos_gt.pos_config_view_form_pos_gt")
    _logger.info("Vistas viejas borradas")