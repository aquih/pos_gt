# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    permitir_descuento = fields.Boolean(string="Permitir descuentos")
    permitir_precio = fields.Boolean(string="Permitir cambiar precio")
    cliente_cf_id = fields.Many2one("res.partner", string="Cliente CF")
