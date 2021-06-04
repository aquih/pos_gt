# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    ask_tag_number = fields.Boolean(string="Pedir Etiqueta")
    takeout_option = fields.Boolean(string="Opción Para Llevar")
    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
    diario_nota_credito_id = fields.Many2one("account.journal", string="Diario para Nota de Crédito")
    permitir_devolver = fields.Boolean("Permitir devolver")
