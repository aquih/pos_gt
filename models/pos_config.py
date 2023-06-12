# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _

class PosConfig(models.Model):
    _inherit = 'pos.config'

    ask_tag_number = fields.Boolean(string="Pedir Etiqueta")
    takeout_option = fields.Boolean(string="Opción para Llevar")
    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
    diario_nota_credito_id = fields.Many2one("account.journal", string="Diario para Nota de Crédito")
    permitir_devolver = fields.Boolean("Permitir devolver")

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # pos.config fields
    pos_ask_tag_number = fields.Boolean(related='pos_config_id.ask_tag_number', readonly=False)
    pos_takeout_option = fields.Boolean(related='pos_config_id.takeout_option', readonly=False)
    pos_default_client_id = fields.Many2one(related='pos_config_id.default_client_id', readonly=False)
    pos_ask_analytic_account_id = fields.Many2one(related='pos_config_id.analytic_account_id', readonly=False)
    pos_ask_diario_nota_credito_id = fields.Many2one(related='pos_config_id.diario_nota_credito_id', readonly=False)
    pos_permitir_devolver = fields.Boolean(related='pos_config_id.permitir_devolver', readonly=False)