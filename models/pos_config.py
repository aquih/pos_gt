# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    allow_discount = fields.Boolean(string="Permitir Descuentos")
    ask_tag_number = fields.Boolean(string="Pedir Etiqueta")
    takeout_option = fields.Boolean(string="Opción Para Llevar")
    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
    opcion_dos_por_uno = fields.Boolean(string="Opción 2x1")
    productos_ids = fields.Many2many('product.product',relation="productos_ids_rel",string='Productos 2x1')
    diario_nota_credito_id = fields.Many2one("account.journal", string="Diario para Nota de Crédito")
