# -*- encoding: utf-8 -*-

from odoo import models, fields, api, Command

import logging

class PosConfig(models.Model):
    _inherit = 'pos.config'

    default_client_id = fields.Many2one("res.partner", string="Cliente CF")
    analytic_account_id = fields.Many2one("account.analytic.account", string="Cuenta Analítica")
    diario_nota_credito_id = fields.Many2one("account.journal", string="Diario para Nota de Crédito")
    diario_factura_nombre = fields.Char(related='invoice_journal_id.direccion.name')
    diario_factura_direccion = fields.Char(related='invoice_journal_id.direccion.contact_address')
    diario_factura_tel = fields.Char(related='invoice_journal_id.direccion.phone')

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # pos.config fields
    pos_default_client_id = fields.Many2one(related='pos_config_id.default_client_id', readonly=False)
    pos_analytic_account_id = fields.Many2one(related='pos_config_id.analytic_account_id', readonly=False)
    pos_diario_nota_credito_id = fields.Many2one(related='pos_config_id.diario_nota_credito_id', readonly=False)