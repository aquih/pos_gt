# -*- encoding: utf-8 -*-

from odoo import models, fields, api, _

class Users(models.Model):
    _inherit = 'res.users'

    default_pos_id = fields.Many2one("pos.config", string="Punto de Venta por Defecto")
    default_location_id = fields.Many2one(related="default_pos_id.picking_type_id.default_location_src_id", readonly=True)
    default_analytic_account_id = fields.Many2one(related="default_pos_id.analytic_account_id", readonly=True)
