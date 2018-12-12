# -*- coding: utf-8 -*-

from odoo import api, fields, models, tools, _

class ProductProduct(models.Model):
    _inherit = "product.product"

    pos_config_ids = fields.Many2many('pos.config',related="product_tmpl_id.pos_config_ids",string='Puntos de venta')
