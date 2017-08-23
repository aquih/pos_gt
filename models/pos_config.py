# -*- encoding: utf-8 -*-

from openerp import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    allow_discount = fields.Boolean(string="Permitir Descuentos")
    allow_price_change = fields.Boolean(string="Permitir Cambiar Precio")
    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
