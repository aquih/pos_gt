# -*- coding: utf-8 -*-

from odoo import api, fields, models, tools, _

class ProductTemplate(models.Model):
    _inherit = "product.template"

    pos_config_ids = fields.Many2many('pos.config',string='Puntos de venta')
